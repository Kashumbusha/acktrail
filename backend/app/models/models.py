from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum
from .database import Base


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    EMPLOYEE = "employee"


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


class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole), default=UserRole.EMPLOYEE, nullable=False)
    department = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    created_policies = relationship("Policy", back_populates="creator", foreign_keys="Policy.created_by")
    assignments = relationship("Assignment", back_populates="user")


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
    
    creator = relationship("User", back_populates="created_policies", foreign_keys=[created_by])
    assignments = relationship("Assignment", back_populates="policy", cascade="all, delete-orphan")


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
    
    policy = relationship("Policy", back_populates="assignments")
    user = relationship("User", back_populates="assignments")
    acknowledgment = relationship("Acknowledgment", back_populates="assignment", uselist=False)
    email_events = relationship("EmailEvent", back_populates="assignment")


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


class AuthCode(Base):
    __tablename__ = "auth_codes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), nullable=False, index=True)
    code = Column(String(6), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False, nullable=False)
    attempts = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)