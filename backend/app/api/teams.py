from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from ..models.database import get_db
from ..models.models import Workspace, User, UserRole, PlanTier

router = APIRouter(prefix="/teams", tags=["teams"])  # "teams" path label, models use Workspaces


@router.post("/register", response_model=dict)
def register_workspace(payload: dict, db: Session = Depends(get_db)) -> dict:
    """Register a new workspace (aka team) and seed first admin user.

    Expected body: {"team_name": str, "email": str, "plan": str (optional), "sso_enabled": bool (optional)}
    """
    team_name = (payload.get("team_name") or "").strip()
    email = (payload.get("email") or "").strip().lower()
    plan_str = (payload.get("plan") or "small").strip().lower()
    sso_enabled = payload.get("sso_enabled", False)

    if not team_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Team name is required")
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is required")

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

    # Create workspace with 7-day free trial
    trial_ends_at = datetime.utcnow() + timedelta(days=7)
    workspace = Workspace(name=team_name, plan=plan, trial_ends_at=trial_ends_at, sso_enabled=sso_enabled)
    db.add(workspace)
    db.flush()

    # Create or attach user as admin
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(email=email, name=email.split('@')[0].title(), role=UserRole.ADMIN)
        db.add(user)
        db.flush()

    user.role = UserRole.ADMIN
    user.workspace_id = workspace.id
    db.commit()

    # Note: No email sent here - frontend will call /auth/send-code to send verification email
    # This prevents duplicate emails during signup flow

    return {
        "success": True,
        "workspace_id": str(workspace.id),
        "plan": workspace.plan.value,
        "trial_ends_at": workspace.trial_ends_at.isoformat() if workspace.trial_ends_at else None,
        "sso_enabled": workspace.sso_enabled
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
from ..core.security import get_current_user


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
def create_team(payload: dict, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    """Create a new team in the current user's workspace.

    Expected body: {"name": str}
    """
    # Only admins can create teams
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can create teams")

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
def update_team(team_id: str, payload: dict, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    """Update a team's name.

    Expected body: {"name": str}
    """
    # Only admins can update teams
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can update teams")

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


@router.delete("/{team_id}", response_model=dict)
def delete_team(team_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    """Delete a team."""
    # Only admins can delete teams
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can delete teams")

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

    db.delete(team)
    db.commit()

    return {"success": True, "message": "Team deleted successfully"}


