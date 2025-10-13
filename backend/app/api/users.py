from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID
import logging

from ..models.database import get_db
from ..models.models import User, Assignment, Policy, UserRole, Workspace
from ..core.security import get_current_user, require_admin_role
from ..core.email import send_invitation_email

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/users", tags=["users"])


def update_workspace_active_staff_count(db: Session, workspace_id: UUID):
    """
    Calculate and update the active staff count for a workspace.
    Active staff = employees only (role=employee, is_guest=False, active=True).
    Admins do NOT count towards the seat limit.
    """
    # Count only active employees (not admins, not guests)
    active_staff = db.query(User).filter(
        User.workspace_id == workspace_id,
        User.role == UserRole.EMPLOYEE,
        User.is_guest == False,
        User.active == True
    ).count()

    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if workspace:
        workspace.active_staff_count = active_staff
        db.commit()
        logger.info(f"Updated workspace {workspace_id} active_staff_count to {active_staff} (employees only)")

    return active_staff


@router.get("/")
def list_users(
    type: Optional[str] = Query(None, description="staff|guests"),
    search: Optional[str] = None,
    page: int = 1,
    per_page: int = 20,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_role)
):
    query = db.query(User).filter(User.workspace_id == UUID(current_user["workspace_id"]) if current_user.get("workspace_id") else True)
    if type == "staff":
        query = query.filter(User.is_guest == False)
    elif type == "guests":
        query = query.filter(User.is_guest == True)
    if search:
        search_like = f"%{search}%"
        query = query.filter((User.name.ilike(search_like)) | (User.email.ilike(search_like)))
    total = query.count()
    users = query.offset((page - 1) * per_page).limit(per_page).all()
    # basic shape for frontend
    return {
        "users": [
            {
                "id": str(u.id),
                "email": u.email,
                "name": u.name,
                "role": u.role.value,
                "is_guest": u.is_guest,
                "can_login": u.can_login,
                "active": u.active,
            }
            for u in users
        ],
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page,
    }


@router.post("/invite")
def invite_user(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_role)
):
    email = (payload.get("email") or "").strip().lower()
    name = (payload.get("name") or email.split('@')[0]).strip()
    role = payload.get("role") or "employee"
    is_guest = bool(payload.get("is_guest", False))
    can_login = bool(payload.get("can_login", not is_guest))
    team_id = payload.get("team_id")  # Optional team assignment

    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email required")

    # Validation: Enforce business rules
    if is_guest and role == "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Guest users cannot have admin role"
        )

    if is_guest and can_login:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Guest users cannot have login access"
        )

    if not is_guest and not can_login:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Staff users must have login access"
        )

    # Validate admin limits per plan
    if role == "admin" and current_user.get("workspace_id"):
        workspace = db.query(Workspace).filter(Workspace.id == UUID(current_user["workspace_id"])).first()
        if workspace:
            # Define admin limits per plan
            admin_limits = {
                "small": 1,
                "medium": 2,
                "large": 5
            }
            plan_tier = workspace.plan.value if workspace.plan else "small"
            max_admins = admin_limits.get(plan_tier, 1)

            # Count existing admins (excluding the user being updated if they already exist)
            existing_user = db.query(User).filter(User.email == email).first()
            existing_admin_count = db.query(User).filter(
                User.workspace_id == workspace.id,
                User.role == UserRole.ADMIN,
                User.active == True
            ).count()

            # If this is a new admin or converting to admin
            if not existing_user or existing_user.role != UserRole.ADMIN:
                if existing_admin_count >= max_admins:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Your {plan_tier} plan allows a maximum of {max_admins} admin(s). Please upgrade your plan to add more admins."
                    )

    # Validate employee seat limits
    if role == "employee" and not is_guest and current_user.get("workspace_id"):
        workspace = db.query(Workspace).filter(Workspace.id == UUID(current_user["workspace_id"])).first()
        if workspace:
            existing_user = db.query(User).filter(User.email == email).first()
            current_employee_count = db.query(User).filter(
                User.workspace_id == workspace.id,
                User.role == UserRole.EMPLOYEE,
                User.is_guest == False,
                User.active == True
            ).count()

            # If this is a new employee or converting to employee
            if not existing_user or existing_user.role != UserRole.EMPLOYEE or existing_user.is_guest:
                if current_employee_count >= (workspace.staff_count or 0):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"You have reached your seat limit of {workspace.staff_count} employees. Please increase your seat count in settings."
                    )

    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(email=email, name=name)
        db.add(user)
        db.flush()

    user.role = UserRole(role)
    user.is_guest = is_guest
    user.can_login = can_login
    if current_user.get("workspace_id"):
        user.workspace_id = UUID(current_user["workspace_id"])  # type: ignore
    if team_id:
        user.team_id = UUID(team_id)  # type: ignore
    db.commit()

    # Update workspace active staff count
    if current_user.get("workspace_id"):
        update_workspace_active_staff_count(db, UUID(current_user["workspace_id"]))

    # Send invitation email
    try:
        invited_by_name = current_user.get("name", "Your administrator")
        send_invitation_email(
            user_email=email,
            user_name=name,
            role=role,
            is_guest=is_guest,
            can_login=can_login,
            invited_by=invited_by_name
        )
        logger.info(f"Invitation email sent to {email}")
    except Exception as e:
        logger.error(f"Failed to send invitation email to {email}: {e}")
        # Don't fail the invitation if email fails
        # User is still created/updated successfully

    return {"success": True, "id": str(user.id)}


@router.patch("/{user_id}")
def update_user(
    user_id: UUID,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_role)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Apply updates to temporary values for validation
    updated_role = UserRole(payload["role"]) if "role" in payload else user.role
    updated_can_login = bool(payload["can_login"]) if "can_login" in payload else user.can_login
    updated_is_guest = user.is_guest  # is_guest cannot be changed via update

    # Validation: Enforce business rules
    if updated_is_guest and updated_role == UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Guest users cannot have admin role"
        )

    if updated_is_guest and updated_can_login:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Guest users cannot have login access"
        )

    if not updated_is_guest and not updated_can_login:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Staff users must have login access"
        )

    # Apply validated updates
    if "name" in payload:
        user.name = payload["name"]
    if "role" in payload:
        user.role = updated_role
    if "can_login" in payload:
        user.can_login = updated_can_login
    if "active" in payload:
        user.active = bool(payload["active"])
    db.commit()

    # Update workspace active staff count if relevant fields changed
    if user.workspace_id and ("active" in payload or "can_login" in payload):
        update_workspace_active_staff_count(db, user.workspace_id)

    return {"success": True}


@router.patch("/me")
def update_current_user_profile(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update current user's profile information."""
    user = db.query(User).filter(User.id == UUID(current_user["id"])).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Update allowed fields
    if "first_name" in payload:
        user.first_name = payload["first_name"].strip()
    if "last_name" in payload:
        user.last_name = payload["last_name"].strip()
    if "phone" in payload:
        user.phone = payload["phone"].strip()
    if "country" in payload:
        user.country = payload["country"].strip()

    # Update full name if first or last name changed
    if "first_name" in payload or "last_name" in payload:
        first = user.first_name or ""
        last = user.last_name or ""
        user.name = f"{first} {last}".strip()

    db.commit()

    return {
        "success": True,
        "user": {
            "id": str(user.id),
            "email": user.email,
            "name": user.name,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "phone": user.phone,
            "country": user.country,
        }
    }


@router.get("/me/assignments")
def get_my_assignments(
    page: int = 1,
    per_page: int = 20,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get current user's policy assignments (employee-accessible)."""
    user_id = UUID(current_user["id"])

    # Query assignments for current user only
    query = db.query(Assignment).filter(Assignment.user_id == user_id)
    total = query.count()

    assignments = query.order_by(Assignment.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()

    result = []
    for a in assignments:
        policy = db.query(Policy).filter(Policy.id == a.policy_id).first()
        result.append({
            "id": str(a.id),
            "policy_id": str(a.policy_id) if policy else None,
            "policy_title": policy.title if policy else "",
            "policy_due_at": policy.due_at.isoformat() if policy and policy.due_at else None,
            "status": a.status.value,
            "created_at": a.created_at.isoformat(),
            "viewed_at": a.viewed_at.isoformat() if a.viewed_at else None,
            "acknowledged_at": a.acknowledged_at.isoformat() if a.acknowledged_at else None,
        })

    return {
        "assignments": result,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page
    }


@router.get("/{user_id}/assignments")
def user_assignments(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_role)
):
    assignments = db.query(Assignment).filter(Assignment.user_id == user_id).all()
    result = []
    for a in assignments:
        policy = db.query(Policy).filter(Policy.id == a.policy_id).first()
        result.append({
            "id": str(a.id),
            "status": a.status.value,
            "policy_title": policy.title if policy else "",
            "created_at": a.created_at.isoformat(),
            "viewed_at": a.viewed_at.isoformat() if a.viewed_at else None,
            "acknowledged_at": a.acknowledged_at.isoformat() if a.acknowledged_at else None,
        })
    return {"assignments": result}


@router.post("/sync-staff-count")
def sync_workspace_staff_count(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_role)
):
    """
    Admin endpoint to manually sync the active_staff_count for the current workspace.
    This is useful for fixing inconsistent data.
    """
    workspace_id = current_user.get("workspace_id")
    if not workspace_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User not associated with a workspace"
        )

    active_count = update_workspace_active_staff_count(db, UUID(workspace_id))

    return {
        "success": True,
        "message": "Active staff count synced successfully",
        "active_staff_count": active_count
    }


