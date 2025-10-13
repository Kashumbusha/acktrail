"""
Script to cancel all Stripe subscriptions for test workspaces.
"""
import stripe
from app.core.config import settings
from app.models.database import SessionLocal
from app.models.models import Workspace

def cancel_all_subscriptions():
    """Cancel all Stripe subscriptions in the database."""
    stripe.api_key = settings.stripe_secret_key
    db = SessionLocal()

    try:
        print("=" * 80)
        print("❌ CANCELING ALL STRIPE SUBSCRIPTIONS")
        print("=" * 80)

        workspaces = db.query(Workspace).filter(
            Workspace.stripe_subscription_id.isnot(None)
        ).all()

        print(f"\nFound {len(workspaces)} workspaces with Stripe subscriptions\n")

        canceled_count = 0
        failed_count = 0

        for ws in workspaces:
            print(f"🏢 Workspace: {ws.name}")
            print(f"   Subscription ID: {ws.stripe_subscription_id}")

            try:
                # Cancel the subscription immediately (not at period end)
                subscription = stripe.Subscription.delete(ws.stripe_subscription_id)

                if subscription.status == 'canceled':
                    print(f"   ✅ CANCELED SUCCESSFULLY")
                    canceled_count += 1
                else:
                    print(f"   ⚠️  Status after cancellation: {subscription.status}")
                    canceled_count += 1

            except stripe.error.InvalidRequestError as e:
                print(f"   ❌ ERROR: {str(e)}")
                failed_count += 1
            except Exception as e:
                print(f"   ❌ Unexpected error: {str(e)}")
                failed_count += 1

            print()

        print("=" * 80)
        print(f"\n📊 Summary:")
        print(f"   ✅ Successfully canceled: {canceled_count}")
        print(f"   ❌ Failed: {failed_count}")
        print("\n" + "=" * 80)

    except Exception as e:
        print(f"\n❌ Error canceling subscriptions: {str(e)}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    cancel_all_subscriptions()
