"""
Update product descriptions to match the marketing copy from plans.js
"""
import stripe
import os
from dotenv import load_dotenv

load_dotenv()
stripe.api_key = os.getenv('STRIPE_SECRET_KEY')

# Product updates matching plans.js marketing copy
PRODUCT_UPDATES = {
    'prod_THhlVR1FJ4jGeJ': {  # Small Business Plan
        'description': 'Perfect for small teams who want to stop the email chaos. Onboard new hires in 10 minutes instead of 3 hours. Up to 10 staff members - flat rate. Real-time tracking - see who viewed, who ignored. Auto-reminders - stop manual follow-ups. Microsoft 365 SSO + Slack integration included.',
    },
    'prod_THhlop45Qh07j5': {  # Medium Team Plan
        'description': 'Built for growing remote teams. Bulk send to entire company, track completion in real-time, eliminate spreadsheet tracking. Up to 49 staff members - flat rate. Bulk sending - 100 people in one click. Dashboard view - see progress at a glance. Microsoft 365 SSO + Slack integration included.',
    },
    'prod_TEgEVEWIR1lTfs': {  # Large Enterprise Plan
        'description': 'Perfect for multi-location companies. Handle hundreds of acknowledgments effortlessly with unlimited admins and priority support. 50+ staff members - flat rate. Unlimited admin seats - your entire HR team. Handle 100+ staff with ease. Microsoft 365 SSO + Slack integration. Custom process automation included - we build workflows for free.',
    },
}

print("Updating product descriptions...")
print("=" * 60)

for product_id, updates in PRODUCT_UPDATES.items():
    try:
        product = stripe.Product.retrieve(product_id)
        stripe.Product.modify(product_id, **updates)
        print(f"✓ Updated {product.name} ({product_id})")
        print(f"  New description: {updates['description'][:80]}...")
    except Exception as e:
        print(f"✗ Error updating {product_id}: {str(e)}")

print("\n" + "=" * 60)
print("✓ Product descriptions updated")
print("All plans now mention Microsoft 365 SSO + Slack integration")
print("=" * 60)
