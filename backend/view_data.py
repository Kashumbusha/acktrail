"""
Script to view all data in the database before cleanup.
"""
from app.models.database import SessionLocal
from app.models.models import (
    Workspace, User, Team, Policy, Assignment,
    Acknowledgment, EmailEvent, AuthCode, Notification
)

def view_all_data():
    """Display all data from the database."""
    db = SessionLocal()

    try:
        print("=" * 80)
        print("📊 DATABASE CONTENTS")
        print("=" * 80)

        # Workspaces
        workspaces = db.query(Workspace).all()
        print(f"\n🏢 WORKSPACES ({len(workspaces)}):")
        print("-" * 80)
        for ws in workspaces:
            print(f"  ID: {ws.id}")
            print(f"  Name: {ws.name}")
            print(f"  Plan: {ws.plan}")
            print(f"  Staff Count: {ws.staff_count}")
            print(f"  SSO Enabled: {ws.sso_enabled}")
            print(f"  Created: {ws.created_at}")
            if ws.stripe_customer_id:
                print(f"  Stripe Customer: {ws.stripe_customer_id}")
            if ws.stripe_subscription_id:
                print(f"  Stripe Subscription: {ws.stripe_subscription_id}")
            print()

        # Users
        users = db.query(User).all()
        print(f"\n👥 USERS ({len(users)}):")
        print("-" * 80)
        for user in users:
            ws = db.query(Workspace).filter(Workspace.id == user.workspace_id).first()
            print(f"  ID: {user.id}")
            print(f"  Email: {user.email}")
            print(f"  Name: {user.name}")
            print(f"  Role: {user.role}")
            print(f"  Workspace: {ws.name if ws else 'N/A'}")
            print(f"  Is Guest: {user.is_guest}")
            print(f"  Can Login: {user.can_login}")
            print(f"  Active: {user.active}")
            print(f"  Platform Admin: {user.is_platform_admin}")
            print()

        # Teams
        teams = db.query(Team).all()
        print(f"\n👨‍👩‍👧‍👦 TEAMS ({len(teams)}):")
        print("-" * 80)
        if teams:
            for team in teams:
                ws = db.query(Workspace).filter(Workspace.id == team.workspace_id).first()
                print(f"  ID: {team.id}")
                print(f"  Name: {team.name}")
                print(f"  Workspace: {ws.name if ws else 'N/A'}")
                print()
        else:
            print("  No teams found")

        # Policies
        policies = db.query(Policy).all()
        print(f"\n📄 POLICIES ({len(policies)}):")
        print("-" * 80)
        if policies:
            for policy in policies:
                print(f"  ID: {policy.id}")
                print(f"  Title: {policy.title}")
                print(f"  Status: {policy.status}")
                print()
        else:
            print("  No policies found")

        # Assignments
        assignments = db.query(Assignment).all()
        print(f"\n📋 ASSIGNMENTS ({len(assignments)}):")
        print("-" * 80)
        if assignments:
            for assignment in assignments:
                print(f"  ID: {assignment.id}")
                print(f"  Status: {assignment.status}")
                print()
        else:
            print("  No assignments found")

        # Auth codes
        auth_codes = db.query(AuthCode).all()
        print(f"\n🔑 AUTH CODES ({len(auth_codes)}):")
        print("-" * 80)
        print(f"  Total: {len(auth_codes)}")

        # Notifications
        notifications = db.query(Notification).all()
        print(f"\n🔔 NOTIFICATIONS ({len(notifications)}):")
        print("-" * 80)
        print(f"  Total: {len(notifications)}")

        print("\n" + "=" * 80)

    except Exception as e:
        print(f"\n❌ Error viewing data: {str(e)}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    view_all_data()
