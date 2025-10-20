"""
SSO Configuration Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID


class SSOConfigCreate(BaseModel):
    """Schema for creating SSO configuration"""
    tenant_id: str = Field(..., description="Azure AD Tenant ID")
    client_id: str = Field(..., description="Application (client) ID")
    client_secret: str = Field(..., description="Client secret value")
    auto_provision_users: bool = Field(default=True, description="Auto-create users on first SSO login")
    default_role: str = Field(default="employee", description="Default role for new users (admin or employee)")
    enforce_sso: bool = Field(default=False, description="Disable password login and enforce SSO only")


class SSOConfigUpdate(BaseModel):
    """Schema for updating SSO configuration"""
    tenant_id: Optional[str] = Field(None, description="Azure AD Tenant ID")
    client_id: Optional[str] = Field(None, description="Application (client) ID")
    client_secret: Optional[str] = Field(None, description="Client secret value (only if changing)")
    auto_provision_users: Optional[bool] = Field(None, description="Auto-create users on first SSO login")
    default_role: Optional[str] = Field(None, description="Default role for new users")
    enforce_sso: Optional[bool] = Field(None, description="Disable password login and enforce SSO only")
    is_active: Optional[bool] = Field(None, description="Enable or disable SSO")


class SSOConfigResponse(BaseModel):
    """Schema for SSO configuration response"""
    id: UUID
    workspace_id: UUID
    provider: str
    tenant_id: str
    client_id: str
    # Do NOT return client_secret for security
    auto_provision_users: bool
    default_role: str
    enforce_sso: bool
    is_active: bool
    last_tested_at: Optional[datetime] = None
    test_status: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SSOTestResponse(BaseModel):
    """Schema for SSO test response"""
    status: str = Field(..., description="Test status: success or failed")
    message: str = Field(..., description="Test result message")
