import time
import secrets
from typing import Dict, Tuple, Optional
from datetime import datetime, timedelta
from uuid import UUID
import jwt
import bcrypt
from fastapi import HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Depends
from sqlalchemy.orm import Session
from cryptography.fernet import Fernet

from .config import settings


_CODES_STORE: Dict[str, Tuple[str, float]] = {}
security = HTTPBearer()


def generate_six_digit_code() -> str:
    """Generate a 6-digit numeric code for email authentication."""
    return f"{secrets.randbelow(1_000_000):06d}"


def generate_magic_link_token() -> str:
    """Generate a secure token for magic links."""
    return secrets.token_urlsafe(32)


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a password against a hash."""
    return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))


def store_login_code(email: str, code: str, ttl_seconds: int = 600) -> None:
    """Store a login code in memory with TTL."""
    expires_at = time.time() + ttl_seconds
    _CODES_STORE[email.lower()] = (code, expires_at)


def verify_login_code(email: str, code: str) -> bool:
    """Verify a login code and remove it after use."""
    key = email.lower()
    entry = _CODES_STORE.get(key)
    if not entry:
        return False
    stored_code, expires_at = entry
    if time.time() > expires_at:
        _CODES_STORE.pop(key, None)
        return False
    if stored_code != code:
        return False
    # single-use
    _CODES_STORE.pop(key, None)
    return True


def create_jwt_token(
    user_id: str,
    email: str,
    role: str = "employee",
    workspace_id: Optional[str] = None,
    expire_days: Optional[int] = None
) -> str:
    """Create a JWT token for user authentication."""
    if expire_days is None:
        expire_days = settings.jwt_expire_days
    
    now = datetime.utcnow()
    exp = now + timedelta(days=expire_days)
    
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "workspace_id": workspace_id,
        "iat": now.timestamp(),
        "exp": exp.timestamp(),
        "type": "access"
    }
    
    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return token


def create_magic_link_token(
    assignment_id: str,
    user_email: str,
    expire_days: Optional[int] = None
) -> str:
    """Create a JWT token for magic link acknowledgment."""
    if expire_days is None:
        expire_days = settings.magic_link_expire_days
    
    now = datetime.utcnow()
    exp = now + timedelta(days=expire_days)
    
    payload = {
        "assignment_id": assignment_id,
        "user_email": user_email,
        "iat": now.timestamp(),
        "exp": exp.timestamp(),
        "type": "magic_link"
    }
    
    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return token


def decode_jwt_token(token: str) -> dict:
    """Decode and verify a JWT token."""
    try:
        payload = jwt.decode(
            token, 
            settings.jwt_secret, 
            algorithms=[settings.jwt_algorithm]
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )


def decode_magic_link_token(token: str) -> dict:
    """Decode and verify a magic link token."""
    try:
        payload = jwt.decode(
            token, 
            settings.jwt_secret, 
            algorithms=[settings.jwt_algorithm]
        )
        
        if payload.get("type") != "magic_link":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type"
            )
        
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Magic link has expired"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid magic link"
        )


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """Get current user from JWT token."""
    token = credentials.credentials
    payload = decode_jwt_token(token)
    
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type"
        )
    
    # Import here to avoid circular imports
    from app.models.database import get_db
    from app.models.models import User, Workspace
    from uuid import UUID
    from sqlalchemy.orm import joinedload

    # Get a database session
    db_gen = get_db()
    db = next(db_gen)
    try:
        # Convert string UUID to UUID object
        user_id = UUID(payload["sub"])
        # Eagerly load workspace relationship to avoid DetachedInstanceError
        user = db.query(User).options(joinedload(User.workspace)).filter(User.id == user_id).first()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )

        # Access workspace while session is still active
        workspace = user.workspace if hasattr(user, 'workspace') else None
        workspace_name = workspace.name if workspace else None
    finally:
        db_gen.close()

    current_user = {
        "id": str(user.id),
        "email": user.email,
        "name": user.name,
        "first_name": getattr(user, 'first_name', None),
        "last_name": getattr(user, 'last_name', None),
        "phone": getattr(user, 'phone', None),
        "country": getattr(user, 'country', None),
        "role": user.role.value,
        "workspace_id": str(user.workspace_id) if getattr(user, 'workspace_id', None) else None,
        "workspace_name": workspace_name,
        "is_platform_admin": bool(getattr(user, 'is_platform_admin', False)),
        "department": user.department,
        "created_at": user.created_at.isoformat()
    }

    return current_user


def require_admin_role(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(lambda: next(get_db()))
) -> dict:
    """Require admin role AND active subscription for endpoint access."""
    # First check admin role
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    # Then check subscription
    from app.models.models import Workspace
    from uuid import UUID

    workspace_id = current_user.get("workspace_id")
    if workspace_id:
        workspace = db.query(Workspace).filter(Workspace.id == UUID(workspace_id)).first()
        if workspace and not has_valid_subscription(workspace):
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail="Your trial has expired. Please subscribe to continue using AckTrail."
            )

    return current_user


def require_platform_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """Require platform admin role for endpoint access."""
    if not current_user.get("is_platform_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Platform admin access required"
        )
    return current_user


# SSO Encryption utilities
def get_encryption_key() -> bytes:
    """Get or generate encryption key for SSO secrets."""
    key = settings.sso_encryption_key
    if not key:
        # Generate a key for development, but production should set this in env
        key = Fernet.generate_key().decode()
        print(f"WARNING: No SSO_ENCRYPTION_KEY set. Generated temporary key: {key}")
        print("Add this to your .env file: SSO_ENCRYPTION_KEY=" + key)
    return key.encode() if isinstance(key, str) else key


def encrypt_secret(secret: str) -> str:
    """Encrypt SSO client secret for storage."""
    f = Fernet(get_encryption_key())
    return f.encrypt(secret.encode()).decode()


def decrypt_secret(encrypted: str) -> str:
    """Decrypt SSO client secret from storage."""
    f = Fernet(get_encryption_key())
    return f.decrypt(encrypted.encode()).decode()


def has_valid_subscription(workspace) -> bool:
    """Check if workspace has valid access (active subscription, trial, or whitelisted)."""
    from datetime import datetime

    # Whitelisted workspaces always have access
    if workspace.is_whitelisted:
        return True

    # Check if trial is still active
    if workspace.trial_ends_at and workspace.trial_ends_at > datetime.utcnow():
        return True

    # Check if subscription is active
    if workspace.subscription_status in ['trialing', 'active']:
        return True

    return False


def require_active_subscription(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(lambda: next(get_db()))
) -> dict:
    """Require active subscription or trial for endpoint access (for any authenticated user)."""
    from app.models.models import Workspace
    from uuid import UUID

    workspace_id = current_user.get("workspace_id")
    if not workspace_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No workspace associated with this user"
        )

    workspace = db.query(Workspace).filter(Workspace.id == UUID(workspace_id)).first()
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found"
        )

    if not has_valid_subscription(workspace):
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Your trial has expired. Please subscribe to continue using AckTrail."
        )

    return current_user


def get_current_user_with_subscription(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """Get current user and verify they have active subscription."""
    current_user = get_current_user(credentials)

    # Import here to avoid circular imports
    from app.models.database import get_db
    from app.models.models import Workspace
    from uuid import UUID

    workspace_id = current_user.get("workspace_id")
    if workspace_id:
        db_gen = get_db()
        db = next(db_gen)
        try:
            workspace = db.query(Workspace).filter(Workspace.id == UUID(workspace_id)).first()
            if workspace and not has_valid_subscription(workspace):
                raise HTTPException(
                    status_code=status.HTTP_402_PAYMENT_REQUIRED,
                    detail="Your trial has expired. Please subscribe to continue using AckTrail."
                )
        finally:
            db_gen.close()

    return current_user










