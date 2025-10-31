"""
Configure Stripe Customer Portal to allow plan switching between the three active plans.
"""
import stripe
import os
from dotenv import load_dotenv

load_dotenv()
stripe.api_key = os.getenv('STRIPE_SECRET_KEY')

# The three active products with their prices that should be available for switching
ACTIVE_PRODUCTS_WITH_PRICES = [
    {
        "product": 'prod_THhlVR1FJ4jGeJ',  # Small Business Plan
        "prices": [
            'price_1SM6VALvgOLlfex7uHmcYAob',  # $99/month
            'price_1SM6VALvgOLlfex7YQltbycI',  # $950/year
        ]
    },
    {
        "product": 'prod_THhlop45Qh07j5',  # Medium Team Plan
        "prices": [
            'price_1SL8LiLvgOLlfex7oxz8XV7V',  # $149/month
            'price_1SODOeLvgOLlfex71Qn4DaP2',  # $1430.40/year
        ]
    },
    {
        "product": 'prod_TEgEVEWIR1lTfs',  # Large Enterprise Plan
        "prices": [
            'price_1SODOeLvgOLlfex7GErASLgc',  # $249/month
            'price_1SODOfLvgOLlfex7Q1FqCJGg',  # $2390.40/year
        ]
    },
]

print("Checking current Customer Portal configuration...")
print("=" * 60)

# List all portal configurations
configurations = stripe.billing_portal.Configuration.list(limit=10)

if configurations.data:
    config = configurations.data[0]  # Get the most recent one
    print(f"Current portal configuration: {config.id}")
    print(f"Active: {config.active}")
    print(f"\nCurrent features:")
    if config.features.subscription_update:
        print(f"  Subscription update enabled: {config.features.subscription_update.enabled}")
        if config.features.subscription_update.enabled:
            print(f"  Proration behavior: {config.features.subscription_update.proration_behavior}")
    print()

print("Creating new Customer Portal configuration...")
print("=" * 60)

# Create a new portal configuration that allows switching between all active plans
try:
    new_config = stripe.billing_portal.Configuration.create(
        business_profile={
            "headline": "Acktrail partners with Stripe for simplified billing.",
        },
        features={
            "customer_update": {
                "enabled": True,
                "allowed_updates": ["email", "address"],
            },
            "invoice_history": {
                "enabled": True,
            },
            "payment_method_update": {
                "enabled": True,
            },
            "subscription_cancel": {
                "enabled": True,
                "mode": "at_period_end",
            },
            "subscription_update": {
                "enabled": True,
                "default_allowed_updates": ["price"],
                "proration_behavior": "create_prorations",
                "products": ACTIVE_PRODUCTS_WITH_PRICES,
            },
        },
    )

    print(f"✓ Created new portal configuration: {new_config.id}")
    print(f"  Status: Active")
    print(f"  Subscription updates enabled: {new_config.features.subscription_update.enabled}")
    print(f"  Available products: {len(ACTIVE_PRODUCTS_WITH_PRICES)}")
    print()
    print("Products configured:")
    for product_config in ACTIVE_PRODUCTS_WITH_PRICES:
        product = stripe.Product.retrieve(product_config['product'])
        print(f"  - {product.name} ({product_config['product']})")
        print(f"    Prices: {len(product_config['prices'])} price options")

    print("\n" + "=" * 60)
    print("✓ Customer Portal is now configured!")
    print("Customers can now switch between all three plans.")
    print("=" * 60)

except Exception as e:
    print(f"✗ Error creating portal configuration: {str(e)}")
