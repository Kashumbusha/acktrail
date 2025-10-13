from ..core.config import settings
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
import logging

from ..core.security import get_current_user
from ..core.email import send_brevo_email
from ..models.database import get_db
from ..models.models import DemoRequest
from uuid import UUID

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/support", tags=["support"])

SUPPORT_EMAIL = "kashustephen@gmail.com"

_optional_bearer = HTTPBearer(auto_error=False)

class SupportMessageRequest(BaseModel):
    message: str
    from_email: EmailStr | None = None
    name: str | None = None
    company: str | None = None
    role: str | None = None
    team_size: str | None = None
    country: str | None = None
    goal: str | None = None
    source: str | None = None


def optional_current_user(credentials: HTTPAuthorizationCredentials | None = Depends(_optional_bearer)):
    if not credentials:
        return None
    try:
        return get_current_user(credentials)
    except HTTPException:
        return None


@router.post("/contact")
async def contact_support(
    payload: SupportMessageRequest,
    current_user=Depends(optional_current_user),
    db: Session = Depends(get_db)
):
    message = payload.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    sender = payload.from_email or (current_user.get("email") if current_user else None)
    requester_name = current_user.get("name", "Unknown user") if current_user else "Anonymous"
    workspace_name = current_user.get("workspace_name", "Unknown") if current_user else "Unknown"

    subject = f"Support request from {requester_name}"

    # Precompute line breaks to avoid backslashes inside f-string expressions
    sanitized_message = message.replace("\n", "<br>")

    body = (
        "<h2>New Support Request</h2>"
        f"<p><strong>Name:</strong> {requester_name}</p>"
        f"<p><strong>Email:</strong> {sender or 'n/a'}</p>"
        f"<p><strong>Workspace:</strong> {workspace_name}</p>"
        f"<p><strong>Message:</strong></p><p>{sanitized_message}</p>"
    )

    try:
        # Persist the request for tracking/analytics
        demo_request = DemoRequest(
            name=payload.name or requester_name,
            email=sender or payload.from_email or "unknown@example.com",
            company=payload.company,
            role=payload.role,
            team_size=payload.team_size,
            country=payload.country,
            goal=payload.goal or payload.message,
            message=payload.message,
            source=payload.source,
            created_by_user_id=UUID(current_user["id"]) if current_user and current_user.get("id") else None,
            workspace_id=UUID(current_user["workspace_id"]) if current_user and current_user.get("workspace_id") else None,
        )
        db.add(demo_request)
        db.commit()

        if settings.brevo_api_key:
            send_brevo_email(
                to_email=SUPPORT_EMAIL,
                subject=subject,
                html_content=body,
                tags=["support"]
            )
            logger.info("Support request emailed to %s", SUPPORT_EMAIL)
        else:
            logger.warning("Brevo API key missing; logging support message instead")
        return {"success": True}
    except RuntimeError as exc:
        logger.error("Support email failed (misconfiguration): %s", exc)
        raise HTTPException(status_code=500, detail="Email service not configured")
    except Exception as exc:
        logger.error("Support email failed: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to send support message")
