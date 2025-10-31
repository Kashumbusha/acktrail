"""
Create missing Stripe prices for updated pricing tiers.
"""
import stripe
import os
from dotenv import load_dotenv

load_dotenv()
stripe.api_key = os.getenv('STRIPE_SECRET_KEY')

# Product IDs from Stripe
PRODUCTS = {
    'small': 'prod_THhlVR1FJ4jGeJ',     # Small Business Plan
    'medium': 'prod_THhlop45Qh07j5',    # Medium Team Plan
    'large': 'prod_TEgEVEWIR1lTfs',     # Large Enterprise Plan
}

# New prices to create (in cents)
NEW_PRICES = {
    # Small is unchanged - already has correct prices
    # $99/month: price_1SM6VALvgOLlfex7uHmcYAob
    # $950/year: price_1SM6VALvgOLlfex7YQltbycI

    # Medium already has $149/month: price_1SL8LiLvgOLlfex7oxz8XV7V
    # Need to create annual for $149/month
    'medium_annual': {
        'product': PRODUCTS['medium'],
        'unit_amount': 143040,  # $149 * 12 * 0.8 = $1430.40
        'currency': 'usd',
        'recurring': {'interval': 'year'},
        'nickname': 'Medium Team Annual (20% off)',
    },

    # Large needs both monthly and annual for $249
    'large_monthly': {
        'product': PRODUCTS['large'],
        'unit_amount': 24900,  # $249
        'currency': 'usd',
        'recurring': {'interval': 'month'},
        'nickname': 'Large Enterprise Monthly',
    },
    'large_annual': {
        'product': PRODUCTS['large'],
        'unit_amount': 239040,  # $249 * 12 * 0.8 = $2390.40
        'currency': 'usd',
        'recurring': {'interval': 'year'},
        'nickname': 'Large Enterprise Annual (20% off)',
    },
}

print("Creating missing Stripe prices...")
print("=" * 60)

created_prices = {}

for key, price_data in NEW_PRICES.items():
    try:
        price = stripe.Price.create(**price_data)
        created_prices[key] = price.id
        print(f"✓ Created {key}: {price.id} (${price.unit_amount/100})")
    except Exception as e:
        print(f"✗ Error creating {key}: {str(e)}")

print("\n" + "=" * 60)
print("SUMMARY - New Price IDs:")
print("=" * 60)
print(f"Small monthly: price_1SM6VALvgOLlfex7uHmcYAob (unchanged, $99)")
print(f"Small annual:  price_1SM6VALvgOLlfex7YQltbycI (unchanged, $950)")
print(f"Medium monthly: price_1SL8LiLvgOLlfex7oxz8XV7V (existing, $149)")
print(f"Medium annual:  {created_prices.get('medium_annual', 'FAILED')}")
print(f"Large monthly:  {created_prices.get('large_monthly', 'FAILED')}")
print(f"Large annual:   {created_prices.get('large_annual', 'FAILED')}")
print("=" * 60)
