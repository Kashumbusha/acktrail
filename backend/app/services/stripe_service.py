"""
Stripe service for handling payments, subscriptions, and billing.

Pricing Model:
- Base price + per-staff pricing
- Small: $49 + $5/staff (up to 10 staff)
- Medium: $149 + $1/staff (11-49 staff)
- Large: $299 + $2/staff (50-100 staff)
- SSO Add-on: $199 one-time payment
- Annual billing: 15% discount
"""
import stripe
import logging
from typing import Dict, Optional, List
from datetime import datetime
from ..core.config import settings

logger = logging.getLogger(__name__)

# Initialize Stripe
stripe.api_key = settings.stripe_secret_key

# Plan pricing configuration - Base + Per-Staff Model
PLAN_PRICES = {
    "small": {
        "name": "Small Business",
        "base_price": 49,  # $49/month base
        "per_staff_price": 5,  # $5 per staff member
        "max_staff": 10,  # Up to 10 staff
        "guest_invites": 5,  # 5 guest invites/mo
        "admins": 1,  # 1 admin
        "base_price_id": None,  # Stripe price ID for base
        "per_staff_price_id": None,  # Stripe price ID for per-staff charge
    },
    "medium": {
        "name": "Medium",
        "base_price": 149,  # $149/month base
        "per_staff_price": 1,  # $1 per staff member
        "min_staff": 11,  # 11-49 staff
        "max_staff": 49,
        "guest_invites": 50,  # 50 guest invites/mo
        "admins": 2,  # 2 admins
        "base_price_id": None,
        "per_staff_price_id": None,
    },
    "large": {
        "name": "Large",
        "base_price": 299,  # $299/month base
        "per_staff_price": 2,  # $2 per staff member
        "min_staff": 50,  # 50-100 staff
        "max_staff": 100,
        "guest_invites": 100,  # 100 guest invites/mo
        "admins": 5,  # 5 admins
        "base_price_id": None,
        "per_staff_price_id": None,
    }
}

# SSO Add-on pricing - Recurring monthly add-on
SSO_MONTHLY_PRICE_USD = 50
SSO_RECURRING_PRICE_IDS = {"month": None, "year": None}

TRIAL_DAYS = 7
ANNUAL_DISCOUNT = 0.15  # 15% discount for annual billing


class StripeService:
    """Service for handling Stripe operations with base + per-staff pricing."""

    @staticmethod
    def create_or_get_base_price_id(plan: str, interval: str = "month") -> str:
        """
        Create or retrieve the Stripe price ID for the BASE fee of a plan.

        Args:
            plan: Plan tier (small, medium, large)
            interval: Billing interval (month or year)

        Returns:
            Stripe price ID for the base fee
        """
        try:
            plan_config = PLAN_PRICES.get(plan)
            if not plan_config:
                raise ValueError(f"Invalid plan: {plan}")

            # Check if we've already created this price
            if plan_config["base_price_id"]:
                return plan_config["base_price_id"]

            base_price = plan_config["base_price"]

            # Apply annual discount if yearly billing
            if interval == "year":
                base_price = int(base_price * 12 * (1 - ANNUAL_DISCOUNT))

            # Create the base price in Stripe
            price = stripe.Price.create(
                unit_amount=base_price * 100,  # Convert to cents
                currency="usd",
                recurring={"interval": interval},
                product_data={
                    "name": f"{plan_config['name']} - Base Fee",
                },
            )

            # Cache it (note: in production, you'd want per-interval caching)
            plan_config["base_price_id"] = price.id
            logger.info(f"Created base price for {plan} ({interval}): {price.id}")
            return price.id

        except stripe.error.StripeError as e:
            logger.error(f"Error creating base price: {str(e)}")
            raise

    @staticmethod
    def create_or_get_per_staff_price_id(plan: str, interval: str = "month") -> str:
        """
        Create or retrieve the Stripe price ID for PER-STAFF fee of a plan.

        Args:
            plan: Plan tier (small, medium, large)
            interval: Billing interval (month or year)

        Returns:
            Stripe price ID for per-staff charges
        """
        try:
            plan_config = PLAN_PRICES.get(plan)
            if not plan_config:
                raise ValueError(f"Invalid plan: {plan}")

            # Check if we've already created this price
            if plan_config["per_staff_price_id"]:
                return plan_config["per_staff_price_id"]

            per_staff_price = plan_config["per_staff_price"]

            # Apply annual discount if yearly billing
            if interval == "year":
                per_staff_price = int(per_staff_price * 12 * (1 - ANNUAL_DISCOUNT))

            # Create the per-staff price in Stripe
            price = stripe.Price.create(
                unit_amount=per_staff_price * 100,  # Convert to cents
                currency="usd",
                recurring={"interval": interval},
                product_data={
                    "name": f"{plan_config['name']} - Per Staff",
                },
            )

            # Cache it
            plan_config["per_staff_price_id"] = price.id
            logger.info(f"Created per-staff price for {plan} ({interval}): {price.id}")
            return price.id

        except stripe.error.StripeError as e:
            logger.error(f"Error creating per-staff price: {str(e)}")
            raise

    @staticmethod
    def create_or_get_sso_recurring_price_id(interval: str = "month") -> str:
        """
        Create or retrieve the Stripe price ID for SSO recurring add-on.

        Args:
            interval: Billing interval (month or year)

        Returns:
            Stripe price ID for SSO recurring add-on
        """
        try:
            if interval not in ("month", "year"):
                raise ValueError("interval must be 'month' or 'year'")

            if SSO_RECURRING_PRICE_IDS[interval]:
                return SSO_RECURRING_PRICE_IDS[interval]

            price_amount = SSO_MONTHLY_PRICE_USD
            if interval == "year":
                price_amount = int(SSO_MONTHLY_PRICE_USD * 12 * (1 - ANNUAL_DISCOUNT))

            price = stripe.Price.create(
                unit_amount=price_amount * 100,
                currency="usd",
                recurring={"interval": interval},
                product_data={
                    "name": "SSO Add-on",
                },
            )

            SSO_RECURRING_PRICE_IDS[interval] = price.id
            logger.info(f"Created SSO recurring price ({interval}): {price.id}")
            return price.id

        except stripe.error.StripeError as e:
            logger.error(f"Error creating SSO recurring price: {str(e)}")
            raise

    @staticmethod
    def create_checkout_session(
        workspace_id: str,
        workspace_name: str,
        email: str,
        plan: str,
        staff_count: int,
        sso_enabled: bool = False,
        interval: str = "month",  # month or year
    ) -> Dict:
        """
        Create a Stripe Checkout session with base + per-staff pricing.

        Args:
            workspace_id: Workspace UUID
            workspace_name: Workspace name
            email: Customer email
            plan: Plan tier (small, medium, large)
            staff_count: Number of staff users
            sso_enabled: Whether to add SSO one-time payment
            interval: Billing interval (month or year)

        Returns:
            Dict with session_id and checkout URL
        """
        try:
            line_items = []

            # 1. Add base subscription price (quantity: 1)
            base_price_id = StripeService.create_or_get_base_price_id(plan, interval)
            line_items.append({
                "price": base_price_id,
                "quantity": 1,
            })

            # 2. Add per-staff price (quantity: staff_count)
            if staff_count > 0:
                per_staff_price_id = StripeService.create_or_get_per_staff_price_id(plan, interval)
                line_items.append({
                    "price": per_staff_price_id,
                    "quantity": staff_count,
                })

            # Create checkout session
            session_params = {
                "payment_method_types": ["card"],
                "line_items": line_items,
                "mode": "subscription",
                "success_url": f"{settings.frontend_url}/signup/success?session_id={{CHECKOUT_SESSION_ID}}",
                "cancel_url": f"{settings.frontend_url}/signup/cancelled",
                "customer_email": email,
                "client_reference_id": workspace_id,
                "metadata": {
                    "workspace_id": workspace_id,
                    "workspace_name": workspace_name,
                    "plan": plan,
                    "staff_count": str(staff_count),
                    "sso_enabled": str(sso_enabled),
                    "billing_interval": interval,
                },
                "subscription_data": {
                    "trial_period_days": TRIAL_DAYS,
                    "metadata": {
                        "workspace_id": workspace_id,
                        "workspace_name": workspace_name,
                        "plan": plan,
                        "staff_count": str(staff_count),
                        "sso_enabled": str(sso_enabled),
                    },
                },
            }

            # Add SSO recurring add-on as a separate subscription item
            if sso_enabled:
                sso_price_id = StripeService.create_or_get_sso_recurring_price_id(interval)
                line_items.append({
                    "price": sso_price_id,
                    "quantity": 1,
                })

            session = stripe.checkout.Session.create(**session_params)

            logger.info(
                f"Created checkout session for workspace {workspace_id}: {session.id} "
                f"({plan}, {staff_count} staff, interval={interval}, SSO={sso_enabled})"
            )

            return {
                "session_id": session.id,
                "url": session.url,
            }

        except stripe.error.StripeError as e:
            logger.error(f"Error creating checkout session: {str(e)}")
            raise

    @staticmethod
    def add_sso_one_time_charge(customer_id: str) -> stripe.InvoiceItem:
        """
        Add SSO as a one-time invoice item to customer's next invoice.

        Args:
            customer_id: Stripe customer ID

        Returns:
            Created invoice item
        """
        try:
            invoice_item = stripe.InvoiceItem.create(
                customer=customer_id,
                amount=SSO_ADDON_PRICE["price"] * 100,  # Convert to cents
                currency="usd",
                description="SSO Add-on (one-time setup fee)",
            )
            logger.info(f"Added SSO one-time charge to customer {customer_id}")
            return invoice_item
        except stripe.error.StripeError as e:
            logger.error(f"Error adding SSO charge: {str(e)}")
            raise

    @staticmethod
    def update_subscription_staff_count(subscription_id: str, new_staff_count: int) -> stripe.Subscription:
        """
        Update the staff count (quantity) on an existing subscription.

        Args:
            subscription_id: Stripe subscription ID
            new_staff_count: New number of staff users

        Returns:
            Updated subscription object
        """
        try:
            subscription = stripe.Subscription.retrieve(subscription_id)

            # Find the per-staff line item and update its quantity
            for item in subscription["items"]["data"]:
                price = stripe.Price.retrieve(item.price.id)
                product = stripe.Product.retrieve(price.product)

                # Check if this is the per-staff item
                if "Per Staff" in product.name:
                    stripe.SubscriptionItem.modify(
                        item.id,
                        quantity=new_staff_count,
                    )
                    logger.info(f"Updated staff count to {new_staff_count} for subscription {subscription_id}")
                    break

            return stripe.Subscription.retrieve(subscription_id)

        except stripe.error.StripeError as e:
            logger.error(f"Error updating staff count: {str(e)}")
            raise

    @staticmethod
    def change_plan(
        subscription_id: str,
        new_plan: str,
        new_staff_count: int,
        current_interval: str = "month"
    ) -> stripe.Subscription:
        """
        Change subscription plan (e.g., small to medium).

        Args:
            subscription_id: Stripe subscription ID
            new_plan: New plan tier
            new_staff_count: Number of staff for new plan
            current_interval: Current billing interval

        Returns:
            Updated subscription
        """
        try:
            subscription = stripe.Subscription.retrieve(subscription_id)

            # Get new price IDs
            new_base_price_id = StripeService.create_or_get_base_price_id(new_plan, current_interval)
            new_per_staff_price_id = StripeService.create_or_get_per_staff_price_id(new_plan, current_interval)

            # Update subscription items
            items = subscription["items"]["data"]

            for item in items:
                price = stripe.Price.retrieve(item.price.id)
                product = stripe.Product.retrieve(price.product)

                if "Base Fee" in product.name:
                    # Update base price
                    stripe.SubscriptionItem.modify(item.id, price=new_base_price_id)
                elif "Per Staff" in product.name:
                    # Update per-staff price and quantity
                    stripe.SubscriptionItem.modify(
                        item.id,
                        price=new_per_staff_price_id,
                        quantity=new_staff_count,
                    )

            logger.info(f"Changed plan to {new_plan} for subscription {subscription_id}")
            return stripe.Subscription.retrieve(subscription_id)

        except stripe.error.StripeError as e:
            logger.error(f"Error changing plan: {str(e)}")
            raise

    @staticmethod
    def cancel_subscription(subscription_id: str, at_period_end: bool = True) -> stripe.Subscription:
        """Cancel a subscription."""
        try:
            subscription = stripe.Subscription.modify(
                subscription_id,
                cancel_at_period_end=at_period_end,
            )
            logger.info(f"Cancelled subscription: {subscription_id}")
            return subscription
        except stripe.error.StripeError as e:
            logger.error(f"Error cancelling subscription: {str(e)}")
            raise

    @staticmethod
    def create_customer_portal_session(customer_id: str) -> Dict:
        """Create a customer portal session for managing subscriptions."""
        try:
            session = stripe.billing_portal.Session.create(
                customer=customer_id,
                return_url=f"{settings.frontend_url}/dashboard",
            )
            logger.info(f"Created portal session for customer: {customer_id}")
            return {
                "url": session.url,
            }
        except stripe.error.StripeError as e:
            logger.error(f"Error creating portal session: {str(e)}")
            raise

    @staticmethod
    def get_subscription(subscription_id: str) -> stripe.Subscription:
        """Retrieve a subscription."""
        try:
            return stripe.Subscription.retrieve(subscription_id)
        except stripe.error.StripeError as e:
            logger.error(f"Error retrieving subscription: {str(e)}")
            raise

    @staticmethod
    def get_customer(customer_id: str) -> stripe.Customer:
        """Retrieve a customer."""
        try:
            return stripe.Customer.retrieve(customer_id)
        except stripe.error.StripeError as e:
            logger.error(f"Error retrieving customer: {str(e)}")
            raise

    @staticmethod
    def list_invoices(customer_id: str, limit: int = 10) -> List[stripe.Invoice]:
        """List invoices for a customer."""
        try:
            invoices = stripe.Invoice.list(customer=customer_id, limit=limit)
            return invoices.data
        except stripe.error.StripeError as e:
            logger.error(f"Error listing invoices: {str(e)}")
            raise

    @staticmethod
    def get_upcoming_invoice(customer_id: str) -> Optional[stripe.Invoice]:
        """Get the upcoming invoice for a customer."""
        try:
            return stripe.Invoice.upcoming(customer=customer_id)
        except stripe.error.InvalidRequestError:
            # No upcoming invoice
            return None
        except stripe.error.StripeError as e:
            logger.error(f"Error getting upcoming invoice: {str(e)}")
            raise

    @staticmethod
    def construct_webhook_event(payload: bytes, sig_header: str) -> stripe.Event:
        """
        Construct and verify a webhook event from Stripe.
        """
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.stripe_webhook_secret
            )
            return event
        except ValueError as e:
            logger.error(f"Invalid payload: {str(e)}")
            raise
        except stripe.error.SignatureVerificationError as e:
            logger.error(f"Invalid signature: {str(e)}")
            raise
