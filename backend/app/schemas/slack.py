"""
Slack Integration Configuration Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID


class SlackConfigCreate(BaseModel):
    """Schema for creating Slack configuration"""
    team_id: str = Field(..., description="Slack Team/Workspace ID")
    team_name: Optional[str] = Field(None, description="Slack Team/Workspace Name")
    bot_token: str = Field(..., description="Bot User OAuth Token (xoxb-...)")
    signing_secret: str = Field(..., description="Signing secret for webhook verification")
    auto_sync_users: bool = Field(default=False, description="Automatically sync users periodically")


class SlackConfigUpdate(BaseModel):
    """Schema for updating Slack configuration"""
    team_id: Optional[str] = Field(None, description="Slack Team/Workspace ID")
    team_name: Optional[str] = Field(None, description="Slack Team/Workspace Name")
    bot_token: Optional[str] = Field(None, description="Bot User OAuth Token (only if changing)")
    signing_secret: Optional[str] = Field(None, description="Signing secret (only if changing)")
    auto_sync_users: Optional[bool] = Field(None, description="Automatically sync users periodically")
    is_active: Optional[bool] = Field(None, description="Enable or disable Slack integration")


class SlackConfigResponse(BaseModel):
    """Schema for Slack configuration response"""
    id: UUID
    workspace_id: UUID
    team_id: str
    team_name: Optional[str] = None
    # Do NOT return bot_token or signing_secret for security
    auto_sync_users: bool
    last_synced_at: Optional[datetime] = None
    sync_status: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SlackTestResponse(BaseModel):
    """Schema for Slack connection test response"""
    status: str = Field(..., description="Test status: success or failed")
    message: str = Field(..., description="Test result message")
    team_info: Optional[dict] = Field(None, description="Slack team information if successful")


class SlackUser(BaseModel):
    """Schema for Slack user data"""
    id: str
    team_id: str
    name: str
    real_name: Optional[str] = None
    email: Optional[str] = None
    is_admin: bool = False
    is_bot: bool = False
    is_deleted: bool = False
    profile_image: Optional[str] = None


class SlackUsersResponse(BaseModel):
    """Schema for Slack users list response"""
    users: list[SlackUser]
    total: int


class SlackSyncRequest(BaseModel):
    """Schema for Slack user sync request"""
    create_new_users: bool = Field(default=True, description="Create new users for Slack members not in system")
    update_existing: bool = Field(default=True, description="Update existing user profiles with Slack data")
    default_role: str = Field(default="employee", description="Default role for new users")


class SlackSyncResponse(BaseModel):
    """Schema for Slack user sync response"""
    status: str
    message: str
    users_created: int = 0
    users_updated: int = 0
    users_skipped: int = 0
    errors: list[str] = []
