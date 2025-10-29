from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from uuid import UUID
import logging
import httpx
import msal

from ..schemas.auth import SendCodeRequest, VerifyCodeRequest, TokenResponse, CurrentUser
from ..schemas.users import UserCreate, UserResponse
from ..models.database import get_db
from ..models.models import User, AuthCode, UserRole, Workspace, SSOConfig
from ..core.email import send_auth_code_email
from ..core.security import (
    create_jwt_token,
    generate_six_digit_code,
    generate_magic_link_token,
    hash_password,
    verify_password,
    get_current_user,
    decrypt_secret,
)
from ..core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post("/send-code", response_model=dict)
def send_code(
    payload: dict,
    db: Session = Depends(get_db)
) -> dict:
    """Send authentication code to user's email for a specific workspace."""
    email = (payload.get("email") or "").strip().lower()
    workspace_id = payload.get("workspace_id")

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is required"
        )

    if not workspace_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Workspace ID is required"
        )

    # Validate workspace exists
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found"
        )

    # Find user in this workspace
    user = db.query(User).filter(
        User.email == email,
        User.workspace_id == workspace_id
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with email {email} is not a member of workspace '{workspace.name}'"
        )

    # Check if user is allowed to login
    if not user.can_login:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account does not have login access. Please contact your administrator."
        )

    # Generate and store code in database
    code = generate_six_digit_code()
    magic_token = generate_magic_link_token()
    expires_at = datetime.utcnow() + timedelta(minutes=10)

    # Remove any existing codes for this email
    db.query(AuthCode).filter(AuthCode.email == email).delete()

    # Create new auth code with magic token
    auth_code = AuthCode(
        email=email,
        code=code,
        magic_token=magic_token,
        expires_at=expires_at
    )
    db.add(auth_code)
    db.commit()

    try:
        # Send email with both code and magic link
        magic_link = f"{settings.frontend_url}/verify?token={magic_token}&workspace_id={workspace_id}"
        send_auth_code_email(email, user.name, code, magic_link)
        logger.info(f"Authentication code sent to {email} for workspace {workspace.name}")
        return {
            "success": True,
            "message": "Authentication code sent to your email",
            "workspace_name": workspace.name
        }
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
    workspace_id = payload.workspace_id

    if not workspace_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Workspace ID is required"
        )

    # Find user in specified workspace
    user = db.query(User).filter(
        User.email == email,
        User.workspace_id == workspace_id
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found in workspace"
        )

    # Check if user can login
    if not user.can_login:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Login access disabled. Contact your administrator."
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
    
    workspace = getattr(user, "workspace", None)

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
            "first_name": getattr(user, 'first_name', None),
            "last_name": getattr(user, 'last_name', None),
            "phone": getattr(user, 'phone', None),
            "country": getattr(user, 'country', None),
            "role": user.role.value,
            "workspace_id": str(user.workspace_id) if getattr(user, 'workspace_id', None) else None,
            "workspace_name": workspace.name if workspace else None,
            "is_platform_admin": bool(getattr(user, 'is_platform_admin', False)),
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
        first_name=current_user.get("first_name"),
        last_name=current_user.get("last_name"),
        phone=current_user.get("phone"),
        country=current_user.get("country"),
        role=current_user["role"],
        workspace_id=current_user.get("workspace_id"),
        workspace_name=current_user.get("workspace_name"),
        is_platform_admin=current_user.get("is_platform_admin", False),
        department=current_user["department"],
        created_at=datetime.fromisoformat(current_user.get("created_at", datetime.utcnow().isoformat()))
    )


@router.post("/login-password", response_model=TokenResponse)
def login_with_password(
    payload: dict,
    db: Session = Depends(get_db)
) -> TokenResponse:
    """Login with email and password for a specific workspace."""
    email = payload.get("email", "").lower()
    password = payload.get("password", "")
    workspace_id = payload.get("workspace_id")

    if not email or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email and password are required"
        )

    if not workspace_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Workspace ID is required"
        )

    # Find user in specified workspace
    user = db.query(User).filter(
        User.email == email,
        User.workspace_id == workspace_id
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # Check if user can login
    if not user.can_login:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Login access disabled. Contact your administrator."
        )

    # Check if user has password set
    if not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password login not enabled. Please use code verification."
        )

    # Verify password
    if not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # Create JWT token
    token = create_jwt_token(
        user_id=str(user.id),
        email=user.email,
        role=user.role.value,
        workspace_id=str(user.workspace_id) if getattr(user, 'workspace_id', None) else None
    )

    expires_in = settings.jwt_expire_days * 24 * 3600

    workspace = getattr(user, "workspace", None)

    logger.info(f"User authenticated with password: {email}")

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=expires_in,
        user={
            "id": str(user.id),
            "email": user.email,
            "name": user.name,
            "first_name": getattr(user, 'first_name', None),
            "last_name": getattr(user, 'last_name', None),
            "phone": getattr(user, 'phone', None),
            "country": getattr(user, 'country', None),
            "role": user.role.value,
            "workspace_id": str(user.workspace_id) if getattr(user, 'workspace_id', None) else None,
            "workspace_name": workspace.name if workspace else None,
            "is_platform_admin": bool(getattr(user, 'is_platform_admin', False)),
            "department": user.department,
            "created_at": user.created_at.isoformat()
        }
    )


@router.post("/verify-magic-link", response_model=TokenResponse)
def verify_magic_link(
    payload: dict,
    db: Session = Depends(get_db)
) -> TokenResponse:
    """Verify magic link token and return JWT token."""
    magic_token = payload.get("token", "")
    workspace_id = payload.get("workspace_id")

    if not magic_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token is required"
        )

    if not workspace_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Workspace ID is required"
        )

    # Find auth code with this magic token
    auth_code = db.query(AuthCode).filter(
        AuthCode.magic_token == magic_token,
        AuthCode.expires_at > datetime.utcnow(),
        AuthCode.used == False
    ).first()

    if not auth_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired magic link"
        )

    # Find user in specified workspace
    user = db.query(User).filter(
        User.email == auth_code.email,
        User.workspace_id == workspace_id
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found in workspace"
        )

    # Check if user can login
    if not user.can_login:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Login access disabled. Contact your administrator."
        )

    workspace = getattr(user, "workspace", None)

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

    expires_in = settings.jwt_expire_days * 24 * 3600

    logger.info(f"User authenticated via magic link: {user.email}")

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=expires_in,
        user={
            "id": str(user.id),
            "email": user.email,
            "name": user.name,
            "first_name": getattr(user, 'first_name', None),
            "last_name": getattr(user, 'last_name', None),
            "phone": getattr(user, 'phone', None),
            "country": getattr(user, 'country', None),
            "role": user.role.value,
            "workspace_id": str(user.workspace_id) if getattr(user, 'workspace_id', None) else None,
            "workspace_name": workspace.name if workspace else None,
            "stripe_customer_id": workspace.stripe_customer_id if workspace else None,
            "is_platform_admin": bool(getattr(user, 'is_platform_admin', False)),
            "department": user.department,
            "created_at": user.created_at.isoformat()
        }
    )


@router.post("/set-password")
def set_password(
    payload: dict,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """Set or update password for current user."""
    password = payload.get("password", "")

    if not password or len(password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters"
        )

    # Get user
    user = db.query(User).filter(User.id == UUID(current_user["id"])).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Hash and store password
    user.password_hash = hash_password(password)
    db.commit()

    logger.info(f"Password set for user: {user.email}")

    return {"success": True, "message": "Password set successfully"}


@router.post("/change-password")
def change_password(
    payload: dict,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """Change password for current user (requires current password verification)."""
    current_password = payload.get("current_password", "")
    new_password = payload.get("new_password", "")

    if not current_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is required"
        )

    if not new_password or len(new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 8 characters"
        )

    if current_password == new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from current password"
        )

    # Get user
    user = db.query(User).filter(User.id == UUID(current_user["id"])).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Check if user has a password set
    if not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No password set. Please use the set-password endpoint first."
        )

    # Verify current password
    if not verify_password(current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )

    # Hash and store new password
    user.password_hash = hash_password(new_password)
    db.commit()

    logger.info(f"Password changed for user: {user.email}")

    return {"success": True, "message": "Password changed successfully"}


# ============================================================================
# SSO / OAuth Endpoints
# ============================================================================

@router.get("/sso/microsoft/authorize")
async def sso_microsoft_authorize(
    workspace_id: str,
    db: Session = Depends(get_db)
):
    """
    Initiate Microsoft OAuth flow.
    Redirects user to Microsoft login page.
    """
    try:
        workspace_uuid = UUID(workspace_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid workspace ID")

    # Get workspace
    workspace = db.query(Workspace).filter(Workspace.id == workspace_uuid).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    # Check if SSO is enabled
    if not workspace.sso_enabled or not workspace.sso_purchased:
        raise HTTPException(status_code=403, detail="SSO not enabled for this workspace")

    # Get SSO config
    sso_config = db.query(SSOConfig).filter(
        SSOConfig.workspace_id == workspace_uuid,
        SSOConfig.is_active == True
    ).first()

    if not sso_config:
        raise HTTPException(status_code=404, detail="SSO not configured for this workspace")

    # Decrypt client secret
    try:
        client_secret = decrypt_secret(sso_config.client_secret_encrypted)
    except Exception as e:
        logger.error(f"Failed to decrypt SSO secret for workspace {workspace_id}: {e}")
        raise HTTPException(status_code=500, detail="SSO configuration error")

    # Build MSAL confidential client
    authority = f"https://login.microsoftonline.com/{sso_config.tenant_id}"

    app = msal.ConfidentialClientApplication(
        client_id=sso_config.client_id,
        client_credential=client_secret,
        authority=authority
    )

    # Generate redirect URI
    redirect_uri = settings.sso_redirect_uri or f"{settings.backend_url}/api/auth/sso/microsoft/callback"
    # Only include non-reserved scopes (MSAL auto-adds openid, profile, offline_access)
    scopes = ["User.Read", "email"]

    # Generate state parameter with workspace_id for CSRF protection
    import secrets
    import json
    import base64

    state_data = {
        "workspace_id": str(workspace_uuid),
        "nonce": secrets.token_urlsafe(16)
    }
    state = base64.urlsafe_b64encode(json.dumps(state_data).encode()).decode()

    # Build authorization URL
    auth_url = app.get_authorization_request_url(
        scopes=scopes,
        redirect_uri=redirect_uri,
        state=state
    )

    logger.info(f"SSO authorize initiated for workspace {workspace.name}")

    return RedirectResponse(url=auth_url)


@router.get("/sso/microsoft/callback")
async def sso_microsoft_callback(
    code: str,
    state: str,
    db: Session = Depends(get_db)
):
    """
    Handle Microsoft OAuth callback.
    Exchanges authorization code for tokens and logs user in.
    """
    # Decode state to get workspace_id
    import json
    import base64

    try:
        state_data = json.loads(base64.urlsafe_b64decode(state.encode()).decode())
        workspace_id = UUID(state_data["workspace_id"])
    except Exception as e:
        logger.error(f"Invalid state parameter in SSO callback: {e}")
        # Redirect to login with error
        return RedirectResponse(url=f"{settings.frontend_url}/login?error=invalid_state")

    # Get SSO config
    sso_config = db.query(SSOConfig).filter(
        SSOConfig.workspace_id == workspace_id,
        SSOConfig.is_active == True
    ).first()

    if not sso_config:
        logger.error(f"SSO config not found for workspace {workspace_id}")
        return RedirectResponse(url=f"{settings.frontend_url}/login?error=sso_not_configured")

    # Decrypt client secret
    try:
        client_secret = decrypt_secret(sso_config.client_secret_encrypted)
    except Exception as e:
        logger.error(f"Failed to decrypt SSO secret: {e}")
        return RedirectResponse(url=f"{settings.frontend_url}/login?error=sso_config_error")

    # Build MSAL app
    authority = f"https://login.microsoftonline.com/{sso_config.tenant_id}"
    app = msal.ConfidentialClientApplication(
        client_id=sso_config.client_id,
        client_credential=client_secret,
        authority=authority
    )

    # Exchange code for token
    redirect_uri = settings.sso_redirect_uri or f"{settings.backend_url}/api/auth/sso/microsoft/callback"

    try:
        # Only include non-reserved scopes (MSAL auto-adds openid, profile, offline_access)
        result = app.acquire_token_by_authorization_code(
            code=code,
            scopes=["User.Read", "email"],
            redirect_uri=redirect_uri
        )
    except Exception as e:
        logger.error(f"Failed to acquire token: {e}")
        return RedirectResponse(url=f"{settings.frontend_url}/login?error=token_exchange_failed")

    if "error" in result:
        error_desc = result.get("error_description", result.get("error"))
        logger.error(f"OAuth error: {error_desc}")
        return RedirectResponse(url=f"{settings.frontend_url}/login?error=oauth_failed")

    # Get user info from Microsoft Graph
    access_token = result.get("access_token")
    if not access_token:
        logger.error("No access token in OAuth response")
        return RedirectResponse(url=f"{settings.frontend_url}/login?error=no_token")

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://graph.microsoft.com/v1.0/me",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            response.raise_for_status()
            user_info = response.json()
    except Exception as e:
        logger.error(f"Failed to get user info from Microsoft Graph: {e}")
        return RedirectResponse(url=f"{settings.frontend_url}/login?error=graph_api_failed")

    # Extract user data
    email = (user_info.get("mail") or user_info.get("userPrincipalName", "")).lower().strip()
    display_name = user_info.get("displayName", "")
    given_name = user_info.get("givenName", "")
    surname = user_info.get("surname", "")

    if not email:
        logger.error("No email found in Microsoft user profile")
        return RedirectResponse(url=f"{settings.frontend_url}/login?error=no_email")

    # Find or create user
    user = db.query(User).filter(
        User.email == email,
        User.workspace_id == workspace_id
    ).first()

    if not user:
        if not sso_config.auto_provision_users:
            logger.warning(f"User {email} not found and auto-provisioning disabled")
            return RedirectResponse(url=f"{settings.frontend_url}/login?error=user_not_found")

        # Create new user
        user = User(
            email=email,
            name=display_name or f"{given_name} {surname}".strip() or email,
            first_name=given_name,
            last_name=surname,
            workspace_id=workspace_id,
            role=UserRole[sso_config.default_role.upper()],
            can_login=True,
            active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        logger.info(f"Auto-provisioned user {email} via SSO")

    # Check if user can login
    if not user.can_login or not user.active:
        logger.warning(f"User {email} login disabled")
        return RedirectResponse(url=f"{settings.frontend_url}/login?error=access_denied")

    # Generate JWT token
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    token = create_jwt_token(
        user_id=str(user.id),
        email=user.email,
        role=user.role.value,
        workspace_id=str(workspace_id)
    )

    logger.info(f"User {email} logged in via SSO")

    # Redirect to frontend with token
    return RedirectResponse(url=f"{settings.frontend_url}/auth/callback?token={token}")









