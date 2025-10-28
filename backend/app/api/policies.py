from fastapi import APIRouter, HTTPException, Depends, status, UploadFile, File, Form, Request
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from urllib.parse import unquote
import logging

from ..schemas.policies import (
    PolicyCreate, PolicyUpdate, PolicyResponse, PolicyWithStats, PolicyListResponse
)
from ..models.database import get_db
from ..models.models import Policy, User, Assignment, Acknowledgment, AssignmentStatus, PolicyQuestion
from ..core.security import get_current_user, require_admin_role, decode_jwt_token
from ..core.storage import upload_policy_file, delete_policy_file, download_policy_file
from ..core.hashing import compute_policy_hash

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/policies", tags=["policies"])


@router.get("/", response_model=PolicyListResponse)
def list_policies(
    page: int = 1,
    per_page: int = 20,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
) -> PolicyListResponse:
    """List all policies with pagination and search."""
    query = db.query(Policy)

    # Scope by workspace if available
    workspace_id = current_user.get("workspace_id")
    if workspace_id:
        from uuid import UUID as _UUID
        try:
            query = query.filter(Policy.workspace_id == _UUID(workspace_id))
        except Exception:
            pass

    # Role-based filtering: employees only see policies assigned to them
    user_role = current_user.get("role")
    if user_role != "admin":
        # Filter to only show policies the employee is assigned to
        user_id = _UUID(current_user["id"])
        query = query.join(Assignment).filter(Assignment.user_id == user_id)
    
    # Apply search filter
    if search:
        query = query.filter(Policy.title.ilike(f"%{search}%"))
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    offset = (page - 1) * per_page
    policies = query.offset(offset).limit(per_page).all()
    
    # Calculate stats for each policy
    policies_with_stats = []
    for policy in policies:
        # Get assignment stats
        assignment_stats = db.query(
            func.count(Assignment.id).label('total'),
            func.sum(case((Assignment.status == AssignmentStatus.PENDING, 1), else_=0)).label('pending'),
            func.sum(case((Assignment.status == AssignmentStatus.VIEWED, 1), else_=0)).label('viewed'),
            func.sum(case((Assignment.status == AssignmentStatus.ACKNOWLEDGED, 1), else_=0)).label('acknowledged'),
            func.sum(case((Assignment.status == AssignmentStatus.DECLINED, 1), else_=0)).label('declined')
        ).filter(Assignment.policy_id == policy.id).first()
        
        # Get creator name
        creator = db.query(User).filter(User.id == policy.created_by).first()
        
        # Calculate overdue (assignments with due_at in the past and not acknowledged)
        overdue_count = 0
        if policy.due_at and policy.due_at < datetime.utcnow():
            overdue_count = db.query(Assignment).filter(
                Assignment.policy_id == policy.id,
                Assignment.status.in_([AssignmentStatus.PENDING, AssignmentStatus.VIEWED])
            ).count()
        
        policy_with_stats = PolicyWithStats(
            **policy.__dict__,
            total_assignments=assignment_stats.total or 0,
            pending_assignments=assignment_stats.pending or 0,
            viewed_assignments=assignment_stats.viewed or 0,
            acknowledged_assignments=assignment_stats.acknowledged or 0,
            declined_assignments=assignment_stats.declined or 0,
            overdue_assignments=overdue_count,
            creator_name=creator.name if creator else "Unknown"
        )
        policies_with_stats.append(policy_with_stats)
    
    total_pages = (total + per_page - 1) // per_page
    
    return PolicyListResponse(
        policies=policies_with_stats,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages
    )


@router.post("/", response_model=PolicyResponse)
def create_policy(
    title: str = Form(...),
    body_markdown: Optional[str] = Form(None),
    due_at: Optional[str] = Form(None),
    require_typed_signature: bool = Form(False),
    questions_enabled: bool = Form(False),
    questions_json: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_role)
) -> PolicyResponse:
    """Create a new policy."""
    # Validate that we have either markdown content or a file
    if not body_markdown and not file:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Must provide either body_markdown or file"
        )
    
    file_url = None
    file_content = None
    
    # Handle file upload if provided
    if file:
        if file.content_type not in ["application/pdf"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only PDF files are supported"
            )
        
        try:
            file_content = file.file.read()
            file_key, file_url = upload_policy_file(file_content, file.filename)
            logger.info(f"Uploaded policy file: {file_key}")
        except Exception as e:
            logger.error(f"Failed to upload file: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to upload file"
            )
    
    # Compute content hash
    content_hash = compute_policy_hash(
        title=title,
        body_markdown=body_markdown,
        file_content=file_content
    )
    
    # Parse due_at if provided
    due_at_datetime = None
    if due_at:
        from datetime import datetime
        try:
            due_at_datetime = datetime.fromisoformat(due_at.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid due_at format. Use ISO format."
            )
    
    # Create policy
    policy = Policy(
        title=title,
        body_markdown=body_markdown,
        file_url=file_url,
        content_sha256=content_hash,
        due_at=due_at_datetime,
        require_typed_signature=require_typed_signature,
        questions_enabled=questions_enabled,
        created_by=UUID(current_user["id"]),
        workspace_id=UUID(current_user["workspace_id"]) if current_user.get("workspace_id") else None
    )
    
    db.add(policy)
    db.commit()
    db.refresh(policy)

    # Create questions if enabled
    if questions_enabled and questions_json:
        try:
            import json
            questions = json.loads(questions_json)
            if not isinstance(questions, list):
                raise ValueError("questions_json must be a list")

            if not (1 <= len(questions) <= 5):
                raise HTTPException(status_code=400, detail="Questions must be between 1 and 5")

            for idx, q in enumerate(questions):
                prompt = q.get('prompt')
                choices = q.get('choices')
                correct_index = q.get('correct_index')
                order_index = q.get('order_index', idx)

                if not prompt or not isinstance(prompt, str):
                    raise HTTPException(status_code=400, detail="Each question must have a prompt")
                if not isinstance(choices, list) or len(choices) < 2 or len(choices) > 6:
                    raise HTTPException(status_code=400, detail="Each question must have 2 to 6 choices")
                if not isinstance(correct_index, int) or not (0 <= correct_index < len(choices)):
                    raise HTTPException(status_code=400, detail="Invalid correct_index for a question")

                pq = PolicyQuestion(
                    policy_id=policy.id,
                    order_index=order_index,
                    prompt=prompt,
                    choices=choices,
                    correct_index=correct_index
                )
                db.add(pq)
            db.commit()
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Invalid questions_json: {e}")
            raise HTTPException(status_code=400, detail="Invalid questions_json format")
    
    logger.info(f"Created policy: {policy.title} (ID: {policy.id})")
    
    return PolicyResponse(**policy.__dict__)


@router.get("/{policy_id}", response_model=PolicyResponse)
def get_policy(
    policy_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
) -> PolicyResponse:
    """Get a specific policy by ID."""
    policy = db.query(Policy).filter(Policy.id == policy_id).first()
    if not policy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Policy not found"
        )

    # Permission check: employees can only view policies assigned to them
    user_role = current_user.get("role")
    if user_role != "admin":
        # Check if user has an assignment for this policy
        user_id = UUID(current_user["id"])
        assignment = db.query(Assignment).filter(
            Assignment.policy_id == policy_id,
            Assignment.user_id == user_id
        ).first()

        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to view this policy"
            )

    return PolicyResponse(**policy.__dict__)


@router.put("/{policy_id}", response_model=PolicyResponse)
def update_policy(
    policy_id: UUID,
    title: Optional[str] = Form(None),
    body_markdown: Optional[str] = Form(None),
    due_at: Optional[str] = Form(None),
    require_typed_signature: Optional[bool] = Form(None),
    questions_enabled: Optional[bool] = Form(None),
    questions_json: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_role)
) -> PolicyResponse:
    """Update a policy."""
    policy = db.query(Policy).filter(Policy.id == policy_id).first()
    if not policy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Policy not found"
        )

    # Check if there are any acknowledged assignments
    acknowledged_assignments = db.query(Assignment).filter(
        Assignment.policy_id == policy_id,
        Assignment.status == AssignmentStatus.ACKNOWLEDGED
    ).count()

    if acknowledged_assignments > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot update policy that has been acknowledged by users"
        )

    # Track if content changed for hash recalculation
    content_changed = False
    file_content = None

    # Update title if provided
    if title is not None:
        policy.title = title
        content_changed = True

    # Update markdown if provided
    if body_markdown is not None:
        policy.body_markdown = body_markdown
        content_changed = True

    # Handle file upload/replacement if provided
    if file:
        logger.info(f"Updating policy {policy_id} - received file: {file.filename}, content_type: {file.content_type}")

        if file.content_type not in ["application/pdf"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only PDF files are supported"
            )

        try:
            file_content = file.file.read()
            file_size = len(file_content)
            logger.info(f"File content size: {file_size} bytes")

            old_file_url = policy.file_url
            file_key, file_url = upload_policy_file(file_content, file.filename)
            policy.file_url = file_url
            content_changed = True

            logger.info(f"File uploaded successfully:")
            logger.info(f"  Old URL: {old_file_url}")
            logger.info(f"  New URL: {file_url}")
            logger.info(f"  File key: {file_key}")
        except Exception as e:
            logger.error(f"Failed to upload file: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to upload file"
            )

    # Update other fields
    if due_at is not None:
        from datetime import datetime
        try:
            policy.due_at = datetime.fromisoformat(due_at.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid due_at format. Use ISO format."
            )

    if require_typed_signature is not None:
        policy.require_typed_signature = require_typed_signature

    if questions_enabled is not None:
        policy.questions_enabled = questions_enabled

    # Replace questions when questions_json provided (only if not acknowledged yet)
    if questions_json is not None:
        # Ensure no acknowledged assignments exist (already checked above overall, but keep logic grouped)
        try:
            import json
            new_questions = json.loads(questions_json) if questions_json else []
            if policy.questions_enabled and (new_questions is None or len(new_questions) == 0):
                raise HTTPException(status_code=400, detail="questions_enabled is true but no questions provided")

            # Clear existing
            db.query(PolicyQuestion).filter(PolicyQuestion.policy_id == policy_id).delete()

            # Recreate
            if new_questions:
                if not isinstance(new_questions, list):
                    raise ValueError("questions_json must be a list")
                if not (1 <= len(new_questions) <= 5):
                    raise HTTPException(status_code=400, detail="Questions must be between 1 and 5")
                for idx, q in enumerate(new_questions):
                    prompt = q.get('prompt')
                    choices = q.get('choices')
                    correct_index = q.get('correct_index')
                    order_index = q.get('order_index', idx)
                    if not prompt or not isinstance(prompt, str):
                        raise HTTPException(status_code=400, detail="Each question must have a prompt")
                    if not isinstance(choices, list) or len(choices) < 2 or len(choices) > 6:
                        raise HTTPException(status_code=400, detail="Each question must have 2 to 6 choices")
                    if not isinstance(correct_index, int) or not (0 <= correct_index < len(choices)):
                        raise HTTPException(status_code=400, detail="Invalid correct_index for a question")
                    pq = PolicyQuestion(
                        policy_id=policy.id,
                        order_index=order_index,
                        prompt=prompt,
                        choices=choices,
                        correct_index=correct_index
                    )
                    db.add(pq)
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Invalid questions_json on update: {e}")
            raise HTTPException(status_code=400, detail="Invalid questions_json format")

    # Recalculate hash if content changed
    if content_changed:
        content_hash = compute_policy_hash(
            title=policy.title,
            body_markdown=policy.body_markdown,
            file_content=file_content
        )
        policy.content_sha256 = content_hash
        policy.version = policy.version + 1

    db.commit()
    db.refresh(policy)

    logger.info(f"Updated policy: {policy.title} (ID: {policy.id})")

    return PolicyResponse(**policy.__dict__)


@router.delete("/{policy_id}")
def delete_policy(
    policy_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_role)
) -> dict:
    """Delete a policy."""
    policy = db.query(Policy).filter(Policy.id == policy_id).first()
    if not policy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Policy not found"
        )
    
    # Check if there are any assignments
    assignment_count = db.query(Assignment).filter(Assignment.policy_id == policy_id).count()
    if assignment_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete policy that has assignments"
        )
    
    # Delete file from storage if exists
    if policy.file_url:
        try:
            # Extract file key from URL - this is a simplified approach
            # In practice, you might want to store the file key separately
            file_key = policy.file_url.split('/')[-1]
            delete_policy_file(file_key)
        except Exception as e:
            logger.warning(f"Failed to delete policy file: {e}")
    
    db.delete(policy)
    db.commit()

    logger.info(f"Deleted policy: {policy.title} (ID: {policy.id})")

    return {"success": True, "message": "Policy deleted successfully"}


async def get_current_user_optional_query_token(
    request: Request,
    token: Optional[str] = None,
    db: Session = Depends(get_db)
) -> dict:
    """
    Get current user from either Authorization header or query parameter token.
    For use with endpoints that need to support both axios requests and direct browser navigation.
    """
    # Try to get token from Authorization header first
    auth_header = request.headers.get("Authorization")
    token_to_use = None

    if auth_header and auth_header.startswith("Bearer "):
        token_to_use = auth_header.replace("Bearer ", "")
    elif token:
        token_to_use = token

    if not token_to_use:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )

    payload = decode_jwt_token(token_to_use)

    # Verify it's an access token
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type"
        )

    return payload


@router.get("/{policy_id}/file")
async def get_policy_file(
    policy_id: UUID,
    token: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_optional_query_token)
):
    """Proxy policy PDF file to avoid CORS issues with B2.

    Accepts JWT token as query parameter for direct browser access (e.g., opening in new tab).
    """
    # Get policy
    policy = db.query(Policy).filter(Policy.id == policy_id).first()
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
        # B2 URLs are like: https://f000.backblazeb2.com/file/bucket-name/path/to/file.pdf
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









