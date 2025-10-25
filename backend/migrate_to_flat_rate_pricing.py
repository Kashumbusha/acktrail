"""
Migrate Stripe products to flat-rate pricing model.

Old model: Base price + per-staff pricing
New model: Flat-rate pricing tiers based on staff count ranges
- Small: $99/month (up to 10 staff)
- Medium: $249/month (up to 49 staff)
- Large: $699/month (50+ staff)

Annual pricing: 20% discount (was 15%)
SSO: Now included in all plans (was $50/month addon)
"""
import stripe
from app.core.config import settings

stripe.api_key = settings.stripe_secret_key

# Product IDs from our current Stripe account
PRODUCTS = {
    'small': {
        'base': 'prod_THhlVR1FJ4jGeJ',
        'per_staff': 'prod_THhlcYrNnBELHi',  # Will deprecate
    },
    'medium': {
        'base': 'prod_THhlop45Qh07j5',
        'per_staff': 'prod_THhlJiByQh6gdy',  # Will deprecate
    },
    'large': {
        'base': 'prod_TEgEVEWIR1lTfs',
        'per_staff': 'prod_TEgEtBXZnG50HY',  # Will deprecate
    }
}

# New flat-rate pricing
NEW_PRICING = {
    'small': {
        'monthly': 9900,  # $99.00 in cents
        'annual': 95040,  # $99 * 12 * 0.8 = $950.40
        'staff_range': 'Up to 10 staff',
        'name': 'Small Business Plan',
        'description': 'Stop chasing policy signatures for small teams. Perfect for startups managing up to 10 staff members. Includes real-time tracking, auto-reminders, Microsoft 365 SSO, and 50 free guest invites/month.',
    },
    'medium': {
        'monthly': 24900,  # $249.00 in cents
        'annual': 239040,  # $249 * 12 * 0.8 = $2,390.40
        'staff_range': 'Up to 49 staff',
        'name': 'Medium Team Plan',
        'description': 'Built for growing companies (11-49 staff). Bulk send to entire company, track completion in real-time, eliminate spreadsheet tracking. Includes Microsoft 365 SSO, 250 guest invites/month, and 3 admin seats.',
    },
    'large': {
        'monthly': 69900,  # $699.00 in cents
        'annual': 671040,  # $699 * 12 * 0.8 = $6,710.40
        'staff_range': '50+ staff',
        'name': 'Large Enterprise Plan',
        'description': 'Perfect for multi-location companies (50+ staff). Handle hundreds of acknowledgments effortlessly with unlimited admins, Microsoft 365 SSO, 1,000 guest invites/month, and priority support.',
    }
}

def create_new_prices():
    """Create new flat-rate prices for each plan."""
    print("=" * 70)
    print("Creating New Flat-Rate Prices")
    print("=" * 70)
    print()

    created_prices = {}

    for plan_id, pricing in NEW_PRICING.items():
        product_id = PRODUCTS[plan_id]['base']

        print(f"Processing {plan_id.upper()} plan...")
        print(f"  Product ID: {product_id}")
        print(f"  Staff range: {pricing['staff_range']}")
        print()

        # Create monthly price
        try:
            monthly_price = stripe.Price.create(
                product=product_id,
                unit_amount=pricing['monthly'],
                currency='usd',
                recurring={'interval': 'month'},
                nickname=f"{pricing['name']} - Monthly",
                metadata={
                    'plan_type': plan_id,
                    'billing_interval': 'month',
                    'staff_range': pricing['staff_range'],
                    'pricing_model': 'flat_rate',
                    'sso_included': 'true',
                }
            )
            print(f"  ✅ Created monthly price: {monthly_price.id}")
            print(f"     Amount: ${pricing['monthly']/100}/month")

            if plan_id not in created_prices:
                created_prices[plan_id] = {}
            created_prices[plan_id]['monthly'] = monthly_price.id

        except Exception as e:
            print(f"  ❌ Error creating monthly price: {str(e)}")

        # Create annual price
        try:
            annual_price = stripe.Price.create(
                product=product_id,
                unit_amount=pricing['annual'],
                currency='usd',
                recurring={'interval': 'year'},
                nickname=f"{pricing['name']} - Annual (20% off)",
                metadata={
                    'plan_type': plan_id,
                    'billing_interval': 'year',
                    'staff_range': pricing['staff_range'],
                    'pricing_model': 'flat_rate',
                    'discount': '20%',
                    'sso_included': 'true',
                }
            )
            print(f"  ✅ Created annual price: {annual_price.id}")
            print(f"     Amount: ${pricing['annual']/100}/year (≈${pricing['annual']/12/100:.2f}/month)")

            created_prices[plan_id]['annual'] = annual_price.id

        except Exception as e:
            print(f"  ❌ Error creating annual price: {str(e)}")

        print()

    return created_prices

def update_product_metadata():
    """Update product descriptions and metadata."""
    print("=" * 70)
    print("Updating Product Metadata")
    print("=" * 70)
    print()

    for plan_id, pricing in NEW_PRICING.items():
        product_id = PRODUCTS[plan_id]['base']

        try:
            stripe.Product.modify(
                product_id,
                name=pricing['name'],
                description=pricing['description'],
                metadata={
                    'plan_type': plan_id,
                    'pricing_model': 'flat_rate',
                    'staff_range': pricing['staff_range'],
                    'sso_included': 'true',
                    'annual_discount': '20%',
                }
            )
            print(f"✅ Updated {plan_id.upper()} product metadata")
        except Exception as e:
            print(f"❌ Error updating {plan_id.upper()}: {str(e)}")

    print()

def archive_per_staff_products():
    """Archive the old per-staff products (don't delete, just archive)."""
    print("=" * 70)
    print("Archiving Old Per-Staff Products")
    print("=" * 70)
    print()
    print("NOTE: These products will be archived, not deleted.")
    print("Existing subscriptions will continue to work.")
    print()

    for plan_id, products in PRODUCTS.items():
        per_staff_id = products['per_staff']

        try:
            stripe.Product.modify(
                per_staff_id,
                active=False,
                metadata={
                    'archived': 'true',
                    'archived_date': '2025-01-25',
                    'reason': 'Migrated to flat-rate pricing model',
                }
            )
            print(f"✅ Archived {plan_id.upper()} per-staff product ({per_staff_id})")
        except Exception as e:
            print(f"❌ Error archiving {plan_id.upper()}: {str(e)}")

    print()

def main():
    print()
    print("=" * 70)
    print("STRIPE FLAT-RATE PRICING MIGRATION")
    print("=" * 70)
    print()
    print("This script will:")
    print("  1. Create new flat-rate prices for Small/Medium/Large plans")
    print("  2. Update product metadata and descriptions")
    print("  3. Archive old per-staff products")
    print()
    print("New pricing:")
    print("  • Small:  $99/month  (up to 10 staff)")
    print("  • Medium: $249/month (up to 49 staff)")
    print("  • Large:  $699/month (50+ staff)")
    print("  • Annual: 20% discount on all plans")
    print("  • SSO: Included in all plans (no addon)")
    print()

    # Create new prices
    created_prices = create_new_prices()

    # Update product metadata
    update_product_metadata()

    # Archive per-staff products
    archive_per_staff_products()

    # Summary
    print("=" * 70)
    print("MIGRATION COMPLETE")
    print("=" * 70)
    print()
    print("New Price IDs (save these for your checkout integration):")
    print()
    for plan_id, prices in created_prices.items():
        print(f"{plan_id.upper()}:")
        if 'monthly' in prices:
            print(f"  Monthly: {prices['monthly']}")
        if 'annual' in prices:
            print(f"  Annual:  {prices['annual']}")
        print()

    print("Next steps:")
    print("  1. Update your checkout code to use the new price IDs")
    print("  2. Remove staff count and SSO toggles from signup flow")
    print("  3. Test checkout with new prices")
    print("  4. Update subscription management to handle flat-rate model")
    print()
    print("🔗 View in Stripe Dashboard:")
    print("   https://dashboard.stripe.com/products")
    print()

if __name__ == "__main__":
    main()
