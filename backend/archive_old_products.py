"""
Archive old Stripe products to clean up the customer portal.
Only keep the three current flat-rate plan products active.
"""
import stripe
import os
from dotenv import load_dotenv

load_dotenv()
stripe.api_key = os.getenv('STRIPE_SECRET_KEY')

# These are the ONLY product IDs that should remain active
KEEP_ACTIVE = {
    'prod_THhlVR1FJ4jGeJ',  # Small Business Plan
    'prod_THhlop45Qh07j5',  # Medium Team Plan
    'prod_TEgEVEWIR1lTfs',  # Large Enterprise Plan
}

print("Fetching all Stripe products...")
print("=" * 60)

# Get all products
all_products = []
starting_after = None

while True:
    params = {'limit': 100}
    if starting_after:
        params['starting_after'] = starting_after

    products = stripe.Product.list(**params)
    all_products.extend(products.data)

    if not products.has_more:
        break
    starting_after = products.data[-1].id

print(f"Found {len(all_products)} total products\n")

print("Archiving old products...")
print("=" * 60)

# Archive old products
archived_count = 0
kept_count = 0

for product in all_products:
    if product.id in KEEP_ACTIVE:
        if product.active:
            print(f"✓ Keeping active: {product.id} ({product.name})")
            kept_count += 1
        else:
            print(f"! Activating: {product.id} ({product.name})")
            stripe.Product.modify(product.id, active=True)
            kept_count += 1
    else:
        if product.active:
            print(f"→ Archiving: {product.id} ({product.name})")
            stripe.Product.modify(product.id, active=False)
            archived_count += 1
        else:
            print(f"  Already archived: {product.id} ({product.name})")

print("\n" + "=" * 60)
print(f"Summary: {archived_count} products archived, {kept_count} kept active")
print("=" * 60)
