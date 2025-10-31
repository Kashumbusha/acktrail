"""
Archive old Stripe prices to clean up the customer portal.
Only keep the three current flat-rate plan prices active.
"""
import stripe
import os
from dotenv import load_dotenv

load_dotenv()
stripe.api_key = os.getenv('STRIPE_SECRET_KEY')

# These are the ONLY price IDs that should remain active
KEEP_ACTIVE = {
    # Small Business Plan - $99/month, $950/year
    'price_1SM6VALvgOLlfex7uHmcYAob',  # Small monthly $99
    'price_1SM6VALvgOLlfex7YQltbycI',  # Small annual $950

    # Medium Team Plan - $149/month, $1430.40/year
    'price_1SL8LiLvgOLlfex7oxz8XV7V',  # Medium monthly $149
    'price_1SODOeLvgOLlfex71Qn4DaP2',  # Medium annual $1430.40

    # Large Enterprise Plan - $249/month, $2390.40/year
    'price_1SODOeLvgOLlfex7GErASLgc',  # Large monthly $249
    'price_1SODOfLvgOLlfex7Q1FqCJGg',  # Large annual $2390.40
}

# Product ID to new default price mapping
PRODUCT_DEFAULTS = {
    'prod_THhlVR1FJ4jGeJ': 'price_1SM6VALvgOLlfex7uHmcYAob',  # Small Business Plan -> $99/month
    'prod_THhlop45Qh07j5': 'price_1SL8LiLvgOLlfex7oxz8XV7V',  # Medium Team Plan -> $149/month
    'prod_TEgEVEWIR1lTfs': 'price_1SODOeLvgOLlfex7GErASLgc',  # Large Enterprise Plan -> $249/month
}

print("Step 1: Updating default prices on products...")
print("=" * 60)

for product_id, default_price_id in PRODUCT_DEFAULTS.items():
    try:
        stripe.Product.modify(product_id, default_price=default_price_id)
        print(f"✓ Updated product {product_id} default price to {default_price_id}")
    except Exception as e:
        print(f"✗ Error updating product {product_id}: {str(e)}")

print("\nStep 2: Fetching all active Stripe prices...")
print("=" * 60)

# Get all prices
all_prices = []
starting_after = None

while True:
    params = {'limit': 100}
    if starting_after:
        params['starting_after'] = starting_after

    prices = stripe.Price.list(**params)
    all_prices.extend(prices.data)

    if not prices.has_more:
        break
    starting_after = prices.data[-1].id

print(f"Found {len(all_prices)} total prices\n")

print("Step 3: Archiving old prices...")
print("=" * 60)

# Archive old prices
archived_count = 0
kept_count = 0
error_count = 0

for price in all_prices:
    if price.id in KEEP_ACTIVE:
        if price.active:
            print(f"✓ Keeping active: {price.id} (${price.unit_amount/100} {price.nickname or ''})")
            kept_count += 1
        else:
            try:
                print(f"! Activating: {price.id} (${price.unit_amount/100} {price.nickname or ''})")
                stripe.Price.modify(price.id, active=True)
                kept_count += 1
            except Exception as e:
                print(f"✗ Error activating {price.id}: {str(e)}")
                error_count += 1
    else:
        if price.active:
            try:
                print(f"→ Archiving: {price.id} (${price.unit_amount/100} {price.nickname or ''})")
                stripe.Price.modify(price.id, active=False)
                archived_count += 1
            except Exception as e:
                print(f"✗ Error archiving {price.id}: {str(e)}")
                error_count += 1

print("\n" + "=" * 60)
print(f"Summary: {archived_count} prices archived, {kept_count} kept active, {error_count} errors")
print("=" * 60)
