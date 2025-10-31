"""
Stripe service for handling payments, subscriptions, and billing.

Pricing Model (Flat-rate):
- Small: $99/month (up to 10 staff)
- Medium: $149/month (up to 49 staff)
- Large: $249/month (50+ staff)
- SSO: Included in all plans
- Slack integration: Included in all plans
- Annual billing: 20% discount
"""
import stripe
import logging
from typing import Dict, Optional, List
from datetime import datetime
from ..core.config import settings

logger = logging.getLogger(__name__)

# Initialize Stripe
stripe.api_key = settings.stripe_secret_key

# Flat-rate pricing configuration
PLAN_PRICES = {
    "small": {
        "name": "Small Business Plan",
        "monthly_price_id": "price_1SM6VALvgOLlfex7uHmcYAob",  # $99/month
        "annual_price_id": "price_1SM6VALvgOLlfex7YQltbycI",   # $950/year
        "max_staff": 10,  # Up to 10 staff
        "guest_invites": 50,  # 50 guest invites/mo
        "admins": 1,  # 1 admin
    },
    "medium": {
        "name": "Medium Team Plan",
        "monthly_price_id": "price_1SL8LiLvgOLlfex7oxz8XV7V",  # $149/month
        "annual_price_id": "price_1SODOeLvgOLlfex71Qn4DaP2",   # $1430.40/year
        "min_staff": 11,  # 11-49 staff
        "max_staff": 49,
        "guest_invites": 250,  # 250 guest invites/mo
        "admins": 3,  # 3 admins
    },
    "large": {
        "name": "Large Enterprise Plan",
        "monthly_price_id": "price_1SODOeLvgOLlfex7GErASLgc",  # $249/month
        "annual_price_id": "price_1SODOfLvgOLlfex7Q1FqCJGg",   # $2390.40/year
        "min_staff": 50,  # 50+ staff
        "max_staff": None,  # Unlimited
        "guest_invites": 1000,  # 1000 guest invites/mo
        "admins": None,  # Unlimited admins
    }
}

TRIAL_DAYS = 7
ANNUAL_DISCOUNT = 0.20  # 20% discount for annual billing


class StripeService:
    """Service for handling Stripe operations with flat-rate pricing."""

    @staticmethod
    def create_checkout_session(
        workspace_id: str,
        workspace_name: str,
        email: str,
        plan: str,
        staff_count: int,
        sso_enabled: bool = False,  # Deprecated - SSO now included in all plans
        interval: str = "month",  # month or year
    ) -> Dict:
        """
        Create a Stripe Checkout session with flat-rate pricing.

        Args:
            workspace_id: Workspace UUID
            workspace_name: Workspace name
            email: Customer email
            plan: Plan tier (small, medium, large)
            staff_count: Number of staff users (for record-keeping only)
            sso_enabled: Deprecated - SSO now included in all plans
            interval: Billing interval (month or year)

        Returns:
            Dict with session_id and checkout URL
        """
        try:
            plan_config = PLAN_PRICES.get(plan)
            if not plan_config:
                raise ValueError(f"Invalid plan: {plan}")

            # Get the appropriate price ID based on billing interval
            price_id = plan_config["annual_price_id"] if interval == "year" else plan_config["monthly_price_id"]

            # Single line item for flat-rate pricing
            line_items = [{
                "price": price_id,
                "quantity": 1,
            }]

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
                    "sso_included": "true",  # SSO now included in all plans
                    "billing_interval": interval,
                },
                "subscription_data": {
                    "trial_period_days": TRIAL_DAYS,
                    "metadata": {
                        "workspace_id": workspace_id,
                        "workspace_name": workspace_name,
                        "plan": plan,
                        "staff_count": str(staff_count),
                        "sso_included": "true",
                    },
                },
            }

            session = stripe.checkout.Session.create(**session_params)

            logger.info(
                f"Created checkout session for workspace {workspace_id}: {session.id} "
                f"({plan}, flat-rate, interval={interval})"
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
        Update the staff count (for record-keeping only - flat-rate pricing).

        Args:
            subscription_id: Stripe subscription ID
            new_staff_count: New number of staff users

        Returns:
            Updated subscription object
        """
        try:
            subscription = stripe.Subscription.retrieve(subscription_id)
            existing_metadata = dict(subscription.get("metadata", {}))

            # With flat-rate pricing, we only update metadata (no price changes)
            updated_metadata = {
                **existing_metadata,
                "staff_count": str(new_staff_count),
            }

            updated_subscription = stripe.Subscription.modify(
                subscription_id,
                metadata=updated_metadata,
            )

            logger.info(f"Updated staff count metadata to {new_staff_count} for subscription {subscription_id}")
            return updated_subscription

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
        Change subscription plan (e.g., small to medium) with flat-rate pricing.

        Args:
            subscription_id: Stripe subscription ID
            new_plan: New plan tier
            new_staff_count: Number of staff for new plan (record-keeping only)
            current_interval: Current billing interval

        Returns:
            Updated subscription
        """
        try:
            plan_config = PLAN_PRICES.get(new_plan)
            if not plan_config:
                raise ValueError(f"Invalid plan: {new_plan}")

            subscription = stripe.Subscription.retrieve(subscription_id)
            existing_metadata = dict(subscription.get("metadata", {}))

            # Get new price ID for flat-rate plan
            new_price_id = plan_config["annual_price_id"] if current_interval == "year" else plan_config["monthly_price_id"]

            # Update subscription items (should only be one item with flat-rate)
            items = subscription["items"]["data"]

            if len(items) > 0:
                # Update the first (and should be only) item to the new plan's price
                stripe.SubscriptionItem.modify(
                    items[0].id,
                    price=new_price_id,
                )

            # Update metadata
            updated_metadata = {
                **existing_metadata,
                "plan": new_plan,
                "staff_count": str(new_staff_count),
                "sso_included": "true",
            }
            updated_subscription = stripe.Subscription.modify(
                subscription_id,
                metadata=updated_metadata,
            )

            logger.info(f"Changed plan to {new_plan} for subscription {subscription_id} (flat-rate)")
            return updated_subscription

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
