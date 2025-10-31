"""
Slack Integration API Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from uuid import UUID
import logging
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError

from ..core.security import encrypt_secret, decrypt_secret, get_current_user, require_admin_role
from ..models.database import get_db
from ..models.models import User, SlackConfig, Workspace, UserRole
from ..schemas.slack import (
    SlackConfigCreate,
    SlackConfigUpdate,
    SlackConfigResponse,
    SlackTestResponse,
    SlackUsersResponse,
    SlackUser,
    SlackSyncRequest,
    SlackSyncResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter()


def _get_slack_client(config: SlackConfig) -> WebClient:
    """Helper to create Slack client from config"""
    bot_token = decrypt_secret(config.bot_token_encrypted)
    return WebClient(token=bot_token)


@router.post("/config", response_model=SlackConfigResponse, status_code=status.HTTP_201_CREATED)
async def create_slack_config(
    config: SlackConfigCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_role)
):
    """
    Create Slack configuration for workspace (Admin only).
    Allows admin to paste their Slack app credentials.
    """
    workspace_id = UUID(current_user["workspace_id"])

    # Check if workspace exists
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    # Check if config already exists
    existing = db.query(SlackConfig).filter(
        SlackConfig.workspace_id == workspace_id
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Slack configuration already exists. Use PATCH /api/slack/config to update it."
        )

    # Create config with encrypted secrets
    slack_config = SlackConfig(
        workspace_id=workspace_id,
        team_id=config.team_id,
        team_name=config.team_name,
        bot_token_encrypted=encrypt_secret(config.bot_token),
        signing_secret_encrypted=encrypt_secret(config.signing_secret),
        auto_sync_users=config.auto_sync_users,
        created_by=UUID(current_user["id"])
    )

    db.add(slack_config)
    db.commit()
    db.refresh(slack_config)

    return slack_config


@router.get("/config", response_model=SlackConfigResponse)
async def get_slack_config(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_role)
):
    """
    Get Slack configuration for workspace (Admin only).
    """
    workspace_id = UUID(current_user["workspace_id"])

    config = db.query(SlackConfig).filter(
        SlackConfig.workspace_id == workspace_id
    ).first()

    if not config:
        raise HTTPException(
            status_code=404,
            detail="Slack not configured for this workspace"
        )

    return config


@router.patch("/config", response_model=SlackConfigResponse)
async def update_slack_config(
    updates: SlackConfigUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_role)
):
    """
    Update Slack configuration for workspace (Admin only).
    """
    workspace_id = UUID(current_user["workspace_id"])

    config = db.query(SlackConfig).filter(
        SlackConfig.workspace_id == workspace_id
    ).first()

    if not config:
        raise HTTPException(
            status_code=404,
            detail="Slack not configured. Use POST /api/slack/config to create it first."
        )

    # Update fields if provided
    if updates.team_id is not None:
        config.team_id = updates.team_id

    if updates.team_name is not None:
        config.team_name = updates.team_name

    if updates.bot_token is not None:
        config.bot_token_encrypted = encrypt_secret(updates.bot_token)

    if updates.signing_secret is not None:
        config.signing_secret_encrypted = encrypt_secret(updates.signing_secret)

    if updates.auto_sync_users is not None:
        config.auto_sync_users = updates.auto_sync_users

    if updates.is_active is not None:
        config.is_active = updates.is_active

    config.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(config)

    return config


@router.delete("/config", status_code=status.HTTP_204_NO_CONTENT)
async def delete_slack_config(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_role)
):
    """
    Delete Slack configuration for workspace (Admin only).
    """
    workspace_id = UUID(current_user["workspace_id"])

    config = db.query(SlackConfig).filter(
        SlackConfig.workspace_id == workspace_id
    ).first()

    if not config:
        raise HTTPException(
            status_code=404,
            detail="Slack configuration not found"
        )

    db.delete(config)
    db.commit()

    return None


@router.post("/test", response_model=SlackTestResponse)
async def test_slack_config(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_role)
):
    """
    Test Slack configuration by calling Slack API (Admin only).
    Verifies bot token is valid and retrieves team information.
    """
    workspace_id = UUID(current_user["workspace_id"])

    config = db.query(SlackConfig).filter(
        SlackConfig.workspace_id == workspace_id
    ).first()

    if not config:
        raise HTTPException(
            status_code=404,
            detail="Slack not configured"
        )

    # Try to connect to Slack and get team info
    try:
        client = _get_slack_client(config)
        response = client.team_info()

        if response["ok"]:
            team = response["team"]

            # Update team name if we got it
            if team.get("name") and not config.team_name:
                config.team_name = team["name"]
                db.commit()

            return SlackTestResponse(
                status="success",
                message=f"Successfully connected to Slack workspace: {team.get('name', config.team_id)}",
                team_info={
                    "id": team.get("id"),
                    "name": team.get("name"),
                    "domain": team.get("domain"),
                }
            )
        else:
            return SlackTestResponse(
                status="failed",
                message=f"Slack API error: {response.get('error', 'Unknown error')}"
            )

    except SlackApiError as e:
        logger.error(f"Slack API error: {e.response['error']}")
        return SlackTestResponse(
            status="failed",
            message=f"Slack API error: {e.response['error']}"
        )
    except Exception as e:
        logger.error(f"Error testing Slack config: {str(e)}")
        return SlackTestResponse(
            status="failed",
            message=f"Error testing Slack connection: {str(e)}"
        )


@router.get("/status")
async def get_slack_status(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Check if Slack is configured for the workspace.
    Available to all authenticated users.
    """
    workspace_id = UUID(current_user["workspace_id"])

    config = db.query(SlackConfig).filter(
        SlackConfig.workspace_id == workspace_id,
        SlackConfig.is_active == True
    ).first()

    return {
        "slack_configured": config is not None,
        "team_name": config.team_name if config else None,
        "last_synced_at": config.last_synced_at if config else None,
        "auto_sync_enabled": config.auto_sync_users if config else False,
    }


@router.get("/users", response_model=SlackUsersResponse)
async def list_slack_users(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_role)
):
    """
    List all users from Slack workspace (Admin only).
    Does not create/update users in database.
    """
    workspace_id = UUID(current_user["workspace_id"])

    config = db.query(SlackConfig).filter(
        SlackConfig.workspace_id == workspace_id
    ).first()

    if not config:
        raise HTTPException(
            status_code=404,
            detail="Slack not configured"
        )

    try:
        client = _get_slack_client(config)
        response = client.users_list()

        if not response["ok"]:
            raise HTTPException(
                status_code=500,
                detail=f"Slack API error: {response.get('error', 'Unknown error')}"
            )

        members = response["members"]
        slack_users = []

        for member in members:
            # Skip bots and deleted users
            if member.get("is_bot") or member.get("deleted"):
                continue

            profile = member.get("profile", {})
            slack_users.append(SlackUser(
                id=member["id"],
                team_id=member["team_id"],
                name=member.get("name", ""),
                real_name=member.get("real_name") or profile.get("real_name"),
                email=profile.get("email"),
                is_admin=member.get("is_admin", False),
                is_bot=member.get("is_bot", False),
                is_deleted=member.get("deleted", False),
                profile_image=profile.get("image_192"),
            ))

        return SlackUsersResponse(
            users=slack_users,
            total=len(slack_users)
        )

    except SlackApiError as e:
        logger.error(f"Slack API error: {e.response['error']}")
        raise HTTPException(
            status_code=500,
            detail=f"Slack API error: {e.response['error']}"
        )
    except Exception as e:
        logger.error(f"Error listing Slack users: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error listing Slack users: {str(e)}"
        )


@router.post("/sync-users", response_model=SlackSyncResponse)
async def sync_slack_users(
    sync_request: SlackSyncRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_role)
):
    """
    Sync users from Slack to database (Admin only).
    Creates new users and optionally updates existing ones.
    """
    workspace_id = UUID(current_user["workspace_id"])

    config = db.query(SlackConfig).filter(
        SlackConfig.workspace_id == workspace_id
    ).first()

    if not config:
        raise HTTPException(
            status_code=404,
            detail="Slack not configured"
        )

    try:
        # Fetch users from Slack
        client = _get_slack_client(config)
        response = client.users_list()

        if not response["ok"]:
            return SlackSyncResponse(
                status="failed",
                message=f"Slack API error: {response.get('error', 'Unknown error')}",
            )

        members = response["members"]
        users_created = 0
        users_updated = 0
        users_skipped = 0
        errors = []

        for member in members:
            # Skip bots, deleted users, and users without email
            if member.get("is_bot") or member.get("deleted"):
                users_skipped += 1
                continue

            profile = member.get("profile", {})
            email = profile.get("email")

            if not email:
                users_skipped += 1
                errors.append(f"Skipped {member.get('name', 'unknown')}: No email")
                continue

            # Check if user exists
            existing_user = db.query(User).filter(
                User.email == email,
                User.workspace_id == workspace_id
            ).first()

            if existing_user:
                if sync_request.update_existing:
                    # Update user profile
                    existing_user.name = member.get("real_name") or profile.get("real_name") or existing_user.name
                    users_updated += 1
                else:
                    users_skipped += 1
            else:
                if sync_request.create_new_users:
                    # Create new user
                    new_user = User(
                        email=email,
                        name=member.get("real_name") or profile.get("real_name") or email,
                        workspace_id=workspace_id,
                        role=UserRole.ADMIN if member.get("is_admin") else UserRole(sync_request.default_role),
                    )
                    db.add(new_user)
                    users_created += 1
                else:
                    users_skipped += 1

        # Update sync status
        config.last_synced_at = datetime.utcnow()
        config.sync_status = "success"

        db.commit()

        return SlackSyncResponse(
            status="success",
            message=f"Synced {users_created + users_updated} users from Slack",
            users_created=users_created,
            users_updated=users_updated,
            users_skipped=users_skipped,
            errors=errors,
        )

    except SlackApiError as e:
        logger.error(f"Slack API error: {e.response['error']}")
        config.sync_status = "failed"
        db.commit()

        return SlackSyncResponse(
            status="failed",
            message=f"Slack API error: {e.response['error']}",
            errors=[str(e)]
        )
    except Exception as e:
        logger.error(f"Error syncing Slack users: {str(e)}")
        config.sync_status = "failed"
        db.commit()

        return SlackSyncResponse(
            status="failed",
            message=f"Error syncing users: {str(e)}",
            errors=[str(e)]
        )
