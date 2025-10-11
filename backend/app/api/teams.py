from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from ..models.database import get_db
from ..models.models import Workspace, User, UserRole, AuthCode
from ..core.email import send_auth_code_email

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

    # Generate and store auth code for immediate signup continuation
    code = f"{(datetime.utcnow().microsecond % 1000000):06d}"  # simple 6-digit, email sender provides content
    expires_at = datetime.utcnow() + timedelta(minutes=10)

    # Remove existing codes for email
    db.query(AuthCode).filter(AuthCode.email == email).delete()
    db.add(AuthCode(email=email, code=code, expires_at=expires_at))
    db.commit()

    try:
        send_auth_code_email(email, user.name, code)
    except Exception:
        # Non-fatal; frontend can still prompt to request a new code
        pass

    return {"success": True, "workspace_id": str(workspace.id)}


