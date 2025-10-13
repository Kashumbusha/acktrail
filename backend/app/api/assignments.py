from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from uuid import UUID
from datetime import datetime, timedelta
import logging

from ..schemas.assignments import (
    RecipientCreate, AssignmentResponse, AssignmentWithDetails, AssignmentListResponse,
    SendPolicyRequest, BulkAssignmentResponse
)
from ..models.database import get_db
from ..models.models import (
    Policy, User, Assignment, AssignmentStatus, EmailEvent, EmailEventType, Acknowledgment, Team
)
from ..core.security import get_current_user, require_admin_role, create_magic_link_token
from ..core.email import send_policy_assignment_email, send_reminder_email
from ..core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/policies", tags=["assignments"])


@router.post("/{policy_id}/recipients", response_model=BulkAssignmentResponse)
def add_policy_recipients(
    policy_id: UUID,
    recipients: RecipientCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_role)
) -> BulkAssignmentResponse:
    """Add recipients to a policy (create assignments)."""
    logger.info(f"=== ADD RECIPIENTS DEBUG ===")
    logger.info(f"Policy ID: {policy_id}")
    logger.info(f"Recipients object type: {type(recipients)}")
    logger.info(f"Recipients object: {recipients}")
    logger.info(f"Recipients.recipients: {recipients.recipients}")

    # Check if policy exists
    policy = db.query(Policy).filter(Policy.id == policy_id).first()
    if not policy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Policy not found"
        )
    
    created_assignments = 0
    existing_assignments = []
    created_users = 0

    logger.info(f"Received recipients data: {recipients}")
    logger.info(f"Recipients list: {recipients.recipients}")
    logger.info(f"Number of recipients: {len(recipients.recipients)}")

    for recipient in recipients.recipients:
        # Check if this is a team-based recipient
        if recipient.startswith('team:'):
            # Extract team ID
            team_id_str = recipient.replace('team:', '')
            try:
                team_id = UUID(team_id_str)
            except ValueError:
                logger.error(f"Invalid team ID format: {team_id_str}")
                existing_assignments.append(f"Invalid team ID: {team_id_str}")
                continue

            # Verify team exists
            team = db.query(Team).filter(Team.id == team_id).first()
            if not team:
                logger.error(f"Team not found: {team_id}")
                existing_assignments.append(f"Team not found: {team_id}")
                continue

            # Get all users who are members of this team
            team_members_query = db.query(User).filter(
                User.team_id == team_id,
                User.active == True
            )

            # By default, exclude admin users from team-based policy assignments
            # unless explicitly requested to include them
            if not recipients.include_admins:
                from ..models.models import UserRole
                team_members_query = team_members_query.filter(User.role != UserRole.ADMIN)

            team_members = team_members_query.all()

            logger.info(f"Creating assignments for team '{team.name}' with {len(team_members)} members (include_admins={recipients.include_admins})")

            if len(team_members) == 0:
                logger.warning(f"Team '{team.name}' has no members. No assignments created.")
                existing_assignments.append(f"Team '{team.name}' has no members")
                continue

            for user in team_members:
                # Check if assignment already exists
                existing_assignment = db.query(Assignment).filter(
                    Assignment.policy_id == policy_id,
                    Assignment.user_id == user.id
                ).first()

                if existing_assignment:
                    existing_assignments.append(user.email)
                    continue

                # Create new assignment with team_id
                assignment = Assignment(
                    policy_id=policy_id,
                    user_id=user.id,
                    status=AssignmentStatus.PENDING,
                    workspace_id=policy.workspace_id,
                    team_id=team_id  # Link assignment to team
                )
                db.add(assignment)
                created_assignments += 1
        else:
            # Handle as email address
            email = recipient

            # Check if user exists, create if not
            user = db.query(User).filter(
                User.email == email,
                User.workspace_id == policy.workspace_id
            ).first()

            if not user:
                # Create new user
                user = User(
                    email=email,
                    name=email.split('@')[0],  # Use email prefix as name
                    role='employee',
                    is_guest=True,
                    can_login=False,
                    workspace_id=policy.workspace_id
                )
                db.add(user)
                db.flush()  # Get the user ID
                created_users += 1
                logger.info(f"Created new user: {email}")

            # Check if assignment already exists
            existing_assignment = db.query(Assignment).filter(
                Assignment.policy_id == policy_id,
                Assignment.user_id == user.id
            ).first()

            if existing_assignment:
                existing_assignments.append(email)
                continue

            # Create new assignment
            assignment = Assignment(
                policy_id=policy_id,
                user_id=user.id,
                status=AssignmentStatus.PENDING,
                workspace_id=policy.workspace_id
            )
            db.add(assignment)
            created_assignments += 1

    db.commit()

    logger.info(f"Created {created_users} users and {created_assignments} assignments for policy {policy_id}")

    response_message = f"Created {created_assignments} new assignments"
    if created_users > 0:
        response_message += f" (including {created_users} new users)"
    if existing_assignments:
        response_message += f". {len(existing_assignments)} users already had assignments."
    
    return BulkAssignmentResponse(
        created_assignments=created_assignments,
        sent_emails=0,  # Emails are sent separately
        failed_emails=existing_assignments
    )


@router.post("/{policy_id}/send", response_model=BulkAssignmentResponse)
def send_policy_emails(
    policy_id: UUID,
    send_request: SendPolicyRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_role)
) -> BulkAssignmentResponse:
    """Send policy assignment emails to recipients."""
    # Check if policy exists
    policy = db.query(Policy).filter(Policy.id == policy_id).first()
    if not policy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Policy not found"
        )
    
    # Get assignments to send emails to
    query = db.query(Assignment).filter(Assignment.policy_id == policy_id)
    
    if send_request.assignment_ids:
        query = query.filter(Assignment.id.in_(send_request.assignment_ids))
    else:
        # Send to all pending and viewed assignments by default (not already acknowledged)
        query = query.filter(Assignment.status.in_([AssignmentStatus.PENDING, AssignmentStatus.VIEWED]))
    
    assignments = query.all()
    
    if not assignments:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No assignments found to send emails to"
        )
    
    sent_emails = 0
    failed_emails = []
    
    for assignment in assignments:
        try:
            # Get user details
            user = db.query(User).filter(User.id == assignment.user_id).first()
            if not user:
                failed_emails.append(f"User {assignment.user_id} not found")
                continue
            
            # Generate or reuse existing magic link token
            if not assignment.magic_link_token:
                magic_token = create_magic_link_token(
                    assignment_id=str(assignment.id),
                    user_email=user.email
                )
                assignment.magic_link_token = magic_token
            else:
                magic_token = assignment.magic_link_token
            
            # Create magic link URL
            magic_link_url = f"{settings.frontend_url}/ack/{magic_token}"
            
            # Send email
            message_id = send_policy_assignment_email(
                user_email=user.email,
                user_name=user.name,
                policy_title=policy.title,
                magic_link_url=magic_link_url,
                due_date=policy.due_at
            )
            
            # Record email event
            email_event = EmailEvent(
                assignment_id=assignment.id,
                type=EmailEventType.SEND,
                provider_message_id=message_id
            )
            db.add(email_event)
            
            sent_emails += 1
            logger.info(f"Sent assignment email to {user.email} for policy {policy.title}")
            
        except Exception as e:
            logger.error(f"Failed to send email to {user.email if 'user' in locals() else 'unknown'}: {e}")
            failed_emails.append(f"Failed to send to {user.email if 'user' in locals() else 'unknown user'}")
    
    db.commit()
    
    return BulkAssignmentResponse(
        created_assignments=0,
        sent_emails=sent_emails,
        failed_emails=failed_emails
    )


@router.get("/{policy_id}/assignments", response_model=AssignmentListResponse)
def get_policy_assignments(
    policy_id: UUID,
    page: int = 1,
    per_page: int = 20,
    status_filter: Optional[AssignmentStatus] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
) -> AssignmentListResponse:
    """Get assignments for a policy with filtering and pagination."""
    # Check if policy exists
    policy = db.query(Policy).filter(Policy.id == policy_id).first()
    if not policy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Policy not found"
        )

    # Permission check: Only admins can view all assignments for a policy
    # Employees should not see other employees' assignments
    user_role = current_user.get("role")
    if user_role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can view policy assignments"
        )

    # Build query
    query = db.query(Assignment).filter(Assignment.policy_id == policy_id)
    
    # Apply status filter
    if status_filter:
        query = query.filter(Assignment.status == status_filter)
    
    # Apply search filter (search in user name or email)
    if search:
        query = query.join(User).filter(
            (User.name.ilike(f"%{search}%")) | 
            (User.email.ilike(f"%{search}%"))
        )
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    offset = (page - 1) * per_page
    assignments = query.offset(offset).limit(per_page).all()
    
    # Build response with details
    assignments_with_details = []
    for assignment in assignments:
        user = db.query(User).filter(User.id == assignment.user_id).first()
        if not user:
            continue

        # Get acknowledgment details if exists
        acknowledgment = db.query(Acknowledgment).filter(
            Acknowledgment.assignment_id == assignment.id
        ).first()

        has_acknowledgment = acknowledgment is not None

        # Prepare acknowledgment audit trail data
        ack_audit_data = {}
        if acknowledgment:
            ack_audit_data = {
                'ack_method': acknowledgment.ack_method.value if acknowledgment.ack_method else None,
                'ack_ip_address': acknowledgment.ip_address,
                'ack_typed_signature': acknowledgment.typed_signature,
                'ack_policy_version': acknowledgment.policy_version,
                'ack_policy_hash': acknowledgment.policy_hash_at_ack,
                'ack_created_at': acknowledgment.created_at
            }

        assignment_with_details = AssignmentWithDetails(
            **assignment.__dict__,
            user_name=user.name,
            user_email=user.email,
            user_department=user.department,
            policy_title=policy.title,
            policy_due_at=policy.due_at,
            has_acknowledgment=has_acknowledgment,
            **ack_audit_data
        )
        assignments_with_details.append(assignment_with_details)
    
    total_pages = (total + per_page - 1) // per_page
    
    return AssignmentListResponse(
        assignments=assignments_with_details,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages
    )


@router.post("/assignments/{assignment_id}/remind", response_model=dict)
def send_assignment_reminder(
    assignment_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_role)
) -> dict:
    """Send a reminder email for a specific assignment."""
    # Get assignment
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )
    
    # Check if assignment is still pending
    if assignment.status not in [AssignmentStatus.PENDING, AssignmentStatus.VIEWED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot send reminder for acknowledged or declined assignment"
        )
    
    # Rate limiting: max 3 reminders per assignment
    if assignment.reminder_count >= 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum number of reminders (3) already sent for this assignment"
        )
    
    # Get user and policy
    user = db.query(User).filter(User.id == assignment.user_id).first()
    policy = db.query(Policy).filter(Policy.id == assignment.policy_id).first()
    
    if not user or not policy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User or policy not found"
        )
    
    # Calculate days remaining
    days_remaining = 0
    if policy.due_at:
        days_remaining = (policy.due_at - datetime.utcnow()).days
    
    # Increment reminder count
    assignment.reminder_count += 1
    
    try:
        # Generate or get existing magic link
        if not assignment.magic_link_token:
            assignment.magic_link_token = create_magic_link_token(
                assignment_id=str(assignment.id),
                user_email=user.email
            )
        
        magic_link_url = f"{settings.frontend_url}/ack/{assignment.magic_link_token}"
        
        # Send reminder email with specific template based on reminder count
        message_id = send_reminder_email(
            user_email=user.email,
            user_name=user.name,
            policy_title=policy.title,
            magic_link_url=magic_link_url,
            days_remaining=days_remaining,
            reminder_count=assignment.reminder_count
        )
        
        # Record email event
        email_event = EmailEvent(
            assignment_id=assignment.id,
            type=EmailEventType.SEND,
            provider_message_id=message_id
        )
        db.add(email_event)
        
        db.commit()
        
        logger.info(f"Sent reminder #{assignment.reminder_count} to {user.email} for policy {policy.title}")
        
        return {
            "success": True,
            "message": f"Reminder #{assignment.reminder_count} sent to {user.email}",
            "reminder_count": assignment.reminder_count,
            "max_reminders_reached": assignment.reminder_count >= 3
        }
        
    except Exception as e:
        logger.error(f"Failed to send reminder email: {e}")
        # Rollback the reminder count increment if email failed
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send reminder email"
        )


@router.post("/assignments/{assignment_id}/regenerate-link", response_model=dict)
def regenerate_magic_link(
    assignment_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_role)
) -> dict:
    """Regenerate magic link for an assignment and optionally resend email."""
    # Get assignment
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )

    # Check if assignment is still pending/viewed
    if assignment.status not in [AssignmentStatus.PENDING, AssignmentStatus.VIEWED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot regenerate link for acknowledged or declined assignment"
        )

    # Get user and policy
    user = db.query(User).filter(User.id == assignment.user_id).first()
    policy = db.query(Policy).filter(Policy.id == assignment.policy_id).first()

    if not user or not policy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User or policy not found"
        )

    try:
        # Force regenerate magic link token
        magic_token = create_magic_link_token(
            assignment_id=str(assignment.id),
            user_email=user.email
        )
        assignment.magic_link_token = magic_token

        magic_link_url = f"{settings.frontend_url}/ack/{magic_token}"

        # Send fresh email with new link
        message_id = send_policy_assignment_email(
            user_email=user.email,
            user_name=user.name,
            policy_title=policy.title,
            magic_link_url=magic_link_url,
            due_date=policy.due_at
        )

        # Record email event
        email_event = EmailEvent(
            assignment_id=assignment.id,
            type=EmailEventType.SEND,
            provider_message_id=message_id
        )
        db.add(email_event)

        db.commit()

        logger.info(f"Regenerated magic link and sent fresh email to {user.email} for policy {policy.title}")

        return {
            "success": True,
            "message": f"Fresh link sent to {user.email}",
            "magic_link_url": magic_link_url
        }

    except Exception as e:
        logger.error(f"Failed to regenerate link: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to regenerate link"
        )


@router.delete("/assignments/{assignment_id}", response_model=dict)
def delete_assignment(
    assignment_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_role)
) -> dict:
    """Delete an assignment and its related data."""
    # Get assignment
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )

    # Get user email for logging
    user = db.query(User).filter(User.id == assignment.user_id).first()
    user_email = user.email if user else "unknown"

    # Only allow deletion of assignments that haven't been acknowledged
    if assignment.status == AssignmentStatus.ACKNOWLEDGED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete acknowledged assignment"
        )

    try:
        # Delete related acknowledgments (if any)
        db.query(Acknowledgment).filter(Acknowledgment.assignment_id == assignment_id).delete()

        # Delete related email events
        db.query(EmailEvent).filter(EmailEvent.assignment_id == assignment_id).delete()

        # Delete the assignment
        db.delete(assignment)
        db.commit()

        logger.info(f"Deleted assignment {assignment_id} for user {user_email}")

        return {
            "success": True,
            "message": f"Assignment for {user_email} deleted successfully"
        }

    except Exception as e:
        logger.error(f"Failed to delete assignment {assignment_id}: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete assignment"
        )


@router.post("/{policy_id}/remind-all", response_model=dict)
def send_bulk_reminders(
    policy_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_role)
) -> dict:
    """Send reminders to all pending/viewed assignments for a policy."""
    # Check if policy exists
    policy = db.query(Policy).filter(Policy.id == policy_id).first()
    if not policy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Policy not found"
        )
    
    # Get all pending/viewed assignments that haven't reached max reminders
    assignments = db.query(Assignment).filter(
        Assignment.policy_id == policy_id,
        Assignment.status.in_([AssignmentStatus.PENDING, AssignmentStatus.VIEWED]),
        Assignment.reminder_count < 3
    ).all()
    
    if not assignments:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No eligible assignments found for bulk reminders"
        )
    
    sent_reminders = 0
    failed_reminders = []
    max_reached_count = 0
    
    # Calculate days remaining
    days_remaining = 0
    if policy.due_at:
        days_remaining = (policy.due_at - datetime.utcnow()).days
    
    for assignment in assignments:
        try:
            # Get user details
            user = db.query(User).filter(User.id == assignment.user_id).first()
            if not user:
                failed_reminders.append(f"User {assignment.user_id} not found")
                continue
            
            # Skip if already at max reminders
            if assignment.reminder_count >= 3:
                max_reached_count += 1
                continue
            
            # Increment reminder count
            assignment.reminder_count += 1
            
            # Generate or get existing magic link
            if not assignment.magic_link_token:
                assignment.magic_link_token = create_magic_link_token(
                    assignment_id=str(assignment.id),
                    user_email=user.email
                )
            
            magic_link_url = f"{settings.frontend_url}/ack/{assignment.magic_link_token}"
            
            # Send reminder email
            message_id = send_reminder_email(
                user_email=user.email,
                user_name=user.name,
                policy_title=policy.title,
                magic_link_url=magic_link_url,
                days_remaining=days_remaining,
                reminder_count=assignment.reminder_count
            )
            
            # Record email event
            email_event = EmailEvent(
                assignment_id=assignment.id,
                type=EmailEventType.SEND,
                provider_message_id=message_id
            )
            db.add(email_event)
            
            sent_reminders += 1
            logger.info(f"Sent bulk reminder #{assignment.reminder_count} to {user.email} for policy {policy.title}")
            
        except Exception as e:
            logger.error(f"Failed to send bulk reminder to {user.email if 'user' in locals() else 'unknown'}: {e}")
            failed_reminders.append(f"Failed to send to {user.email if 'user' in locals() else 'unknown user'}")
            # Don't increment reminder count for failed sends
            if 'assignment' in locals():
                assignment.reminder_count -= 1
    
    # Commit all successful operations
    db.commit()
    
    total_eligible = len(assignments)
    
    logger.info(f"Bulk reminders for policy {policy.title}: {sent_reminders} sent, {len(failed_reminders)} failed, {max_reached_count} at max")
    
    return {
        "success": True,
        "message": f"Bulk reminders processed for policy '{policy.title}'",
        "total_eligible": total_eligible,
        "sent_reminders": sent_reminders,
        "failed_reminders": failed_reminders,
        "max_reached_count": max_reached_count
    }