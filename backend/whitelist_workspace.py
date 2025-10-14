#!/usr/bin/env python3
"""
Script to whitelist a workspace so it bypasses payment requirements.

Usage:
    python whitelist_workspace.py <workspace_name_or_id> [--unwhitelist]

Examples:
    # Whitelist a workspace by name
    python whitelist_workspace.py "My Company"

    # Whitelist a workspace by ID
    python whitelist_workspace.py "550e8400-e29b-41d4-a716-446655440000"

    # Remove a workspace from whitelist
    python whitelist_workspace.py "My Company" --unwhitelist
"""

import sys
from uuid import UUID
from app.models.database import SessionLocal
from app.models.models import Workspace


def is_valid_uuid(value):
    """Check if a string is a valid UUID."""
    try:
        UUID(value)
        return True
    except (ValueError, AttributeError):
        return False


def whitelist_workspace(workspace_identifier, unwhitelist=False):
    """Whitelist or unwhitelist a workspace."""
    db = SessionLocal()
    try:
        # Try to find workspace by ID or name
        if is_valid_uuid(workspace_identifier):
            workspace = db.query(Workspace).filter(Workspace.id == UUID(workspace_identifier)).first()
        else:
            workspace = db.query(Workspace).filter(Workspace.name == workspace_identifier).first()

        if not workspace:
            print(f"❌ Error: Workspace '{workspace_identifier}' not found")
            print("\nAvailable workspaces:")
            workspaces = db.query(Workspace).all()
            for ws in workspaces:
                whitelist_status = "✓ Whitelisted" if ws.is_whitelisted else "✗ Not whitelisted"
                print(f"  - {ws.name} (ID: {ws.id}) [{whitelist_status}]")
            return False

        # Update whitelist status
        workspace.is_whitelisted = not unwhitelist
        db.commit()

        action = "removed from whitelist" if unwhitelist else "whitelisted"
        print(f"✅ Success: Workspace '{workspace.name}' has been {action}")
        print(f"\nWorkspace Details:")
        print(f"  - Name: {workspace.name}")
        print(f"  - ID: {workspace.id}")
        print(f"  - Plan: {workspace.plan.value}")
        print(f"  - Whitelisted: {workspace.is_whitelisted}")
        print(f"  - Staff Count: {workspace.staff_count}")

        if workspace.is_whitelisted:
            print("\n💡 This workspace will now bypass all payment requirements during signup.")
        else:
            print("\n💡 This workspace will now require payment during signup.")

        return True

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        db.rollback()
        return False
    finally:
        db.close()


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    workspace_identifier = sys.argv[1]
    unwhitelist = "--unwhitelist" in sys.argv

    success = whitelist_workspace(workspace_identifier, unwhitelist)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
