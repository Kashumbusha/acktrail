"""
SSO Configuration API Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from uuid import UUID

from ..core.security import encrypt_secret, decrypt_secret, get_current_user, require_admin_role
from ..models.database import get_db
from ..models.models import User, SSOConfig, Workspace
from ..schemas.sso import SSOConfigCreate, SSOConfigUpdate, SSOConfigResponse, SSOTestResponse


router = APIRouter()


@router.post("/config", response_model=SSOConfigResponse, status_code=status.HTTP_201_CREATED)
async def create_sso_config(
    config: SSOConfigCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_role)
):
    """
    Create SSO configuration for workspace (Admin only).
    Requires workspace to have SSO purchased.
    """
    workspace_id = UUID(current_user["workspace_id"])

    # Check if workspace has SSO purchased
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    if not workspace.sso_purchased and not workspace.is_whitelisted:
        raise HTTPException(
            status_code=403,
            detail="SSO feature not purchased. Please upgrade your plan to enable SSO."
        )

    # Check if config already exists
    existing = db.query(SSOConfig).filter(
        SSOConfig.workspace_id == workspace_id
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="SSO configuration already exists. Use PATCH /api/sso/config to update it."
        )

    # Create config with encrypted secret
    sso_config = SSOConfig(
        workspace_id=workspace_id,
        tenant_id=config.tenant_id,
        client_id=config.client_id,
        client_secret_encrypted=encrypt_secret(config.client_secret),
        auto_provision_users=config.auto_provision_users,
        default_role=config.default_role,
        enforce_sso=config.enforce_sso,
        created_by=UUID(current_user["id"])
    )

    db.add(sso_config)

    # Enable SSO on workspace if not already enabled
    if not workspace.sso_enabled:
        workspace.sso_enabled = True

    db.commit()
    db.refresh(sso_config)

    return sso_config


@router.get("/config", response_model=SSOConfigResponse)
async def get_sso_config(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_role)
):
    """
    Get SSO configuration for workspace (Admin only).
    """
    workspace_id = UUID(current_user["workspace_id"])

    config = db.query(SSOConfig).filter(
        SSOConfig.workspace_id == workspace_id
    ).first()

    if not config:
        raise HTTPException(
            status_code=404,
            detail="SSO not configured for this workspace"
        )

    return config


@router.patch("/config", response_model=SSOConfigResponse)
async def update_sso_config(
    updates: SSOConfigUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_role)
):
    """
    Update SSO configuration for workspace (Admin only).
    """
    workspace_id = UUID(current_user["workspace_id"])

    config = db.query(SSOConfig).filter(
        SSOConfig.workspace_id == workspace_id
    ).first()

    if not config:
        raise HTTPException(
            status_code=404,
            detail="SSO not configured. Use POST /api/sso/config to create it first."
        )

    # Update fields if provided
    if updates.tenant_id is not None:
        config.tenant_id = updates.tenant_id

    if updates.client_id is not None:
        config.client_id = updates.client_id

    if updates.client_secret is not None:
        config.client_secret_encrypted = encrypt_secret(updates.client_secret)

    if updates.auto_provision_users is not None:
        config.auto_provision_users = updates.auto_provision_users

    if updates.default_role is not None:
        config.default_role = updates.default_role

    if updates.enforce_sso is not None:
        config.enforce_sso = updates.enforce_sso

    if updates.is_active is not None:
        config.is_active = updates.is_active

    config.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(config)

    return config


@router.delete("/config", status_code=status.HTTP_204_NO_CONTENT)
async def delete_sso_config(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_role)
):
    """
    Delete SSO configuration for workspace (Admin only).
    """
    workspace_id = UUID(current_user["workspace_id"])

    config = db.query(SSOConfig).filter(
        SSOConfig.workspace_id == workspace_id
    ).first()

    if not config:
        raise HTTPException(
            status_code=404,
            detail="SSO configuration not found"
        )

    # Disable SSO on workspace
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if workspace:
        workspace.sso_enabled = False

    db.delete(config)
    db.commit()

    return None


@router.post("/test", response_model=SSOTestResponse)
async def test_sso_config(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_role)
):
    """
    Test SSO configuration by validating credentials format (Admin only).
    Note: Full OAuth flow test requires actual user login attempt.
    """
    workspace_id = UUID(current_user["workspace_id"])

    config = db.query(SSOConfig).filter(
        SSOConfig.workspace_id == workspace_id
    ).first()

    if not config:
        raise HTTPException(
            status_code=404,
            detail="SSO not configured"
        )

    # Basic validation
    if not config.tenant_id or not config.client_id or not config.client_secret_encrypted:
        config.test_status = "failed"
        config.last_tested_at = datetime.utcnow()
        db.commit()

        return SSOTestResponse(
            status="failed",
            message="Invalid configuration: Missing required fields"
        )

    # Try to decrypt secret to verify it's valid
    try:
        decrypt_secret(config.client_secret_encrypted)
    except Exception as e:
        config.test_status = "failed"
        config.last_tested_at = datetime.utcnow()
        db.commit()

        return SSOTestResponse(
            status="failed",
            message=f"Invalid configuration: Cannot decrypt client secret - {str(e)}"
        )

    # Mark as tested
    config.test_status = "success"
    config.last_tested_at = datetime.utcnow()
    db.commit()

    return SSOTestResponse(
        status="success",
        message="SSO configuration is valid. Test login to verify Azure AD integration."
    )


@router.get("/status")
async def get_sso_status(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Check if SSO is enabled and configured for the workspace.
    Available to all authenticated users.
    """
    workspace_id = UUID(current_user["workspace_id"])

    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    config = db.query(SSOConfig).filter(
        SSOConfig.workspace_id == workspace_id,
        SSOConfig.is_active == True
    ).first()

    return {
        "sso_enabled": workspace.sso_enabled and config is not None,
        "sso_purchased": workspace.sso_purchased,
        "enforce_sso": config.enforce_sso if config else False,
        "provider": config.provider if config else None
    }


@router.get("/status/public")
async def get_public_sso_status(
    workspace_id: str,
    db: Session = Depends(get_db)
):
    """
    Check if SSO is enabled for a workspace (public endpoint for login page).
    Does not require authentication.
    """
    try:
        ws_id = UUID(workspace_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid workspace ID format")

    workspace = db.query(Workspace).filter(Workspace.id == ws_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    config = db.query(SSOConfig).filter(
        SSOConfig.workspace_id == ws_id,
        SSOConfig.is_active == True
    ).first()

    return {
        "sso_enabled": workspace.sso_enabled and config is not None,
        "enforce_sso": config.enforce_sso if config else False,
        "provider": config.provider if config else None
    }
