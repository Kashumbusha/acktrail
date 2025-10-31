from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text, Enum as SQLEnum, UniqueConstraint, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum
from .database import Base


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    EMPLOYEE = "employee"


class PlanTier(str, enum.Enum):
    SMALL = "small"
    MEDIUM = "medium"
    LARGE = "large"


class AssignmentStatus(str, enum.Enum):
    PENDING = "pending"
    VIEWED = "viewed"
    ACKNOWLEDGED = "acknowledged"
    DECLINED = "declined"


class EmailEventType(str, enum.Enum):
    SEND = "send"
    OPEN = "open"
    BOUNCE = "bounce"
    CLICK = "click"


class AckMethod(str, enum.Enum):
    TYPED = "typed"
    ONECLICK = "oneclick"


class NotificationType(str, enum.Enum):
    POLICY_ASSIGNED = "policy_assigned"
    POLICY_ACKNOWLEDGED = "policy_acknowledged"
    POLICY_OVERDUE = "policy_overdue"
    POLICY_REMINDER = "policy_reminder"
    USER_ADDED = "user_added"
    WORKSPACE_CREATED = "workspace_created"


class Workspace(Base):
    __tablename__ = "workspaces"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False, unique=True)  # Workspace names must be unique
    slug = Column(String(255), nullable=True, unique=True)
    plan = Column(SQLEnum(PlanTier), default=PlanTier.SMALL, nullable=False)
    trial_ends_at = Column(DateTime, nullable=True)  # 7-day free trial for all plans
    sso_enabled = Column(Boolean, default=False, nullable=False)  # SSO addon ($50/month)

    # Stripe subscription fields
    stripe_customer_id = Column(String(255), nullable=True, index=True)  # Stripe customer ID
    stripe_subscription_id = Column(String(255), nullable=True, index=True)  # Active subscription ID
    subscription_status = Column(String(50), nullable=True)  # trialing, active, past_due, canceled, etc.
    subscription_current_period_end = Column(DateTime, nullable=True)  # When current billing period ends

    # Staff count and billing
    staff_count = Column(Integer, default=1, nullable=False)  # Licensed seats purchased (minimum per plan)
    active_staff_count = Column(Integer, default=0, nullable=False)  # Track billable staff users (excludes guests)
    billing_interval = Column(String(20), default="monthly", nullable=False)  # monthly or annual

    # SSO add-on (one-time purchase)
    sso_purchased = Column(Boolean, default=False, nullable=False)  # Has SSO been purchased
    sso_purchased_at = Column(DateTime, nullable=True)  # When SSO was purchased

    # Whitelist - bypass payment requirements
    is_whitelisted = Column(Boolean, default=False, nullable=False)  # Workspace doesn't need payment

    # Onboarding tracking
    onboarding_completed = Column(Boolean, default=False, nullable=False)  # Has user completed full signup flow

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    users = relationship("User", back_populates="workspace")
    policies = relationship("Policy", back_populates="workspace")
    assignments = relationship("Assignment", back_populates="workspace")
    teams = relationship("Team", back_populates="workspace")
    sso_config = relationship("SSOConfig", back_populates="workspace", uselist=False)
    slack_config = relationship("SlackConfig", back_populates="workspace", uselist=False)


class Team(Base):
    __tablename__ = "teams"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    workspace = relationship("Workspace")
    policies = relationship("Policy", back_populates="team")
    assignments = relationship("Assignment", back_populates="team")
    members = relationship("User", back_populates="team", foreign_keys="User.team_id")


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        # Composite unique constraint: same email can exist in different workspaces
        # but not twice in the same workspace
        UniqueConstraint('email', 'workspace_id', name='uix_email_workspace'),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), nullable=False, index=True)  # Removed unique=True
    name = Column(String(255), nullable=False)
    first_name = Column(String(255), nullable=True)
    last_name = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    country = Column(String(100), nullable=True)
    password_hash = Column(String(255), nullable=True)  # Optional password for quick login
    role = Column(SQLEnum(UserRole), default=UserRole.EMPLOYEE, nullable=False)
    department = Column(String(255), nullable=True)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=True)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=True)
    can_login = Column(Boolean, default=True, nullable=False)
    active = Column(Boolean, default=True, nullable=False)
    is_guest = Column(Boolean, default=False, nullable=False)
    is_platform_admin = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    created_policies = relationship("Policy", back_populates="creator", foreign_keys="Policy.created_by")
    assignments = relationship("Assignment", back_populates="user")
    workspace = relationship("Workspace", back_populates="users")
    team = relationship("Team", back_populates="members", foreign_keys=[team_id])


class Policy(Base):
    __tablename__ = "policies"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    body_markdown = Column(Text, nullable=True)
    file_url = Column(String(500), nullable=True)
    content_sha256 = Column(String(64), nullable=False)
    version = Column(Integer, default=1, nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    due_at = Column(DateTime, nullable=True)
    require_typed_signature = Column(Boolean, default=False, nullable=False)
    questions_enabled = Column(Boolean, default=False, nullable=False)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=True)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=True)
    
    creator = relationship("User", back_populates="created_policies", foreign_keys=[created_by])
    assignments = relationship("Assignment", back_populates="policy", cascade="all, delete-orphan")
    workspace = relationship("Workspace", back_populates="policies")
    team = relationship("Team", back_populates="policies")
    questions = relationship("PolicyQuestion", back_populates="policy", cascade="all, delete-orphan", order_by="PolicyQuestion.order_index")


class Assignment(Base):
    __tablename__ = "assignments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    policy_id = Column(UUID(as_uuid=True), ForeignKey("policies.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    status = Column(SQLEnum(AssignmentStatus), default=AssignmentStatus.PENDING, nullable=False)
    viewed_at = Column(DateTime, nullable=True)
    acknowledged_at = Column(DateTime, nullable=True)
    reminder_count = Column(Integer, default=0, nullable=False)
    magic_link_token = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=True)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=True)
    
    policy = relationship("Policy", back_populates="assignments")
    user = relationship("User", back_populates="assignments")
    acknowledgment = relationship("Acknowledgment", back_populates="assignment", uselist=False)
    email_events = relationship("EmailEvent", back_populates="assignment")
    workspace = relationship("Workspace", back_populates="assignments")
    team = relationship("Team", back_populates="assignments")


class Acknowledgment(Base):
    __tablename__ = "acknowledgments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assignment_id = Column(UUID(as_uuid=True), ForeignKey("assignments.id"), unique=True, nullable=False)
    signer_name = Column(String(255), nullable=False)
    signer_email = Column(String(255), nullable=False)
    typed_signature = Column(String(255), nullable=True)  # For typed acknowledgments
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    policy_version = Column(Integer, nullable=False)
    policy_hash_at_ack = Column(String(64), nullable=False)
    ack_method = Column(SQLEnum(AckMethod), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    assignment = relationship("Assignment", back_populates="acknowledgment")


class EmailEvent(Base):
    __tablename__ = "email_events"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assignment_id = Column(UUID(as_uuid=True), ForeignKey("assignments.id"), nullable=False)
    type = Column(SQLEnum(EmailEventType), nullable=False)
    provider_message_id = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    assignment = relationship("Assignment", back_populates="email_events")


class PolicyQuestion(Base):
    __tablename__ = "policy_questions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    policy_id = Column(UUID(as_uuid=True), ForeignKey("policies.id"), nullable=False, index=True)
    order_index = Column(Integer, default=0, nullable=False)
    prompt = Column(Text, nullable=False)
    choices = Column(JSON, nullable=False)  # list[str]
    correct_index = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    policy = relationship("Policy", back_populates="questions")


class AuthCode(Base):
    __tablename__ = "auth_codes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), nullable=False, index=True)
    code = Column(String(6), nullable=False)
    magic_token = Column(String(255), nullable=True)  # Token for magic link login
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False, nullable=False)
    attempts = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False)
    type = Column(SQLEnum(NotificationType), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    link = Column(String(500), nullable=True)  # Optional link to related resource
    read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User")
    workspace = relationship("Workspace")


class DemoRequest(Base):
    __tablename__ = "demo_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, index=True)
    company = Column(String(255), nullable=True)
    role = Column(String(255), nullable=True)
    team_size = Column(String(50), nullable=True)
    country = Column(String(100), nullable=True)
    goal = Column(Text, nullable=False)
    message = Column(Text, nullable=True)
    source = Column(String(100), nullable=True)
    created_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    created_by_user = relationship("User", foreign_keys=[created_by_user_id])
    workspace = relationship("Workspace", foreign_keys=[workspace_id])


class SSOConfig(Base):
    """SSO Configuration for workspace - stores Azure AD OAuth settings"""
    __tablename__ = "sso_configs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False, unique=True)

    # Azure AD OAuth Configuration
    provider = Column(String(50), default="microsoft", nullable=False)  # Future: 'google', 'okta'
    tenant_id = Column(String(255), nullable=False)  # Customer's Azure AD tenant ID
    client_id = Column(String(255), nullable=False)  # Application (client) ID
    client_secret_encrypted = Column(Text, nullable=False)  # Encrypted client secret

    # SSO Settings
    auto_provision_users = Column(Boolean, default=True, nullable=False)  # Auto-create users on first login
    default_role = Column(SQLEnum(UserRole), default=UserRole.EMPLOYEE, nullable=False)  # Role for new users
    enforce_sso = Column(Boolean, default=False, nullable=False)  # Disable password login when true

    # Status and Testing
    is_active = Column(Boolean, default=True, nullable=False)
    last_tested_at = Column(DateTime, nullable=True)
    test_status = Column(String(50), nullable=True)  # 'success', 'failed', 'not_tested'

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    # Relationships
    workspace = relationship("Workspace", back_populates="sso_config")
    creator = relationship("User")


class SlackConfig(Base):
    """Slack Integration Configuration for workspace - stores Slack bot credentials"""
    __tablename__ = "slack_configs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False, unique=True)

    # Slack Configuration
    team_id = Column(String(255), nullable=False, index=True)  # Slack workspace ID
    team_name = Column(String(255), nullable=True)  # Slack workspace name
    bot_token_encrypted = Column(Text, nullable=False)  # Encrypted bot token (xoxb-)
    signing_secret_encrypted = Column(Text, nullable=False)  # Encrypted signing secret for webhooks

    # Sync Settings
    auto_sync_users = Column(Boolean, default=False, nullable=False)  # Auto-sync users periodically
    last_synced_at = Column(DateTime, nullable=True)  # Last user sync timestamp
    sync_status = Column(String(50), nullable=True)  # 'success', 'failed', 'pending'

    # Status
    is_active = Column(Boolean, default=True, nullable=False)

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    # Relationships
    workspace = relationship("Workspace", back_populates="slack_config")
    creator = relationship("User")
