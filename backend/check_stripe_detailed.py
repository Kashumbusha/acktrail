"""
Script to check detailed Stripe subscription status including cancellation flags.
"""
import stripe
from datetime import datetime
from app.core.config import settings
from app.models.database import SessionLocal
from app.models.models import Workspace

def check_stripe_subscriptions_detailed():
    """Check the detailed status of all Stripe subscriptions."""
    stripe.api_key = settings.stripe_secret_key
    db = SessionLocal()

    try:
        print("=" * 80)
        print("💳 DETAILED STRIPE SUBSCRIPTION CHECK")
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

                # Check cancellation details
                if subscription.cancel_at_period_end:
                    print(f"   ✅ MARKED FOR CANCELLATION (will cancel at period end)")
                    if subscription.cancel_at:
                        cancel_date = datetime.fromtimestamp(subscription.cancel_at)
                        print(f"   Will cancel at: {cancel_date}")
                elif subscription.canceled_at:
                    canceled_date = datetime.fromtimestamp(subscription.canceled_at)
                    print(f"   ✅ CANCELLED on: {canceled_date}")
                else:
                    print(f"   ⚠️  NOT CANCELLED - Still active!")

                # Trial information
                if subscription.trial_end:
                    trial_end_date = datetime.fromtimestamp(subscription.trial_end)
                    print(f"   Trial ends: {trial_end_date}")
                    if subscription.cancel_at_period_end:
                        print(f"   → Subscription will end when trial expires")

                # Current period
                if subscription.current_period_end:
                    period_end = datetime.fromtimestamp(subscription.current_period_end)
                    print(f"   Current period ends: {period_end}")

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
    check_stripe_subscriptions_detailed()
