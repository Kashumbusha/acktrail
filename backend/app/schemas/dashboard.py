from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from uuid import UUID


class DashboardStats(BaseModel):
    total_policies: int = 0
    active_policies: int = 0
    total_users: int = 0
    total_assignments: int = 0
    pending_assignments: int = 0
    acknowledged_assignments: int = 0
    overdue_assignments: int = 0
    acknowledgment_rate: float = 0.0  # Percentage


class RecentActivity(BaseModel):
    id: UUID
    type: str  # "policy_created", "assignment_sent", "acknowledgment_received"
    description: str
    created_at: datetime
    user_name: Optional[str] = None
    policy_title: Optional[str] = None


class DashboardResponse(BaseModel):
    stats: DashboardStats
    recent_activity: List[RecentActivity]


class PolicyExportRow(BaseModel):
    assignment_id: str
    user_name: str
    user_email: str
    user_department: str
    status: str
    assigned_at: datetime
    viewed_at: Optional[datetime]
    acknowledged_at: Optional[datetime]
    reminder_count: int
    signer_name: Optional[str] = None
    signer_email: Optional[str] = None
    acknowledgment_method: Optional[str] = None
    ip_address: Optional[str] = None