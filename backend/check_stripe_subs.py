"""
Script to check the status of Stripe subscriptions.
"""
import stripe
from app.core.config import settings
from app.models.database import SessionLocal
from app.models.models import Workspace

def check_stripe_subscriptions():
    """Check the status of all Stripe subscriptions in the database."""
    stripe.api_key = settings.stripe_secret_key
    db = SessionLocal()

    try:
        print("=" * 80)
        print("💳 STRIPE SUBSCRIPTION STATUS CHECK")
        print("=" * 80)

        workspaces = db.query(Workspace).filter(
            Workspace.stripe_subscription_id.isnot(None)
        ).all()

        print(f"\nFound {len(workspaces)} workspaces with Stripe subscriptions\n")

        for ws in workspaces:
            print(f"🏢 Workspace: {ws.name}")
            print(f"   Customer ID: {ws.stripe_customer_id}")
            print(f"   Subscription ID: {ws.stripe_subscription_id}")

            try:
                # Fetch subscription from Stripe
                subscription = stripe.Subscription.retrieve(ws.stripe_subscription_id)

                print(f"   Status: {subscription.status.upper()}")
                print(f"   Plan: {ws.plan.value}")

                if subscription.status == 'canceled':
                    print(f"   ✅ CANCELED")
                    if subscription.canceled_at:
                        from datetime import datetime
                        canceled_date = datetime.fromtimestamp(subscription.canceled_at)
                        print(f"   Canceled at: {canceled_date}")
                elif subscription.status == 'active':
                    print(f"   ⚠️  STILL ACTIVE")
                    if subscription.current_period_end:
                        from datetime import datetime
                        end_date = datetime.fromtimestamp(subscription.current_period_end)
                        print(f"   Period ends: {end_date}")
                else:
                    print(f"   ℹ️  Status: {subscription.status}")

            except stripe.error.InvalidRequestError as e:
                print(f"   ❌ ERROR: {str(e)}")
            except Exception as e:
                print(f"   ❌ Unexpected error: {str(e)}")

            print()

        print("=" * 80)

    except Exception as e:
        print(f"\n❌ Error checking subscriptions: {str(e)}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    check_stripe_subscriptions()
