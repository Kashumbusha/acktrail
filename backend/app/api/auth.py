from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import logging

from ..schemas.auth import SendCodeRequest, VerifyCodeRequest, TokenResponse, CurrentUser
from ..schemas.users import UserCreate, UserResponse
from ..models.database import get_db
from ..models.models import User, AuthCode, UserRole
from ..core.email import send_auth_code_email
from ..core.security import (
    create_jwt_token,
    generate_six_digit_code,
    get_current_user,
)
from ..core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post("/send-code", response_model=dict)
def send_code(
    payload: SendCodeRequest,
    db: Session = Depends(get_db)
) -> dict:
    """Send authentication code to user's email."""
    email = payload.email.lower()
    
    # Check if user exists, if not create them as employee
    user = db.query(User).filter(User.email == email).first()
    if not user:
        # Create new user with employee role
        user = User(
            email=email,
            name=email.split('@')[0].title(),  # Use email prefix as name
            role=UserRole.EMPLOYEE
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        logger.info(f"Created new user: {email}")
    
    # Generate and store code in database
    code = generate_six_digit_code()
    expires_at = datetime.utcnow() + timedelta(minutes=10)
    
    # Remove any existing codes for this email
    db.query(AuthCode).filter(AuthCode.email == email).delete()
    
    # Create new auth code
    auth_code = AuthCode(
        email=email,
        code=code,
        expires_at=expires_at
    )
    db.add(auth_code)
    db.commit()
    
    try:
        # Send email
        send_auth_code_email(email, user.name, code)
        logger.info(f"Authentication code sent to {email}")
        return {"success": True, "message": "Authentication code sent to your email"}
    except Exception as e:
        logger.error(f"Failed to send email to {email}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send authentication code"
        )


@router.post("/verify-code", response_model=TokenResponse)
def verify_code(
    payload: VerifyCodeRequest,
    db: Session = Depends(get_db)
) -> TokenResponse:
    """Verify authentication code and return JWT token."""
    email = payload.email.lower()
    
    # Get user
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    # Enforce can_login
    if hasattr(user, 'can_login') and not user.can_login:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Login disabled for this user"
        )
    
    # Check auth code
    auth_code = db.query(AuthCode).filter(
        AuthCode.email == email,
        AuthCode.expires_at > datetime.utcnow()
    ).first()
    
    if not auth_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid authentication code found"
        )
    
    # Check if max attempts exceeded
    if auth_code.attempts >= 3:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Maximum verification attempts exceeded. Please request a new code."
        )
    
    # Increment attempts
    auth_code.attempts += 1
    db.commit()
    
    # Check if code matches
    if auth_code.code != payload.code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid authentication code. {3 - auth_code.attempts} attempts remaining."
        )
    
    # Check if already used
    if auth_code.used:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Authentication code has already been used"
        )
    
    # Mark code as used
    auth_code.used = True
    db.commit()
    
    # Create JWT token
    token = create_jwt_token(
        user_id=str(user.id),
        email=user.email,
        role=user.role.value,
        workspace_id=str(user.workspace_id) if getattr(user, 'workspace_id', None) else None
    )
    
    expires_in = settings.jwt_expire_days * 24 * 3600  # Convert to seconds
    
    logger.info(f"User authenticated successfully: {email}")
    
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=expires_in,
        user={
            "id": str(user.id),
            "email": user.email,
            "name": user.name,
            "role": user.role.value,
            "department": user.department,
            "created_at": user.created_at.isoformat()
        }
    )


@router.get("/me", response_model=CurrentUser)
def get_current_user_info(
    current_user: dict = Depends(get_current_user)
) -> CurrentUser:
    """Get current user information."""
    return CurrentUser(
        id=current_user["id"],
        email=current_user["email"],
        name=current_user["name"],
        role=current_user["role"],
        department=current_user["department"],
        created_at=datetime.fromisoformat(current_user.get("created_at", datetime.utcnow().isoformat()))
    )










