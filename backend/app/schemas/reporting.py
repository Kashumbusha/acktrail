from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel


class PolicySnapshot(BaseModel):
    id: UUID
    title: str
    total_assignments: int = 0
    acknowledged_assignments: int = 0
    pending_assignments: int = 0
    overdue_assignments: int = 0
    acknowledgment_rate: float = 0.0
    due_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


class ReportsSummary(BaseModel):
    generated_at: datetime
    total_policies: int = 0
    active_policies: int = 0
    total_assignments: int = 0
    acknowledged_assignments: int = 0
    pending_assignments: int = 0
    overdue_assignments: int = 0
    acknowledgment_rate: float = 0.0
    top_outstanding_policies: List[PolicySnapshot] = []


class PolicyReportList(BaseModel):
    generated_at: datetime
    policies: List[PolicySnapshot]


class ActivityLogItem(BaseModel):
    id: UUID
    event_type: str
    description: str
    created_at: datetime
    policy_id: Optional[UUID] = None
    policy_title: Optional[str] = None
    actor_id: Optional[UUID] = None
    actor_name: Optional[str] = None


class ActivityLogResponse(BaseModel):
    items: List[ActivityLogItem]
    total: int
    limit: int
    offset: int

