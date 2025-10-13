#!/usr/bin/env python3
"""
One-time script to sync active_staff_count for all existing workspaces.
Run this after deploying the staff count fix to correct existing data.

Usage:
    python sync_staff_counts.py
"""
import sys
import os

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.models.database import SessionLocal
from app.models.models import Workspace, User, UserRole
from uuid import UUID
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def update_workspace_active_staff_count(db, workspace_id: UUID) -> int:
    """
    Calculate and update the active staff count for a workspace.
    Active staff = employees only (role=employee, is_guest=False, active=True).
    Admins do NOT count towards the seat limit.
    """
    # Count only active employees (not admins, not guests)
    active_staff = db.query(User).filter(
        User.workspace_id == workspace_id,
        User.role == UserRole.EMPLOYEE,
        User.is_guest == False,
        User.active == True
    ).count()

    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if workspace:
        old_count = workspace.active_staff_count
        workspace.active_staff_count = active_staff
        db.commit()
        logger.info(f"Workspace '{workspace.name}': {old_count} -> {active_staff} active staff")
        return active_staff

    return 0


def main():
    """Sync active_staff_count for all workspaces."""
    db = SessionLocal()

    try:
        workspaces = db.query(Workspace).all()
        logger.info(f"Found {len(workspaces)} workspaces to sync")

        total_synced = 0
        for workspace in workspaces:
            try:
                active_count = update_workspace_active_staff_count(db, workspace.id)
                total_synced += 1

                # Log summary for each workspace
                admin_count = db.query(User).filter(
                    User.workspace_id == workspace.id,
                    User.role == UserRole.ADMIN,
                    User.active == True
                ).count()

                logger.info(
                    f"  - {workspace.name}: "
                    f"Licensed={workspace.staff_count or 0}, "
                    f"Active={active_count}, "
                    f"Admins={admin_count}"
                )

            except Exception as e:
                logger.error(f"Error syncing workspace {workspace.id}: {str(e)}")
                continue

        logger.info(f"\n✅ Successfully synced {total_synced}/{len(workspaces)} workspaces")

    except Exception as e:
        logger.error(f"Error in main sync: {str(e)}")
        db.rollback()
        return 1
    finally:
        db.close()

    return 0


if __name__ == "__main__":
    sys.exit(main())
