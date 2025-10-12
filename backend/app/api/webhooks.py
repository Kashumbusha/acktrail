"""
Webhook endpoints for Stripe events.
"""
from fastapi import APIRouter, Request, HTTPException, Depends, status
from sqlalchemy.orm import Session
from datetime import datetime
from uuid import UUID
import logging

from ..models.database import get_db
from ..models.models import Workspace, PlanTier
from ..services.stripe_service import StripeService

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/stripe")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Handle Stripe webhook events.

    Important events to handle:
    - checkout.session.completed: When payment is successful
    - customer.subscription.created: When subscription is created
    - customer.subscription.updated: When subscription is updated (plan change, etc.)
    - customer.subscription.deleted: When subscription is cancelled
    - customer.subscription.trial_will_end: 3 days before trial ends
    - invoice.paid: When invoice is paid
    - invoice.payment_failed: When payment fails
    """
    try:
        # Get the raw body and signature
        payload = await request.body()
        sig_header = request.headers.get("stripe-signature")

        if not sig_header:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing stripe-signature header"
            )

        # Verify and construct the event
        try:
            event = StripeService.construct_webhook_event(payload, sig_header)
        except ValueError as e:
            logger.error(f"Invalid payload: {str(e)}")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid payload")
        except Exception as e:
            logger.error(f"Invalid signature: {str(e)}")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid signature")

        logger.info(f"Received Stripe webhook event: {event.type}")

        # Handle different event types
        if event.type == "checkout.session.completed":
            handle_checkout_completed(event.data.object, db)

        elif event.type == "customer.subscription.created":
            handle_subscription_created(event.data.object, db)

        elif event.type == "customer.subscription.updated":
            handle_subscription_updated(event.data.object, db)

        elif event.type == "customer.subscription.deleted":
            handle_subscription_deleted(event.data.object, db)

        elif event.type == "customer.subscription.trial_will_end":
            handle_trial_will_end(event.data.object, db)

        elif event.type == "invoice.paid":
            handle_invoice_paid(event.data.object, db)

        elif event.type == "invoice.payment_failed":
            handle_payment_failed(event.data.object, db)

        else:
            logger.info(f"Unhandled event type: {event.type}")

        return {"received": True}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing webhook: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process webhook"
        )


def handle_checkout_completed(session, db: Session):
    """
    Handle successful checkout completion.
    Updates workspace with Stripe customer and subscription info.
    """
    try:
        workspace_id = session.metadata.get("workspace_id")
        if not workspace_id:
            logger.error("No workspace_id in checkout session metadata")
            return

        workspace = db.query(Workspace).filter(Workspace.id == UUID(workspace_id)).first()
        if not workspace:
            logger.error(f"Workspace not found: {workspace_id}")
            return

        # Update workspace with Stripe info
        workspace.stripe_customer_id = session.customer
        workspace.stripe_subscription_id = session.subscription

        # Extract billing information from metadata
        staff_count = session.metadata.get("staff_count", "1")
        billing_interval = session.metadata.get("billing_interval", "month")
        sso_enabled = session.metadata.get("sso_enabled", "false").lower() == "true"

        # Update workspace billing fields
        workspace.staff_count = int(staff_count)  # Licensed seats purchased
        workspace.billing_interval = "annual" if billing_interval == "year" else "monthly"

        # Get subscription details from Stripe to update status
        if session.subscription:
            subscription = StripeService.get_subscription(session.subscription)
            workspace.subscription_status = subscription.status
            workspace.subscription_current_period_end = datetime.fromtimestamp(
                subscription.current_period_end
            )

            # Update trial end date if in trial
            if subscription.trial_end:
                workspace.trial_ends_at = datetime.fromtimestamp(subscription.trial_end)

        # Mark SSO as enabled when selected at checkout (now recurring add-on)
        if sso_enabled and not workspace.sso_enabled:
            workspace.sso_enabled = True

        db.commit()
        logger.info(f"Updated workspace {workspace_id} with Stripe subscription (staff_count={staff_count}, interval={billing_interval})")

    except Exception as e:
        logger.error(f"Error handling checkout completed: {str(e)}")
        db.rollback()


def handle_subscription_created(subscription, db: Session):
    """Handle subscription creation."""
    try:
        customer_id = subscription.customer

        # Find workspace by customer ID
        workspace = db.query(Workspace).filter(
            Workspace.stripe_customer_id == customer_id
        ).first()

        if not workspace:
            logger.error(f"Workspace not found for customer: {customer_id}")
            return

        # Update subscription info
        workspace.stripe_subscription_id = subscription.id
        workspace.subscription_status = subscription.status
        workspace.subscription_current_period_end = datetime.fromtimestamp(
            subscription.current_period_end
        )

        if subscription.trial_end:
            workspace.trial_ends_at = datetime.fromtimestamp(subscription.trial_end)

        # Extract staff count from subscription metadata if available
        metadata = subscription.get("metadata", {})
        if "staff_count" in metadata:
            workspace.staff_count = int(metadata["staff_count"])  # Licensed seats

        db.commit()
        logger.info(f"Subscription created for workspace {workspace.id}")

    except Exception as e:
        logger.error(f"Error handling subscription created: {str(e)}")
        db.rollback()


def handle_subscription_updated(subscription, db: Session):
    """
    Handle subscription updates (plan changes, staff count changes, etc.).
    """
    try:
        # Find workspace by subscription ID
        workspace = db.query(Workspace).filter(
            Workspace.stripe_subscription_id == subscription.id
        ).first()

        if not workspace:
            logger.error(f"Workspace not found for subscription: {subscription.id}")
            return

        # Update subscription status and period
        workspace.subscription_status = subscription.status
        workspace.subscription_current_period_end = datetime.fromtimestamp(
            subscription.current_period_end
        )

        # Extract staff count from subscription metadata if available
        metadata = subscription.get("metadata", {})
        if "staff_count" in metadata:
            workspace.staff_count = int(metadata["staff_count"])  # Update licensed seats
            logger.info(f"Updated licensed seats to {workspace.staff_count} for workspace {workspace.id}")

        # Extract plan from metadata if available
        if "plan" in metadata:
            try:
                workspace.plan = PlanTier(metadata["plan"])
                logger.info(f"Updated plan to {metadata['plan']} for workspace {workspace.id}")
            except ValueError:
                logger.error(f"Invalid plan tier in metadata: {metadata['plan']}")

        # Note: SSO is handled as one-time invoice item, not subscription item
        # SSO status is tracked separately via sso_purchased field

        db.commit()
        logger.info(f"Subscription updated for workspace {workspace.id}")

    except Exception as e:
        logger.error(f"Error handling subscription updated: {str(e)}")
        db.rollback()


def handle_subscription_deleted(subscription, db: Session):
    """Handle subscription cancellation."""
    try:
        # Find workspace by subscription ID
        workspace = db.query(Workspace).filter(
            Workspace.stripe_subscription_id == subscription.id
        ).first()

        if not workspace:
            logger.error(f"Workspace not found for subscription: {subscription.id}")
            return

        # Update subscription status
        workspace.subscription_status = "canceled"
        workspace.stripe_subscription_id = None  # Clear subscription ID

        db.commit()
        logger.info(f"Subscription deleted for workspace {workspace.id}")

    except Exception as e:
        logger.error(f"Error handling subscription deleted: {str(e)}")
        db.rollback()


def handle_trial_will_end(subscription, db: Session):
    """
    Handle trial ending soon (3 days before).
    You might want to send an email notification here.
    """
    try:
        # Find workspace by subscription ID
        workspace = db.query(Workspace).filter(
            Workspace.stripe_subscription_id == subscription.id
        ).first()

        if not workspace:
            logger.error(f"Workspace not found for subscription: {subscription.id}")
            return

        # TODO: Send email notification to workspace admin
        # You could use the Brevo API here to send a reminder email

        logger.info(f"Trial ending soon for workspace {workspace.id}")

    except Exception as e:
        logger.error(f"Error handling trial will end: {str(e)}")


def handle_invoice_paid(invoice, db: Session):
    """Handle successful invoice payment."""
    try:
        customer_id = invoice.customer

        # Find workspace by customer ID
        workspace = db.query(Workspace).filter(
            Workspace.stripe_customer_id == customer_id
        ).first()

        if not workspace:
            logger.error(f"Workspace not found for customer: {customer_id}")
            return

        # Update subscription status to active if it was in trial or past_due
        if workspace.subscription_status in ["trialing", "past_due"]:
            workspace.subscription_status = "active"
            db.commit()

        logger.info(f"Invoice paid for workspace {workspace.id}")

        # TODO: You might want to send a receipt email here

    except Exception as e:
        logger.error(f"Error handling invoice paid: {str(e)}")
        db.rollback()


def handle_payment_failed(invoice, db: Session):
    """Handle failed payment."""
    try:
        customer_id = invoice.customer

        # Find workspace by customer ID
        workspace = db.query(Workspace).filter(
            Workspace.stripe_customer_id == customer_id
        ).first()

        if not workspace:
            logger.error(f"Workspace not found for customer: {customer_id}")
            return

        # Update subscription status
        workspace.subscription_status = "past_due"
        db.commit()

        logger.warning(f"Payment failed for workspace {workspace.id}")

        # TODO: Send email notification about failed payment

    except Exception as e:
        logger.error(f"Error handling payment failed: {str(e)}")
        db.rollback()
