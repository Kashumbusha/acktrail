"""
Update price nicknames to clearly show the 20% annual discount.
"""
import stripe
import os
from dotenv import load_dotenv

load_dotenv()
stripe.api_key = os.getenv('STRIPE_SECRET_KEY')

# Price updates with clearer discount messaging
PRICE_UPDATES = {
    # Small Business Plan
    'price_1SM6VALvgOLlfex7uHmcYAob': {
        'nickname': 'Small Business - Monthly ($99/mo)',
    },
    'price_1SM6VALvgOLlfex7YQltbycI': {
        'nickname': 'Small Business - Annual (Save 20% - $79.20/mo, billed $950/yr)',
    },

    # Medium Team Plan
    'price_1SL8LiLvgOLlfex7oxz8XV7V': {
        'nickname': 'Medium Team - Monthly ($149/mo)',
    },
    'price_1SODOeLvgOLlfex71Qn4DaP2': {
        'nickname': 'Medium Team - Annual (Save 20% - $119.20/mo, billed $1,430/yr)',
    },

    # Large Enterprise Plan
    'price_1SODOeLvgOLlfex7GErASLgc': {
        'nickname': 'Large Enterprise - Monthly ($249/mo)',
    },
    'price_1SODOfLvgOLlfex7Q1FqCJGg': {
        'nickname': 'Large Enterprise - Annual (Save 20% - $199.20/mo, billed $2,390/yr)',
    },
}

print("Updating price nicknames to show 20% annual discount...")
print("=" * 60)

for price_id, updates in PRICE_UPDATES.items():
    try:
        stripe.Price.modify(price_id, **updates)
        print(f"✓ Updated {price_id}")
        print(f"  New nickname: {updates['nickname']}")
    except Exception as e:
        print(f"✗ Error updating {price_id}: {str(e)}")

print("\n" + "=" * 60)
print("✓ Price nicknames updated")
print("Annual prices now clearly show 20% discount")
print("=" * 60)
