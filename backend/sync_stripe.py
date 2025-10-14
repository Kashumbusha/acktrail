#!/usr/bin/env python3
"""
Script to sync workspace data from Stripe when database gets out of sync.

Usage:
    python sync_stripe.py <workspace_name_or_id>

Example:
    python sync_stripe.py "Acktrail"
"""

import sys
from uuid import UUID
from app.models.database import SessionLocal
from app.models.models import Workspace, PlanTier
from app.services.stripe_service import StripeService


def is_valid_uuid(value):
    """Check if a string is a valid UUID."""
    try:
        UUID(value)
        return True
    except (ValueError, AttributeError):
        return False


def sync_workspace_from_stripe(workspace_identifier):
    """Sync workspace data from Stripe."""
    db = SessionLocal()
    try:
        # Find workspace by ID or name
        if is_valid_uuid(workspace_identifier):
            workspace = db.query(Workspace).filter(Workspace.id == UUID(workspace_identifier)).first()
        else:
            workspace = db.query(Workspace).filter(Workspace.name == workspace_identifier).first()

        if not workspace:
            print(f"❌ Error: Workspace '{workspace_identifier}' not found")
            return False

        if not workspace.stripe_subscription_id:
            print(f"❌ Error: Workspace '{workspace.name}' has no Stripe subscription")
            return False

        print(f"\n📋 Workspace: {workspace.name}")
        print(f"   ID: {workspace.id}")
        print()

        # Get subscription from Stripe
        subscription = StripeService.get_subscription(workspace.stripe_subscription_id)

        print("Current Database Values:")
        print(f"  Plan: {workspace.plan.value}")
        print(f"  Staff Count: {workspace.staff_count}")
        print(f"  Subscription Status: {workspace.subscription_status}")
        print(f"  Billing Interval: {workspace.billing_interval}")
        print()

        # Parse subscription items to determine plan and staff count
        import stripe
        plan_name = None
        staff_count = None

        for item in subscription["items"]["data"]:
            price = stripe.Price.retrieve(item.price.id)
            product = stripe.Product.retrieve(price.product)

            if "Small" in product.name:
                plan_name = "small"
            elif "Medium" in product.name:
                plan_name = "medium"
            elif "Large" in product.name:
                plan_name = "large"

            if "Per Staff" in product.name:
                staff_count = item.quantity

        print("Stripe Subscription Values:")
        print(f"  Subscription ID: {subscription.id}")
        print(f"  Status: {subscription.status}")
        if plan_name:
            print(f"  Plan: {plan_name}")
        if staff_count:
            print(f"  Staff Count: {staff_count}")
        print()

        # Confirm update
        if plan_name or staff_count:
            response = input("Do you want to sync these values to the database? (yes/no): ")
            if response.lower() not in ['yes', 'y']:
                print("❌ Sync cancelled")
                return False

            # Update workspace
            if plan_name:
                workspace.plan = PlanTier(plan_name)
            if staff_count:
                workspace.staff_count = staff_count

            workspace.subscription_status = subscription.status

            db.commit()

            print()
            print("✅ Success: Workspace synced with Stripe")
            print("\nUpdated Database Values:")
            print(f"  Plan: {workspace.plan.value}")
            print(f"  Staff Count: {workspace.staff_count}")
            print(f"  Subscription Status: {workspace.subscription_status}")

            return True
        else:
            print("⚠️  Could not determine plan or staff count from Stripe subscription")
            return False

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
    success = sync_workspace_from_stripe(workspace_identifier)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
