"""
Script to clean all test data from the database.
Run this ONLY when you're ready to start fresh with production data!
"""
from app.models.database import SessionLocal
from app.models.models import (
    Workspace, User, Team, Policy, Assignment,
    Acknowledgment, EmailEvent, AuthCode, Notification
)
from sqlalchemy import text

def clean_all_test_data():
    """Delete all data from the database in the correct order."""
    db = SessionLocal()

    try:
        print("🗑️  Starting database cleanup...")
        print("⚠️  WARNING: This will delete ALL data from the database!")

        # Count records before deletion
        workspace_count = db.query(Workspace).count()
        user_count = db.query(User).count()
        policy_count = db.query(Policy).count()
        assignment_count = db.query(Assignment).count()

        print(f"\n📊 Current data:")
        print(f"   - Workspaces: {workspace_count}")
        print(f"   - Users: {user_count}")
        print(f"   - Policies: {policy_count}")
        print(f"   - Assignments: {assignment_count}")

        # Confirm deletion
        confirm = input("\n❓ Type 'DELETE ALL' to confirm deletion: ")
        if confirm != "DELETE ALL":
            print("❌ Deletion cancelled.")
            return

        print("\n🔄 Deleting data in correct order...")

        # 1. Delete notifications (depends on users, workspaces)
        notifications_deleted = db.query(Notification).delete()
        print(f"   ✓ Deleted {notifications_deleted} notifications")

        # 2. Delete acknowledgments (depends on assignments)
        acks_deleted = db.query(Acknowledgment).delete()
        print(f"   ✓ Deleted {acks_deleted} acknowledgments")

        # 3. Delete email events (depends on assignments)
        events_deleted = db.query(EmailEvent).delete()
        print(f"   ✓ Deleted {events_deleted} email events")

        # 4. Delete assignments (depends on policies, users, teams, workspaces)
        assignments_deleted = db.query(Assignment).delete()
        print(f"   ✓ Deleted {assignments_deleted} assignments")

        # 5. Delete policies (depends on users, teams, workspaces)
        policies_deleted = db.query(Policy).delete()
        print(f"   ✓ Deleted {policies_deleted} policies")

        # 6. Delete auth codes (independent)
        auth_codes_deleted = db.query(AuthCode).delete()
        print(f"   ✓ Deleted {auth_codes_deleted} auth codes")

        # 7. Delete users (depends on workspaces, teams)
        users_deleted = db.query(User).delete()
        print(f"   ✓ Deleted {users_deleted} users")

        # 8. Delete teams (depends on workspaces)
        teams_deleted = db.query(Team).delete()
        print(f"   ✓ Deleted {teams_deleted} teams")

        # 9. Delete workspaces (root table)
        workspaces_deleted = db.query(Workspace).delete()
        print(f"   ✓ Deleted {workspaces_deleted} workspaces")

        # Commit the transaction
        db.commit()

        print("\n✅ Database cleanup completed successfully!")
        print("🎉 Your database is now clean and ready for production data.")

    except Exception as e:
        db.rollback()
        print(f"\n❌ Error during cleanup: {str(e)}")
        print("⚠️  Rolling back changes...")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("=" * 60)
    print("🧹 DATABASE CLEANUP SCRIPT")
    print("=" * 60)
    clean_all_test_data()
