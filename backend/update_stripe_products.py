"""
Script to update Stripe product descriptions with new messaging.
Run this to update product descriptions in Stripe to match our new positioning.
"""
import stripe
from app.core.config import settings

stripe.api_key = settings.stripe_secret_key

def update_stripe_products():
    """Update Stripe product descriptions with benefit-focused messaging."""

    # Get existing products
    products = stripe.Product.list(limit=10, active=True)

    # Define new descriptions
    product_updates = {
        # Small plan
        "small": {
            "description": "Stop chasing policy signatures for teams up to 10 staff. Includes real-time tracking, auto-reminders, and 50 free guest invites/month for contractors.",
            "metadata": {
                "positioning": "Small HR teams who want to eliminate email chaos",
                "key_benefit": "Onboard new hires in 10 minutes instead of 3 hours",
                "use_case": "Startups and small businesses (1-10 employees)"
            }
        },
        # Medium plan
        "medium": {
            "description": "Perfect for scaling teams (11-49 staff). Everything in Small, plus 250 guest invites/month and 3 admin seats. Built for remote/hybrid teams.",
            "metadata": {
                "positioning": "Growing companies managing distributed teams",
                "key_benefit": "Bulk send to entire company, track completion in real-time",
                "use_case": "Scale-ups with 11-49 employees",
                "popular": "true"
            }
        },
        # Large plan
        "large": {
            "description": "Built for larger organizations (50+ staff). Unlimited admins, 1,000 guest invites/month, and priority support. Perfect for multi-location companies.",
            "metadata": {
                "positioning": "Enterprise teams with complex compliance needs",
                "key_benefit": "Handle hundreds of acknowledgments with ease",
                "use_case": "Enterprises with 50+ employees"
            }
        }
    }

    print("Updating Stripe products...\n")

    for product in products.data:
        product_name = product.name.lower()

        # Determine which plan this is
        plan_type = None
        if "small" in product_name:
            plan_type = "small"
        elif "medium" in product_name:
            plan_type = "medium"
        elif "large" in product_name:
            plan_type = "large"

        if plan_type and plan_type in product_updates:
            updates = product_updates[plan_type]

            print(f"Updating {product.name}...")
            print(f"  New description: {updates['description'][:100]}...")

            # Update product
            stripe.Product.modify(
                product.id,
                description=updates['description'],
                metadata=updates['metadata']
            )

            print(f"  ✅ Updated successfully\n")
        else:
            print(f"Skipping {product.name} (not a plan product)\n")

    print("Done! All product descriptions updated.")
    print("\nNext step: Verify changes in Stripe Dashboard:")
    print("https://dashboard.stripe.com/products")

if __name__ == "__main__":
    print("=" * 60)
    print("Stripe Product Description Updater")
    print("=" * 60)
    print()

    confirm = input("This will update product descriptions in Stripe. Continue? (yes/no): ")

    if confirm.lower() in ['yes', 'y']:
        update_stripe_products()
    else:
        print("Cancelled.")
