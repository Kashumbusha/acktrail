from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from ..models.database import get_db
from ..models.models import Workspace, User, UserRole, PlanTier

router = APIRouter(prefix="/teams", tags=["teams"])  # "teams" path label, models use Workspaces


@router.post("/register", response_model=dict)
def register_workspace(payload: dict, db: Session = Depends(get_db)) -> dict:
    """Register a new workspace (aka team) and seed first admin user.

    Expected body: {
        "team_name": str,
        "email": str,
        "first_name": str,
        "last_name": str,
        "phone": str,
        "country": str,
        "password": str (optional),
        "plan": str (optional),
        "sso_enabled": bool (optional),
        "staff_count": int (optional),
        "billing_interval": str (optional)
    }
    """
    team_name = (payload.get("team_name") or "").strip()
    email = (payload.get("email") or "").strip().lower()
    first_name = (payload.get("first_name") or "").strip()
    last_name = (payload.get("last_name") or "").strip()
    phone = (payload.get("phone") or "").strip()
    country = (payload.get("country") or "").strip()
    password = payload.get("password", "").strip()
    plan_str = (payload.get("plan") or "small").strip().lower()
    sso_enabled = payload.get("sso_enabled", False)
    staff_count = payload.get("staff_count", 1)
    billing_interval = payload.get("billing_interval", "month")

    if not team_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Team name is required")
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is required")
    if not first_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="First name is required")
    if not last_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Last name is required")
    if not phone:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Phone is required")
    if not country:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Country is required")

    # Validate plan
    try:
        plan = PlanTier(plan_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid plan. Must be one of: {', '.join([p.value for p in PlanTier])}"
        )

    # Check if workspace name already exists
    existing_workspace = db.query(Workspace).filter(Workspace.name == team_name).first()
    if existing_workspace:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Workspace '{team_name}' already exists. Please choose a different name."
        )

    # Normalize billing interval (month -> monthly, year -> annual)
    normalized_interval = "annual" if billing_interval == "year" else "monthly"

    # Create workspace WITHOUT trial - trial will only be granted after Stripe checkout success
    # onboarding_completed will be set to true after checkout webhook confirms payment
    workspace = Workspace(
        name=team_name,
        plan=plan,
        trial_ends_at=None,  # Will be set by Stripe webhook after successful checkout
        sso_enabled=sso_enabled,
        staff_count=staff_count,  # Set licensed seats during registration
        billing_interval=normalized_interval,
        onboarding_completed=False  # Requires Stripe checkout to complete onboarding
    )
    db.add(workspace)
    db.flush()

    # Create or attach user as admin
    user = db.query(User).filter(User.email == email).first()
    if not user:
        # Create full name from first and last name
        full_name = f"{first_name} {last_name}".strip()

        # Hash password if provided
        password_hash = None
        if password and len(password) >= 8:
            from ..core.security import hash_password
            password_hash = hash_password(password)

        user = User(
            email=email,
            name=full_name,
            first_name=first_name,
            last_name=last_name,
            phone=phone,
            country=country,
            password_hash=password_hash,
            role=UserRole.ADMIN
        )
        db.add(user)
        db.flush()
    else:
        # Update existing user with new details
        user.first_name = first_name
        user.last_name = last_name
        user.phone = phone
        user.country = country
        user.name = f"{first_name} {last_name}".strip()
        if password and len(password) >= 8:
            from ..core.security import hash_password
            user.password_hash = hash_password(password)

    user.role = UserRole.ADMIN
    user.workspace_id = workspace.id
    db.commit()

    # Initialize workspace active_staff_count (admin doesn't count, so it will be 0 initially)
    from .users import update_workspace_active_staff_count
    update_workspace_active_staff_count(db, workspace.id)

    # Note: No email sent here - frontend will call /auth/send-code to send verification email
    # This prevents duplicate emails during signup flow

    return {
        "success": True,
        "workspace_id": str(workspace.id),
        "plan": workspace.plan.value,
        "sso_enabled": workspace.sso_enabled,
        "is_whitelisted": workspace.is_whitelisted or False,
        "onboarding_completed": workspace.onboarding_completed,
        "message": "Workspace created. Please complete Stripe checkout to activate your trial."
    }


@router.post("/check-workspace", response_model=dict)
def check_workspace(payload: dict, db: Session = Depends(get_db)) -> dict:
    """Check if a workspace exists and return its ID if it does.

    Expected body: {"workspace_name": str}
    """
    workspace_name = (payload.get("workspace_name") or "").strip()

    if not workspace_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Workspace name is required")

    workspace = db.query(Workspace).filter(Workspace.name == workspace_name).first()

    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workspace '{workspace_name}' not found"
        )

    return {
        "success": True,
        "workspace_id": str(workspace.id),
        "workspace_name": workspace.name
    }


# Team Management Endpoints
from ..models.models import Team
from ..core.security import get_current_user, require_admin_role


@router.get("/list", response_model=dict)
def list_teams(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    """List all teams in the current user's workspace."""
    workspace_id = current_user.get("workspace_id")
    if not workspace_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with a workspace")

    teams = db.query(Team).filter(Team.workspace_id == workspace_id).order_by(Team.created_at.desc()).all()

    return {
        "success": True,
        "teams": [
            {
                "id": str(team.id),
                "name": team.name,
                "created_at": team.created_at.isoformat(),
                "policy_count": len(team.policies)
            }
            for team in teams
        ]
    }


@router.post("/create", response_model=dict)
def create_team(payload: dict, current_user: dict = Depends(require_admin_role), db: Session = Depends(get_db)) -> dict:
    """Create a new team in the current user's workspace.

    Expected body: {"name": str}
    """

    workspace_id = current_user.get("workspace_id")
    if not workspace_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with a workspace")

    team_name = (payload.get("name") or "").strip()
    if not team_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Team name is required")

    # Check if team name already exists in this workspace
    existing_team = db.query(Team).filter(
        Team.workspace_id == workspace_id,
        Team.name == team_name
    ).first()

    if existing_team:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Team '{team_name}' already exists in this workspace"
        )

    # Create the team
    from uuid import UUID
    team = Team(
        name=team_name,
        workspace_id=UUID(workspace_id)
    )
    db.add(team)
    db.commit()
    db.refresh(team)

    return {
        "success": True,
        "team": {
            "id": str(team.id),
            "name": team.name,
            "created_at": team.created_at.isoformat()
        }
    }


@router.patch("/{team_id}", response_model=dict)
def update_team(team_id: str, payload: dict, current_user: dict = Depends(require_admin_role), db: Session = Depends(get_db)) -> dict:
    """Update a team's name.

    Expected body: {"name": str}
    """

    workspace_id = current_user.get("workspace_id")
    if not workspace_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with a workspace")

    from uuid import UUID
    team = db.query(Team).filter(
        Team.id == UUID(team_id),
        Team.workspace_id == UUID(workspace_id)
    ).first()

    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")

    team_name = (payload.get("name") or "").strip()
    if not team_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Team name is required")

    # Check if new name already exists in this workspace
    existing_team = db.query(Team).filter(
        Team.workspace_id == UUID(workspace_id),
        Team.name == team_name,
        Team.id != UUID(team_id)
    ).first()

    if existing_team:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Team '{team_name}' already exists in this workspace"
        )

    team.name = team_name
    db.commit()
    db.refresh(team)

    return {
        "success": True,
        "team": {
            "id": str(team.id),
            "name": team.name,
            "created_at": team.created_at.isoformat()
        }
    }


@router.get("/{team_id}", response_model=dict)
def get_team_detail(team_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    """Get team details including members."""
    workspace_id = current_user.get("workspace_id")
    if not workspace_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with a workspace")

    from uuid import UUID
    team = db.query(Team).filter(
        Team.id == UUID(team_id),
        Team.workspace_id == UUID(workspace_id)
    ).first()

    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")

    # Get team members
    members = db.query(User).filter(User.team_id == UUID(team_id)).all()

    return {
        "success": True,
        "team": {
            "id": str(team.id),
            "name": team.name,
            "created_at": team.created_at.isoformat(),
            "member_count": len(members),
            "policy_count": len(team.policies),
            "members": [
                {
                    "id": str(member.id),
                    "email": member.email,
                    "name": member.name,
                    "role": member.role.value,
                    "is_guest": member.is_guest,
                    "active": member.active,
                    "created_at": member.created_at.isoformat()
                }
                for member in members
            ]
        }
    }


@router.post("/{team_id}/members", response_model=dict)
def add_team_member(team_id: str, payload: dict, current_user: dict = Depends(require_admin_role), db: Session = Depends(get_db)) -> dict:
    """Add a user to a team.

    Expected body: {"user_id": str}
    """

    workspace_id = current_user.get("workspace_id")
    if not workspace_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with a workspace")

    from uuid import UUID
    team = db.query(Team).filter(
        Team.id == UUID(team_id),
        Team.workspace_id == UUID(workspace_id)
    ).first()

    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")

    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="user_id is required")

    user = db.query(User).filter(
        User.id == UUID(user_id),
        User.workspace_id == UUID(workspace_id)
    ).first()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found in this workspace")

    # Check if user is already in another team
    if user.team_id and str(user.team_id) != team_id:
        old_team = db.query(Team).filter(Team.id == user.team_id).first()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User is already a member of team '{old_team.name if old_team else 'Unknown'}'. Remove them from that team first."
        )

    # Add user to team
    user.team_id = UUID(team_id)
    db.commit()

    return {
        "success": True,
        "message": f"User {user.email} added to team {team.name}"
    }


@router.delete("/{team_id}/members/{user_id}", response_model=dict)
def remove_team_member(team_id: str, user_id: str, current_user: dict = Depends(require_admin_role), db: Session = Depends(get_db)) -> dict:
    """Remove a user from a team."""

    workspace_id = current_user.get("workspace_id")
    if not workspace_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with a workspace")

    from uuid import UUID
    team = db.query(Team).filter(
        Team.id == UUID(team_id),
        Team.workspace_id == UUID(workspace_id)
    ).first()

    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")

    user = db.query(User).filter(
        User.id == UUID(user_id),
        User.team_id == UUID(team_id)
    ).first()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found in this team")

    # Remove user from team
    user.team_id = None
    db.commit()

    return {
        "success": True,
        "message": f"User {user.email} removed from team {team.name}"
    }


@router.delete("/{team_id}", response_model=dict)
def delete_team(team_id: str, current_user: dict = Depends(require_admin_role), db: Session = Depends(get_db)) -> dict:
    """Delete a team."""

    workspace_id = current_user.get("workspace_id")
    if not workspace_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with a workspace")

    from uuid import UUID
    team = db.query(Team).filter(
        Team.id == UUID(team_id),
        Team.workspace_id == UUID(workspace_id)
    ).first()

    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")

    # Check if team has associated policies
    if len(team.policies) > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete team with {len(team.policies)} associated policies. Please reassign or delete the policies first."
        )

    # Check if team has members
    member_count = db.query(User).filter(User.team_id == UUID(team_id)).count()
    if member_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete team with {member_count} members. Please remove all members first."
        )

    db.delete(team)
    db.commit()

    return {"success": True, "message": "Team deleted successfully"}


# Platform Admin Endpoints
@router.post("/whitelist-workspace", response_model=dict)
def whitelist_workspace(
    payload: dict,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """
    Whitelist a workspace so it bypasses payment requirements.
    Only platform admins can use this endpoint.

    Expected body: {
        "workspace_id": str,
        "is_whitelisted": bool
    }
    """
    # Check if user is a platform admin
    if not current_user.get("is_platform_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only platform admins can manage workspace whitelist"
        )

    workspace_id = payload.get("workspace_id")
    is_whitelisted = payload.get("is_whitelisted", True)

    if not workspace_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="workspace_id is required"
        )

    from uuid import UUID

    # Get the workspace
    workspace = db.query(Workspace).filter(Workspace.id == UUID(workspace_id)).first()
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found"
        )

    # Update whitelist status
    workspace.is_whitelisted = is_whitelisted
    db.commit()

    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Workspace {workspace.name} (ID: {workspace_id}) whitelist status set to {is_whitelisted} by platform admin {current_user.get('email')}")

    return {
        "success": True,
        "message": f"Workspace '{workspace.name}' {'whitelisted' if is_whitelisted else 'removed from whitelist'}",
        "workspace": {
            "id": str(workspace.id),
            "name": workspace.name,
            "is_whitelisted": workspace.is_whitelisted
        }
    }


