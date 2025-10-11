from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session

from ..models.database import get_db
from ..models.models import Workspace, User, UserRole

router = APIRouter(prefix="/teams", tags=["teams"])  # "teams" path label, models use Workspaces


@router.post("/register", response_model=dict)
def register_workspace(payload: dict, db: Session = Depends(get_db)) -> dict:
    """Register a new workspace (aka team) and seed first admin user.

    Expected body: {"team_name": str, "email": str}
    """
    team_name = (payload.get("team_name") or "").strip()
    email = (payload.get("email") or "").strip().lower()

    if not team_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Team name is required")
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is required")

    # Create workspace
    workspace = Workspace(name=team_name)
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

    return {"success": True, "workspace_id": str(workspace.id)}


