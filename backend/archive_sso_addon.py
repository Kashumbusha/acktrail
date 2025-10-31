"""
Archive SSO Add-on products since SSO is now included in all plans.
"""
import stripe
import os
from dotenv import load_dotenv

load_dotenv()
stripe.api_key = os.getenv('STRIPE_SECRET_KEY')

print("Fetching SSO Add-on products...")
print("=" * 60)

# Get all products
all_products = stripe.Product.list(limit=100)

sso_products = [p for p in all_products.data if 'SSO' in p.name or 'sso' in p.name.lower()]

print(f"Found {len(sso_products)} SSO-related products\n")

for product in sso_products:
    if product.active:
        print(f"Archiving: {product.id} ({product.name})")
        stripe.Product.modify(product.id, active=False)
    else:
        print(f"Already archived: {product.id} ({product.name})")

print("\n" + "=" * 60)
print("✓ SSO Add-on products archived")
print("SSO is now included in all plans, no separate add-on needed")
print("=" * 60)
