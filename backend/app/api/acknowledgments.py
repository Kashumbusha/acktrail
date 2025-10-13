from fastapi import APIRouter, HTTPException, Depends, status, Request
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID
from datetime import datetime
from urllib.parse import unquote
import logging
from io import BytesIO

from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT

from ..schemas.acknowledgments import (
    AckPageData, AcknowledgmentCreate, TypedAcknowledgmentCreate, AcknowledgmentResponse
)
from ..models.database import get_db
from ..models.models import (
    Assignment, Acknowledgment, Policy, User, AssignmentStatus, AckMethod
)
from ..core.security import decode_magic_link_token
from ..core.hashing import compute_policy_hash
from ..core.storage import download_policy_file
from ..core.email import send_acknowledgment_confirmation_email, send_acknowledgment_notification_email

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ack", tags=["acknowledgments"])


def get_client_ip(request: Request) -> str:
    """Extract client IP address from request."""
    # Check for forwarded headers first (for proxy setups)
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    
    forwarded = request.headers.get("X-Forwarded")
    if forwarded:
        return forwarded.split(",")[0].strip()
    
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    
    # Fallback to client host
    return request.client.host if request.client else "unknown"


@router.get("/{token}", response_model=AckPageData)
def get_acknowledgment_page(
    token: str,
    db: Session = Depends(get_db)
) -> AckPageData:
    """Get acknowledgment page data using magic link token."""
    try:
        # Decode magic link token
        payload = decode_magic_link_token(token)
        assignment_id = UUID(payload["assignment_id"])
        user_email = payload["user_email"]
        
    except Exception as e:
        logger.error(f"Invalid magic link token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired magic link"
        )
    
    # Get assignment
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )
    
    # Get policy and user
    policy = db.query(Policy).filter(Policy.id == assignment.policy_id).first()
    user = db.query(User).filter(User.id == assignment.user_id).first()
    
    if not policy or not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Policy or user not found"
        )
    
    # Verify the email matches
    if user.email.lower() != user_email.lower():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Magic link does not match user"
        )
    
    # Check if already acknowledged
    already_acknowledged = assignment.status == AssignmentStatus.ACKNOWLEDGED
    
    # Check if expired (if policy has due date)
    is_expired = False
    if policy.due_at and datetime.utcnow() > policy.due_at:
        is_expired = True
    
    # Update assignment status to viewed if not already acknowledged
    if assignment.status == AssignmentStatus.PENDING:
        assignment.viewed_at = datetime.utcnow()
        assignment.status = AssignmentStatus.VIEWED
        db.commit()
    
    # Use stored policy hash (includes file content when present)
    policy_hash = policy.content_sha256
    if not policy_hash:
        # Fallback for legacy records without a stored hash
        policy_hash = compute_policy_hash(
            title=policy.title,
            body_markdown=policy.body_markdown
        )
    
    return AckPageData(
        assignment_id=assignment.id,
        policy_title=policy.title,
        policy_body_markdown=policy.body_markdown,
        policy_file_url=policy.file_url,
        policy_version=policy.version,
        policy_hash=policy_hash,
        user_name=user.name,
        user_email=user.email,
        require_typed_signature=policy.require_typed_signature,
        is_expired=is_expired,
        already_acknowledged=already_acknowledged
    )


@router.post("/{token}", response_model=AcknowledgmentResponse)
def create_acknowledgment(
    token: str,
    acknowledgment: AcknowledgmentCreate,
    request: Request,
    db: Session = Depends(get_db)
) -> AcknowledgmentResponse:
    """Create an acknowledgment for a policy assignment."""
    try:
        # Decode magic link token
        payload = decode_magic_link_token(token)
        assignment_id = UUID(payload["assignment_id"])
        user_email = payload["user_email"]
        
    except Exception as e:
        logger.error(f"Invalid magic link token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired magic link"
        )
    
    # Get assignment
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )
    
    # Check if already acknowledged
    if assignment.status == AssignmentStatus.ACKNOWLEDGED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Policy has already been acknowledged"
        )
    
    # Get policy and user
    policy = db.query(Policy).filter(Policy.id == assignment.policy_id).first()
    user = db.query(User).filter(User.id == assignment.user_id).first()
    
    if not policy or not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Policy or user not found"
        )
    
    # Verify the email matches
    if user.email.lower() != user_email.lower():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Magic link does not match user"
        )
    
    # Verify signer email matches user email
    if acknowledgment.signer_email.lower() != user.email.lower():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Signer email must match your account email"
        )
    
    # Check if policy requires typed signature but we got one-click
    if policy.require_typed_signature and acknowledgment.ack_method == AckMethod.ONECLICK:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This policy requires a typed signature"
        )
    
    # Additional validation for typed acknowledgments
    typed_signature = None
    if acknowledgment.ack_method == AckMethod.TYPED:
        # Check if typed_signature is provided and not empty
        if not acknowledgment.typed_signature or not acknowledgment.typed_signature.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Typed signature is required for this acknowledgment method"
            )
        typed_signature = acknowledgment.typed_signature
    
    # Get client information
    client_ip = get_client_ip(request)
    user_agent = request.headers.get("User-Agent", "")
    
    # Use stored policy hash to capture full content (including files)
    policy_hash_at_ack = policy.content_sha256
    if not policy_hash_at_ack:
        policy_hash_at_ack = compute_policy_hash(
            title=policy.title,
            body_markdown=policy.body_markdown
        )
    
    # Create acknowledgment record
    ack_record = Acknowledgment(
        assignment_id=assignment.id,
        signer_name=acknowledgment.signer_name,
        signer_email=acknowledgment.signer_email,
        typed_signature=typed_signature,
        ip_address=client_ip,
        user_agent=user_agent,
        policy_version=policy.version,
        policy_hash_at_ack=policy_hash_at_ack,
        ack_method=acknowledgment.ack_method
    )
    
    db.add(ack_record)
    
    # Update assignment status
    assignment.status = AssignmentStatus.ACKNOWLEDGED
    assignment.acknowledged_at = datetime.utcnow()
    
    db.commit()
    db.refresh(ack_record)

    # Send email notifications (don't fail if email sending fails)
    try:
        # Send confirmation email to staff member
        send_acknowledgment_confirmation_email(
            user_email=user.email,
            user_name=user.name,
            policy_title=policy.title,
            policy_version=policy.version,
            acknowledged_at=ack_record.created_at,
            ack_method=ack_record.ack_method.value,
            ip_address=ack_record.ip_address,
            assignment_id=str(assignment.id)
        )
        logger.info(f"Sent acknowledgment confirmation email to {user.email}")

        # Get policy creator/admin to notify
        policy_creator = db.query(User).filter(User.id == policy.created_by).first()
        if policy_creator:
            send_acknowledgment_notification_email(
                admin_email=policy_creator.email,
                admin_name=policy_creator.name,
                staff_name=user.name,
                staff_email=user.email,
                policy_title=policy.title,
                policy_version=policy.version,
                acknowledged_at=ack_record.created_at,
                ack_method=ack_record.ack_method.value,
                ip_address=ack_record.ip_address,
                typed_signature=ack_record.typed_signature,
                assignment_id=str(assignment.id)
            )
            logger.info(f"Sent acknowledgment notification email to {policy_creator.email}")
    except Exception as e:
        # Log error but don't fail the acknowledgment
        logger.error(f"Failed to send acknowledgment emails: {e}")

    logger.info(f"Policy acknowledged: {policy.title} by {user.email} via {acknowledgment.ack_method.value}")

    return AcknowledgmentResponse(**ack_record.__dict__)


@router.post("/{token}/typed", response_model=AcknowledgmentResponse)
def create_typed_acknowledgment(
    token: str,
    acknowledgment: TypedAcknowledgmentCreate,
    request: Request,
    db: Session = Depends(get_db)
) -> AcknowledgmentResponse:
    """Create a typed acknowledgment for a policy assignment."""
    # Set the acknowledgment method to typed
    acknowledgment.ack_method = AckMethod.TYPED
    
    # Validate typed signature
    if not acknowledgment.typed_signature or not acknowledgment.typed_signature.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Typed signature is required"
        )
    
    # Use the same logic as regular acknowledgment
    return create_acknowledgment(token, acknowledgment, request, db)


def generate_receipt_pdf(assignment: Assignment, acknowledgment: Acknowledgment, user: User, policy: Policy) -> bytes:
    """Generate a PDF receipt for an acknowledgment."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    
    # Get styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=20,
        spaceAfter=30,
        alignment=TA_CENTER,
        textColor=colors.darkblue
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=14,
        spaceAfter=12,
        spaceBefore=20,
        textColor=colors.darkblue
    )
    
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=10,
        spaceAfter=6
    )
    
    footer_style = ParagraphStyle(
        'CustomFooter',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.grey,
        alignment=TA_CENTER
    )
    
    # Build PDF content
    story = []
    
    # Title
    story.append(Paragraph("Policy Acknowledgment Receipt", title_style))
    story.append(Spacer(1, 20))
    
    # Create table with acknowledgment details
    data = [
        ['Policy Title:', policy.title],
        ['Acknowledged By:', f"{acknowledgment.signer_name} ({acknowledgment.signer_email})"],
        ['User Department:', user.department or 'N/A'],
        ['Acknowledgment Date:', acknowledgment.created_at.strftime('%B %d, %Y at %I:%M %p UTC')],
        ['Method:', 'Typed Signature' if acknowledgment.ack_method == AckMethod.TYPED else 'One-Click'],
        ['Policy Version:', str(policy.version)],
        ['Assignment ID:', str(assignment.id)],
        ['IP Address:', acknowledgment.ip_address or 'N/A'],
        ['Policy Hash:', acknowledgment.policy_hash_at_ack],
    ]
    
    if acknowledgment.typed_signature:
        data.insert(-1, ['Typed Signature:', acknowledgment.typed_signature])
    
    table = Table(data, colWidths=[2*inch, 4*inch])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('BACKGROUND', (1, 0), (1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    
    story.append(table)
    story.append(Spacer(1, 30))
    
    # Add verification note
    verification_text = """
    This receipt serves as proof that the above policy was acknowledged by the specified user.
    The policy hash can be used to verify that the policy content has not been tampered with since acknowledgment.
    """
    story.append(Paragraph(verification_text, normal_style))
    
    story.append(Spacer(1, 20))
    story.append(Paragraph(
        f"Generated on {datetime.utcnow().strftime('%B %d, %Y at %I:%M %p UTC')}",
        footer_style
    ))
    
    story.append(Spacer(1, 20))
    story.append(Paragraph(
        f"For questions or verification, contact your administrator.",
        footer_style
    ))
    
    # Build PDF
    doc.build(story)
    
    pdf_data = buffer.getvalue()
    buffer.close()
    
    return pdf_data


@router.get("/{token}/file")
def get_policy_file_for_acknowledgment(
    token: str,
    db: Session = Depends(get_db)
):
    """Proxy policy PDF file for acknowledgment page (no auth required, uses magic link token)."""
    try:
        # Decode magic link token
        payload = decode_magic_link_token(token)
        assignment_id = UUID(payload["assignment_id"])
    except Exception as e:
        logger.error(f"Invalid magic link token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired magic link"
        )

    # Get assignment
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )

    # Get policy
    policy = db.query(Policy).filter(Policy.id == assignment.policy_id).first()
    if not policy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Policy not found"
        )

    # Check if policy has a file
    if not policy.file_url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Policy has no file attached"
        )

    try:
        # Extract file key from URL
        file_key = policy.file_url.split(f"/{policy.file_url.split('/')[4]}/", 1)[1]

        # URL decode the file key (B2 expects decoded keys)
        file_key = unquote(file_key)

        # Download file from B2
        file_content = download_policy_file(file_key)

        # Return file with appropriate headers
        return Response(
            content=file_content,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"inline; filename={policy.title}.pdf",
                "Cache-Control": "public, max-age=3600"
            }
        )
    except Exception as e:
        logger.error(f"Failed to proxy policy file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve policy file"
        )


@router.get("/assignment/{assignment_id}/receipt.pdf")
def download_acknowledgment_receipt(
    assignment_id: UUID,
    db: Session = Depends(get_db)
) -> Response:
    """Generate and download a PDF receipt for an acknowledgment."""
    # Get assignment with acknowledgment
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )
    
    # Check if acknowledged
    if assignment.status != AssignmentStatus.ACKNOWLEDGED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Assignment has not been acknowledged"
        )
    
    # Get acknowledgment record
    acknowledgment = db.query(Acknowledgment).filter(
        Acknowledgment.assignment_id == assignment_id
    ).first()
    
    if not acknowledgment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Acknowledgment record not found"
        )
    
    # Get policy and user
    policy = db.query(Policy).filter(Policy.id == assignment.policy_id).first()
    user = db.query(User).filter(User.id == assignment.user_id).first()
    
    if not policy or not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Policy or user not found"
        )
    
    try:
        # Generate PDF receipt
        pdf_data = generate_receipt_pdf(assignment, acknowledgment, user, policy)
        
        # Return PDF response
        filename = f"acknowledgment_receipt_{assignment_id}.pdf"
        return Response(
            content=pdf_data,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except Exception as e:
        logger.error(f"Failed to generate PDF receipt: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate PDF receipt"
        )
