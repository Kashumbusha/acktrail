from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from typing import List
from uuid import UUID
from datetime import datetime, timedelta
import logging
import csv
from io import StringIO

from ..schemas.dashboard import DashboardStats, RecentActivity, DashboardResponse, PolicyExportRow, RecentPolicyItem
from ..models.database import get_db
from ..models.models import (
    Policy, User, Assignment, Acknowledgment, AssignmentStatus, AckMethod, Workspace, UserRole
)
from ..core.security import get_current_user, require_admin_role

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardResponse)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_role)
) -> DashboardResponse:
    """Get dashboard statistics and recent activity. (Admin only)"""

    # Get workspace_id from current user
    workspace_id = UUID(current_user["workspace_id"]) if current_user.get("workspace_id") else None

    # Basic counts - filtered by workspace
    total_policies = db.query(Policy).filter(
        Policy.workspace_id == workspace_id if workspace_id else True
    ).count()

    total_users = db.query(User).filter(
        User.workspace_id == workspace_id if workspace_id else True
    ).count()

    total_assignments = db.query(Assignment).filter(
        Assignment.workspace_id == workspace_id if workspace_id else True
    ).count()

    # Assignment status counts - filtered by workspace
    pending_assignments = db.query(Assignment).filter(
        Assignment.workspace_id == workspace_id if workspace_id else True,
        Assignment.status == AssignmentStatus.PENDING
    ).count()

    acknowledged_assignments = db.query(Assignment).filter(
        Assignment.workspace_id == workspace_id if workspace_id else True,
        Assignment.status == AssignmentStatus.ACKNOWLEDGED
    ).count()

    # Overdue assignments (past due date and not acknowledged) - filtered by workspace
    overdue_assignments = db.query(Assignment).join(Policy).filter(
        Assignment.workspace_id == workspace_id if workspace_id else True,
        Assignment.status.in_([AssignmentStatus.PENDING, AssignmentStatus.VIEWED]),
        Policy.due_at < datetime.utcnow()
    ).count()

    # Calculate acknowledgment rate
    acknowledgment_rate = 0.0
    if total_assignments > 0:
        acknowledgment_rate = (acknowledged_assignments / total_assignments) * 100

    # Count active policies (policies with pending assignments) - filtered by workspace
    active_policies = db.query(Policy).join(Assignment).filter(
        Policy.workspace_id == workspace_id if workspace_id else True,
        Assignment.status.in_([AssignmentStatus.PENDING, AssignmentStatus.VIEWED])
    ).distinct().count()
    
    workspace = None
    licensed_seats = None
    used_seats = None
    available_seats = None
    admin_count = None
    admin_limit = None
    sso_enabled = None

    if workspace_id:
        workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
        if workspace:
            # Employee seat info (admins don't count towards these)
            licensed_seats = workspace.staff_count
            used_seats = workspace.active_staff_count
            available_seats = max((workspace.staff_count or 0) - (workspace.active_staff_count or 0), 0)

            # Admin info
            admin_count = db.query(User).filter(
                User.workspace_id == workspace_id,
                User.role == UserRole.ADMIN,
                User.active == True
            ).count()

            # Admin limits per plan
            admin_limits = {
                "small": 1,
                "medium": 2,
                "large": 5
            }
            plan_tier = workspace.plan.value if workspace.plan else "small"
            admin_limit = admin_limits.get(plan_tier, 1)

            sso_enabled = workspace.sso_enabled or workspace.sso_purchased

    stats = DashboardStats(
        total_policies=total_policies,
        active_policies=active_policies,
        total_users=total_users,
        total_assignments=total_assignments,
        pending_assignments=pending_assignments,
        acknowledged_assignments=acknowledged_assignments,
        overdue_assignments=overdue_assignments,
        acknowledgment_rate=round(acknowledgment_rate, 1),
        seat_capacity=licensed_seats,
        seat_usage=used_seats,
        seat_available=available_seats,
        admin_count=admin_count,
        admin_limit=admin_limit,
        sso_enabled=sso_enabled
    )
    
    # Get recent activity (last 10 items) - filtered by workspace
    recent_activity = []

    # Recent policy creations - filtered by workspace
    recent_policies = db.query(Policy).filter(
        Policy.workspace_id == workspace_id if workspace_id else True
    ).order_by(Policy.created_at.desc()).limit(5).all()

    for policy in recent_policies:
        creator = db.query(User).filter(User.id == policy.created_by).first()
        recent_activity.append(RecentActivity(
            id=policy.id,
            type="policy_created",
            description=f"Policy '{policy.title}' was created",
            created_at=policy.created_at,
            user_name=creator.name if creator else "Unknown",
            policy_title=policy.title
        ))

    # Recent acknowledgments - filtered by workspace through assignments
    recent_acknowledgments = db.query(Acknowledgment).join(Assignment).filter(
        Assignment.workspace_id == workspace_id if workspace_id else True
    ).order_by(Acknowledgment.created_at.desc()).limit(5).all()

    for ack in recent_acknowledgments:
        assignment = db.query(Assignment).filter(Assignment.id == ack.assignment_id).first()
        if assignment:
            policy = db.query(Policy).filter(Policy.id == assignment.policy_id).first()
            user = db.query(User).filter(User.id == assignment.user_id).first()

            if policy and user:
                recent_activity.append(RecentActivity(
                    id=ack.id,
                    type="acknowledgment_received",
                    description=f"Policy '{policy.title}' was acknowledged by {user.name}",
                    created_at=ack.created_at,
                    user_name=user.name,
                    policy_title=policy.title
                ))

    # Recent assignment sends - filtered by workspace
    recent_assignments = db.query(Assignment).filter(
        Assignment.workspace_id == workspace_id if workspace_id else True
    ).order_by(Assignment.created_at.desc()).limit(5).all()

    for assignment in recent_assignments:
        policy = db.query(Policy).filter(Policy.id == assignment.policy_id).first()
        user = db.query(User).filter(User.id == assignment.user_id).first()

        if policy and user:
            recent_activity.append(RecentActivity(
                id=assignment.id,
                type="assignment_sent",
                description=f"Policy '{policy.title}' was assigned to {user.name}",
                created_at=assignment.created_at,
                user_name=user.name,
                policy_title=policy.title
            ))

    # Sort all recent activity by date and limit to 10
    recent_activity.sort(key=lambda x: x.created_at, reverse=True)
    recent_activity = recent_activity[:10]

    # Get recent policies with assignment stats - filtered by workspace
    recent_policies_data = []
    recent_policies_query = db.query(Policy).filter(
        Policy.workspace_id == workspace_id if workspace_id else True
    ).order_by(Policy.created_at.desc()).limit(5).all()

    for policy in recent_policies_query:
        # Get assignment counts for this policy - filtered by workspace
        assignments_count = db.query(Assignment).filter(
            Assignment.policy_id == policy.id,
            Assignment.workspace_id == workspace_id if workspace_id else True
        ).count()
        acknowledged_count = db.query(Assignment).filter(
            Assignment.policy_id == policy.id,
            Assignment.workspace_id == workspace_id if workspace_id else True,
            Assignment.status == AssignmentStatus.ACKNOWLEDGED
        ).count()

        recent_policies_data.append(RecentPolicyItem(
            id=policy.id,
            title=policy.title,
            description=None,  # Policy model doesn't have description field
            assignments_count=assignments_count,
            acknowledged_count=acknowledged_count,
            created_at=policy.created_at
        ))

    return DashboardResponse(
        stats=stats,
        recent_activity=recent_activity,
        recent_policies=recent_policies_data
    )


@router.get("/policies/{policy_id}/export.csv")
def export_policy_assignments(
    policy_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_role)
) -> Response:
    """Export policy assignments to CSV."""

    # Get workspace_id from current user
    workspace_id = UUID(current_user["workspace_id"]) if current_user.get("workspace_id") else None

    # Check if policy exists and belongs to user's workspace
    policy = db.query(Policy).filter(
        Policy.id == policy_id,
        Policy.workspace_id == workspace_id if workspace_id else True
    ).first()
    if not policy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Policy not found"
        )

    # Get all assignments for this policy with related data - filtered by workspace
    assignments = db.query(Assignment).filter(
        Assignment.policy_id == policy_id,
        Assignment.workspace_id == workspace_id if workspace_id else True
    ).all()
    
    if not assignments:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No assignments found for this policy"
        )
    
    # Prepare CSV data
    csv_rows = []
    
    for assignment in assignments:
        # Get user details
        user = db.query(User).filter(User.id == assignment.user_id).first()
        if not user:
            continue
        
        # Get acknowledgment details if exists
        acknowledgment = None
        if assignment.status == AssignmentStatus.ACKNOWLEDGED:
            acknowledgment = db.query(Acknowledgment).filter(
                Acknowledgment.assignment_id == assignment.id
            ).first()
        
        # Create export row
        row = PolicyExportRow(
            assignment_id=str(assignment.id),
            user_name=user.name,
            user_email=user.email,
            user_department=user.department or "",
            status=assignment.status.value,
            assigned_at=assignment.created_at,
            viewed_at=assignment.viewed_at,
            acknowledged_at=assignment.acknowledged_at,
            reminder_count=assignment.reminder_count,
            signer_name=acknowledgment.signer_name if acknowledgment else None,
            signer_email=acknowledgment.signer_email if acknowledgment else None,
            acknowledgment_method=acknowledgment.ack_method.value if acknowledgment else None,
            ip_address=acknowledgment.ip_address if acknowledgment else None
        )
        csv_rows.append(row)
    
    # Generate CSV content
    output = StringIO()
    writer = csv.writer(output)
    
    # Write header with proper column names as requested
    headers = [
        "policy_title", "version", "employee_name", "email", "department", 
        "status", "viewed_at", "acknowledged_at", "reminder_count",
        "assignment_id", "signer_name", "signer_email", "acknowledgment_method", 
        "ip_address", "assigned_at"
    ]
    writer.writerow(headers)
    
    # Write data rows with proper column order
    for row in csv_rows:
        writer.writerow([
            policy.title,  # policy_title
            policy.version,  # version
            row.user_name,  # employee_name
            row.user_email,  # email
            row.user_department,  # department
            row.status,  # status
            row.viewed_at.isoformat() if row.viewed_at else "",  # viewed_at
            row.acknowledged_at.isoformat() if row.acknowledged_at else "",  # acknowledged_at
            row.reminder_count,  # reminder_count
            row.assignment_id,  # assignment_id
            row.signer_name or "",  # signer_name
            row.signer_email or "",  # signer_email
            row.acknowledgment_method or "",  # acknowledgment_method
            row.ip_address or "",  # ip_address
            row.assigned_at.isoformat() if row.assigned_at else ""  # assigned_at
        ])
    
    # Create response
    csv_content = output.getvalue()
    output.close()
    
    # Generate filename with policy title and timestamp
    safe_title = "".join(c for c in policy.title if c.isalnum() or c in (' ', '-', '_')).rstrip()
    safe_title = safe_title.replace(' ', '_')
    timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
    filename = f"policy_assignments_{safe_title}_{timestamp}.csv"
    
    logger.info(f"Exported {len(csv_rows)} assignments for policy {policy.title}")
    
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/workspace/export.csv")
def export_all_workspace_data(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_role)
) -> Response:
    """Export all workspace data (all policies, all assignments, all users) to CSV. Admin only."""

    # Get workspace_id from current user
    workspace_id = UUID(current_user["workspace_id"]) if current_user.get("workspace_id") else None

    # Get all assignments for this workspace with related data
    assignments = db.query(Assignment).filter(
        Assignment.workspace_id == workspace_id if workspace_id else True
    ).order_by(Assignment.created_at.desc()).all()

    if not assignments:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No data found for export"
        )

    # Prepare CSV data
    output = StringIO()
    writer = csv.writer(output)

    # Write header with comprehensive columns
    headers = [
        "policy_title", "policy_version", "policy_due_at", "policy_created_at",
        "employee_name", "employee_email", "employee_department", "employee_role",
        "status", "assigned_at", "viewed_at", "acknowledged_at", "reminder_count",
        "assignment_id", "signer_name", "signer_email", "acknowledgment_method",
        "ip_address", "is_overdue"
    ]
    writer.writerow(headers)

    # Write data rows
    for assignment in assignments:
        # Get policy details
        policy = db.query(Policy).filter(Policy.id == assignment.policy_id).first()
        if not policy:
            continue

        # Get user details
        user = db.query(User).filter(User.id == assignment.user_id).first()
        if not user:
            continue

        # Get acknowledgment details if exists
        acknowledgment = None
        if assignment.status == AssignmentStatus.ACKNOWLEDGED:
            acknowledgment = db.query(Acknowledgment).filter(
                Acknowledgment.assignment_id == assignment.id
            ).first()

        # Calculate if overdue
        is_overdue = False
        if policy.due_at and assignment.status in [AssignmentStatus.PENDING, AssignmentStatus.VIEWED]:
            is_overdue = policy.due_at < datetime.utcnow()

        writer.writerow([
            policy.title,  # policy_title
            policy.version,  # policy_version
            policy.due_at.isoformat() if policy.due_at else "",  # policy_due_at
            policy.created_at.isoformat() if policy.created_at else "",  # policy_created_at
            user.name,  # employee_name
            user.email,  # employee_email
            user.department or "",  # employee_department
            user.role.value if user.role else "",  # employee_role
            assignment.status.value,  # status
            assignment.created_at.isoformat() if assignment.created_at else "",  # assigned_at
            assignment.viewed_at.isoformat() if assignment.viewed_at else "",  # viewed_at
            assignment.acknowledged_at.isoformat() if assignment.acknowledged_at else "",  # acknowledged_at
            assignment.reminder_count,  # reminder_count
            str(assignment.id),  # assignment_id
            acknowledgment.signer_name if acknowledgment else "",  # signer_name
            acknowledgment.signer_email if acknowledgment else "",  # signer_email
            acknowledgment.ack_method.value if acknowledgment else "",  # acknowledgment_method
            acknowledgment.ip_address if acknowledgment else "",  # ip_address
            "Yes" if is_overdue else "No"  # is_overdue
        ])

    # Create response
    csv_content = output.getvalue()
    output.close()

    # Get workspace name for filename
    workspace_name = "workspace"
    if workspace_id:
        workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
        if workspace and workspace.name:
            workspace_name = "".join(c for c in workspace.name if c.isalnum() or c in (' ', '-', '_')).rstrip()
            workspace_name = workspace_name.replace(' ', '_')

    timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
    filename = f"workspace_data_{workspace_name}_{timestamp}.csv"

    logger.info(f"Exported {len(assignments)} assignments from workspace")

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/policies/export.csv")
def export_all_policies_summary(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_role)
) -> Response:
    """Export summary of all policies to CSV."""

    # Get workspace_id from current user
    workspace_id = UUID(current_user["workspace_id"]) if current_user.get("workspace_id") else None

    # Get all policies with stats - filtered by workspace
    policies = db.query(Policy).filter(
        Policy.workspace_id == workspace_id if workspace_id else True
    ).all()

    if not policies:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No policies found"
        )

    # Prepare CSV data
    output = StringIO()
    writer = csv.writer(output)

    # Write header
    headers = [
        "Policy ID", "Title", "Version", "Created At", "Created By", "Due At",
        "Requires Typed Signature", "Total Assignments", "Pending", "Viewed",
        "Acknowledged", "Declined", "Overdue", "Acknowledgment Rate %"
    ]
    writer.writerow(headers)

    # Write data rows
    for policy in policies:
        # Get creator
        creator = db.query(User).filter(User.id == policy.created_by).first()

        # Get assignment stats
        assignment_stats = db.query(
            func.count(Assignment.id).label('total'),
            func.sum(func.case([(Assignment.status == AssignmentStatus.PENDING, 1)], else_=0)).label('pending'),
            func.sum(func.case([(Assignment.status == AssignmentStatus.VIEWED, 1)], else_=0)).label('viewed'),
            func.sum(func.case([(Assignment.status == AssignmentStatus.ACKNOWLEDGED, 1)], else_=0)).label('acknowledged'),
            func.sum(func.case([(Assignment.status == AssignmentStatus.DECLINED, 1)], else_=0)).label('declined')
        ).filter(Assignment.policy_id == policy.id).first()

        # Calculate overdue
        overdue_count = 0
        if policy.due_at and policy.due_at < datetime.utcnow():
            overdue_count = db.query(Assignment).filter(
                Assignment.policy_id == policy.id,
                Assignment.status.in_([AssignmentStatus.PENDING, AssignmentStatus.VIEWED])
            ).count()

        # Calculate acknowledgment rate
        total = assignment_stats.total or 0
        acknowledged = assignment_stats.acknowledged or 0
        ack_rate = (acknowledged / total * 100) if total > 0 else 0

        writer.writerow([
            str(policy.id),
            policy.title,
            policy.version,
            policy.created_at.isoformat(),
            creator.name if creator else "Unknown",
            policy.due_at.isoformat() if policy.due_at else "",
            "Yes" if policy.require_typed_signature else "No",
            total,
            assignment_stats.pending or 0,
            assignment_stats.viewed or 0,
            acknowledged,
            assignment_stats.declined or 0,
            overdue_count,
            f"{ack_rate:.1f}"
        ])

    # Create response
    csv_content = output.getvalue()
    output.close()

    timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
    filename = f"policies_summary_{timestamp}.csv"

    logger.info(f"Exported summary of {len(policies)} policies")

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
