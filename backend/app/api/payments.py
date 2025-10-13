"""
Payment API endpoints for Stripe integration.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Dict, List
from datetime import datetime
from uuid import UUID
import logging
import stripe

from ..models.database import get_db
from ..models.models import Workspace
from ..services.stripe_service import StripeService
from .auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter()


# Request/Response Models
class CreateCheckoutSessionRequest(BaseModel):
    plan: str  # small, medium, large
    staff_count: int  # Number of staff members for billing
    interval: str = "month"  # month or year
    sso_enabled: bool = False


class CreateCheckoutSessionResponse(BaseModel):
    session_id: str
    url: str


class SubscriptionInfo(BaseModel):
    status: Optional[str]
    current_period_end: Optional[datetime]
    plan: str
    sso_enabled: bool
    trial_ends_at: Optional[datetime]
    stripe_customer_id: Optional[str]
    stripe_subscription_id: Optional[str]
    staff_count: int  # Licensed seats
    active_staff_count: int  # Actual invited users
    billing_interval: str
    sso_purchased: bool


class UpdateSubscriptionRequest(BaseModel):
    new_plan: Optional[str] = None
    new_staff_count: Optional[int] = None
    add_sso: Optional[bool] = None  # kept for backward compat (no-op now)
    enable_sso: Optional[bool] = None  # new: toggle SSO recurring add-on on/off
    disable_sso: Optional[bool] = None


class InvoiceInfo(BaseModel):
    id: str
    amount_due: int
    amount_paid: int
    currency: str
    status: str
    created: datetime
    period_start: datetime
    period_end: datetime
    invoice_pdf: Optional[str]
    hosted_invoice_url: Optional[str]


@router.post("/create-checkout-session", response_model=CreateCheckoutSessionResponse)
def create_checkout_session(
    request: CreateCheckoutSessionRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a Stripe Checkout session for subscription signup.
    This is called during team registration after workspace is created.
    """
    try:
        workspace_id = current_user.get("workspace_id")
        if not workspace_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User not associated with a workspace"
            )

        # Get workspace
        workspace = db.query(Workspace).filter(Workspace.id == UUID(workspace_id)).first()
        if not workspace:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workspace not found"
            )

        # Check if workspace already has a subscription
        if workspace.stripe_subscription_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Workspace already has an active subscription"
            )

        # Create checkout session
        session = StripeService.create_checkout_session(
            workspace_id=str(workspace.id),
            workspace_name=workspace.name,
            email=current_user.get("email"),
            plan=request.plan,
            staff_count=request.staff_count,
            sso_enabled=request.sso_enabled,
            interval=request.interval,
        )

        return CreateCheckoutSessionResponse(**session)

    except HTTPException:
        raise
    except Exception as e:
        # Surface Stripe error message when available
        logger.error(f"Error creating checkout session: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create checkout session: {str(e)}"
        )


@router.get("/subscription", response_model=SubscriptionInfo)
def get_subscription(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current subscription information for the workspace.
    """
    try:
        workspace_id = current_user.get("workspace_id")
        if not workspace_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User not associated with a workspace"
            )

        workspace = db.query(Workspace).filter(Workspace.id == UUID(workspace_id)).first()
        if not workspace:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workspace not found"
            )

        plan_value = workspace.plan.value if getattr(workspace, "plan", None) else "small"
        billing_interval = workspace.billing_interval or "monthly"

        return SubscriptionInfo(
            status=workspace.subscription_status,
            current_period_end=workspace.subscription_current_period_end,
            plan=plan_value,
            sso_enabled=workspace.sso_enabled or workspace.sso_purchased,  # SSO is enabled if purchased OR recurring
            trial_ends_at=workspace.trial_ends_at,
            stripe_customer_id=workspace.stripe_customer_id,
            stripe_subscription_id=workspace.stripe_subscription_id,
            staff_count=workspace.staff_count or 1,  # Licensed seats
            active_staff_count=workspace.active_staff_count or 0,  # Actual invited users
            billing_interval=billing_interval,
            sso_purchased=workspace.sso_purchased,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting subscription: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get subscription information"
        )


@router.post("/subscription/update")
def update_subscription(
    request: UpdateSubscriptionRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update subscription (change plan or add/remove SSO).
    Requires admin role.
    """
    try:
        # Check if user is admin
        if current_user.get("role") != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can update subscriptions"
            )

        workspace_id = current_user.get("workspace_id")
        if not workspace_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User not associated with a workspace"
            )

        workspace = db.query(Workspace).filter(Workspace.id == UUID(workspace_id)).first()
        if not workspace:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workspace not found"
            )

        if not workspace.stripe_subscription_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No active subscription to update"
            )

        updated_subscription = None

        # Handle plan change
        if request.new_plan:
            if not request.new_staff_count:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="new_staff_count is required when changing plans"
                )

            updated_subscription = StripeService.change_plan(
                subscription_id=workspace.stripe_subscription_id,
                new_plan=request.new_plan,
                new_staff_count=request.new_staff_count,
                current_interval=workspace.billing_interval.replace("monthly", "month").replace("annual", "year")
            )

            from ..models.models import PlanTier
            workspace.plan = PlanTier(request.new_plan)
            workspace.staff_count = request.new_staff_count  # Update licensed seats

        # Handle staff count update (without plan change)
        elif request.new_staff_count is not None:
            updated_subscription = StripeService.update_subscription_staff_count(
                subscription_id=workspace.stripe_subscription_id,
                new_staff_count=request.new_staff_count
            )
            workspace.staff_count = request.new_staff_count  # Update licensed seats

        # Handle SSO recurring add-on toggle
        if request.enable_sso and not workspace.sso_enabled:
            if not workspace.stripe_subscription_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No active subscription to modify"
                )
            try:
                interval = (workspace.billing_interval or "monthly").replace("monthly", "month").replace("annual", "year")
                sso_price_id = StripeService.create_or_get_sso_recurring_price_id(interval)
                stripe.SubscriptionItem.create(
                    subscription=workspace.stripe_subscription_id,
                    price=sso_price_id,
                    quantity=1,
                )
                workspace.sso_enabled = True
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Failed to enable SSO add-on: {str(e)}")

        if request.disable_sso and workspace.sso_enabled:
            if not workspace.stripe_subscription_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No active subscription to modify"
                )
            try:
                # Find and remove the SSO item from the subscription
                subscription = StripeService.get_subscription(workspace.stripe_subscription_id)
                for item in subscription["items"]["data"]:
                    price = stripe.Price.retrieve(item.price.id)
                    product = stripe.Product.retrieve(price.product)
                    if product.name == "SSO Add-on":
                        stripe.SubscriptionItem.delete(item.id)
                        break
                workspace.sso_enabled = False
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Failed to disable SSO add-on: {str(e)}")

        # Update subscription status if we made changes
        if updated_subscription:
            workspace.subscription_status = updated_subscription.status
            workspace.subscription_current_period_end = datetime.fromtimestamp(
                updated_subscription.current_period_end
            )

        db.commit()

        return {
            "success": True,
            "message": "Subscription updated successfully",
            "subscription": {
                "status": workspace.subscription_status,
                "plan": workspace.plan.value if workspace.plan else "small",
                "sso_enabled": workspace.sso_enabled,
                "staff_count": workspace.staff_count,
                "active_staff_count": workspace.active_staff_count,
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating subscription: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update subscription: {str(e)}"
        )


@router.post("/subscription/cancel")
def cancel_subscription(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Cancel subscription at end of billing period.
    Requires admin role.
    """
    try:
        # Check if user is admin
        if current_user.get("role") != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can cancel subscriptions"
            )

        workspace_id = current_user.get("workspace_id")
        if not workspace_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User not associated with a workspace"
            )

        workspace = db.query(Workspace).filter(Workspace.id == UUID(workspace_id)).first()
        if not workspace:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workspace not found"
            )

        if not workspace.stripe_subscription_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No active subscription to cancel"
            )

        # Cancel subscription in Stripe
        canceled_subscription = StripeService.cancel_subscription(
            subscription_id=workspace.stripe_subscription_id,
            at_period_end=True
        )

        # Update workspace status
        workspace.subscription_status = canceled_subscription.status

        db.commit()

        return {
            "success": True,
            "message": "Subscription will be cancelled at end of billing period",
            "cancel_at": datetime.fromtimestamp(canceled_subscription.cancel_at).isoformat()
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelling subscription: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cancel subscription"
        )


@router.post("/customer-portal")
def create_customer_portal_session(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a Stripe Customer Portal session for managing subscription.
    """
    try:
        workspace_id = current_user.get("workspace_id")
        if not workspace_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User not associated with a workspace"
            )

        workspace = db.query(Workspace).filter(Workspace.id == UUID(workspace_id)).first()
        if not workspace:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workspace not found"
            )

        if not workspace.stripe_customer_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No Stripe customer found for this workspace"
            )

        # Create portal session
        session = StripeService.create_customer_portal_session(
            customer_id=workspace.stripe_customer_id
        )

        return {"url": session["url"]}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating portal session: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create customer portal session"
        )


@router.get("/invoices", response_model=List[InvoiceInfo])
def list_invoices(
    limit: int = 10,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List invoices for the workspace.
    """
    try:
        workspace_id = current_user.get("workspace_id")
        if not workspace_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User not associated with a workspace"
            )

        workspace = db.query(Workspace).filter(Workspace.id == UUID(workspace_id)).first()
        if not workspace:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workspace not found"
            )

        if not workspace.stripe_customer_id:
            return []

        # Get invoices from Stripe
        invoices = StripeService.list_invoices(
            customer_id=workspace.stripe_customer_id,
            limit=limit
        )

        return [
            InvoiceInfo(
                id=invoice.id,
                amount_due=invoice.amount_due,
                amount_paid=invoice.amount_paid,
                currency=invoice.currency,
                status=invoice.status,
                created=datetime.fromtimestamp(invoice.created),
                period_start=datetime.fromtimestamp(invoice.period_start),
                period_end=datetime.fromtimestamp(invoice.period_end),
                invoice_pdf=invoice.invoice_pdf,
                hosted_invoice_url=invoice.hosted_invoice_url,
            )
            for invoice in invoices
        ]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing invoices: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list invoices"
        )


@router.get("/upcoming-invoice")
def get_upcoming_invoice(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get the upcoming invoice for the workspace.
    """
    try:
        workspace_id = current_user.get("workspace_id")
        if not workspace_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User not associated with a workspace"
            )

        workspace = db.query(Workspace).filter(Workspace.id == UUID(workspace_id)).first()
        if not workspace:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workspace not found"
            )

        if not workspace.stripe_customer_id:
            return {"upcoming_invoice": None}

        # Get upcoming invoice from Stripe
        invoice = StripeService.get_upcoming_invoice(customer_id=workspace.stripe_customer_id)

        if not invoice:
            return {"upcoming_invoice": None}

        return {
            "upcoming_invoice": {
                "amount_due": invoice.amount_due,
                "currency": invoice.currency,
                "period_start": datetime.fromtimestamp(invoice.period_start).isoformat(),
                "period_end": datetime.fromtimestamp(invoice.period_end).isoformat(),
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting upcoming invoice: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get upcoming invoice"
        )
