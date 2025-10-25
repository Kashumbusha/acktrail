"""
Update Stripe product descriptions with new benefit-focused messaging.
This updates the 6 active products currently in use.
"""
import stripe
from app.core.config import settings

stripe.api_key = settings.stripe_secret_key

# Define the 6 active product IDs and their new descriptions
PRODUCT_UPDATES = {
    # Small Plan
    "prod_THhlVR1FJ4jGeJ": {  # Small - Base Fee
        "description": "Stop chasing policy signatures for small teams. Perfect for startups and small HR teams managing up to 10 staff members. Includes real-time tracking, auto-reminders, and 50 free guest invites/month.",
        "metadata": {
            "plan_type": "small",
            "component": "base",
            "positioning": "Small HR teams who want to eliminate email chaos",
            "key_benefit": "Onboard new hires in 10 minutes instead of 3 hours",
            "use_case": "Startups and small businesses (1-10 employees)"
        }
    },
    "prod_THhlcYrNnBELHi": {  # Small - Per Staff
        "description": "Per-staff pricing for Small Plan. Each additional staff member adds this monthly charge for full acknowledgment tracking.",
        "metadata": {
            "plan_type": "small",
            "component": "per_staff"
        }
    },

    # Medium Plan
    "prod_THhlop45Qh07j5": {  # Medium - Base Fee
        "description": "Built for growing companies (11-49 staff). Everything in Small, plus 250 guest invites/month and 3 admin seats. Perfect for remote/hybrid teams that need bulk sending and centralized tracking.",
        "metadata": {
            "plan_type": "medium",
            "component": "base",
            "positioning": "Growing companies managing distributed teams",
            "key_benefit": "Bulk send to entire company, track completion in real-time",
            "use_case": "Scale-ups with 11-49 employees",
            "popular": "true"
        }
    },
    "prod_THhlJiByQh6gdy": {  # Medium - Per Staff
        "description": "Per-staff pricing for Medium Plan. Discounted rate for larger teams managing policy acknowledgments at scale.",
        "metadata": {
            "plan_type": "medium",
            "component": "per_staff"
        }
    },

    # Large Plan
    "prod_TEgEVEWIR1lTfs": {  # Large - Base Fee
        "description": "Enterprise plan for larger organizations (50+ staff). Unlimited admins, 1,000 guest invites/month, and priority support. Perfect for multi-location companies with complex compliance needs.",
        "metadata": {
            "plan_type": "large",
            "component": "base",
            "positioning": "Enterprise teams with complex compliance needs",
            "key_benefit": "Handle hundreds of acknowledgments effortlessly",
            "use_case": "Enterprises with 50+ employees"
        }
    },
    "prod_TEgEtBXZnG50HY": {  # Large - Per Staff
        "description": "Per-staff pricing for Large Plan. Lowest per-staff rate for enterprise-scale policy management.",
        "metadata": {
            "plan_type": "large",
            "component": "per_staff"
        }
    }
}

def update_product_descriptions():
    """Update product descriptions in Stripe."""
    print("=" * 70)
    print("Updating Stripe Product Descriptions")
    print("=" * 70)
    print()

    updated_count = 0

    for product_id, updates in PRODUCT_UPDATES.items():
        try:
            # Get current product
            product = stripe.Product.retrieve(product_id)

            print(f"Updating: {product.name}")
            print(f"  ID: {product_id}")
            print(f"  New description: {updates['description'][:80]}...")

            # Update product
            stripe.Product.modify(
                product_id,
                description=updates['description'],
                metadata=updates['metadata']
            )

            print(f"  ✅ Updated successfully\n")
            updated_count += 1

        except Exception as e:
            print(f"  ❌ Error: {str(e)}\n")

    print("=" * 70)
    print(f"Complete! Updated {updated_count}/{len(PRODUCT_UPDATES)} products")
    print("=" * 70)
    print()
    print("✅ Product descriptions now match your new positioning:")
    print("   - Focus on stopping email chaos")
    print("   - Emphasize time savings (3 hours → 10 minutes)")
    print("   - Highlight specific use cases (onboarding, training)")
    print()
    print("🔗 View in Stripe Dashboard:")
    print("   https://dashboard.stripe.com/products")
    print()

if __name__ == "__main__":
    print()
    confirm = input("Update Stripe product descriptions? (yes/no): ")

    if confirm.lower() in ['yes', 'y']:
        print()
        update_product_descriptions()
    else:
        print("\nCancelled. No changes made to Stripe.")
