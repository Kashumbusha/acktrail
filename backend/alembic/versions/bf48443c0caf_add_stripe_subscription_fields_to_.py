"""add_stripe_subscription_fields_to_workspaces

Revision ID: bf48443c0caf
Revises: da1a607e34a7
Create Date: 2025-10-12 12:37:38.696347

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'bf48443c0caf'
down_revision = 'da1a607e34a7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add Stripe subscription tracking fields to workspaces table
    op.add_column('workspaces', sa.Column('stripe_customer_id', sa.String(255), nullable=True))
    op.add_column('workspaces', sa.Column('stripe_subscription_id', sa.String(255), nullable=True))
    op.add_column('workspaces', sa.Column('subscription_status', sa.String(50), nullable=True))
    op.add_column('workspaces', sa.Column('subscription_current_period_end', sa.DateTime(), nullable=True))

    # Create indexes for faster lookups
    op.create_index('ix_workspaces_stripe_customer_id', 'workspaces', ['stripe_customer_id'])
    op.create_index('ix_workspaces_stripe_subscription_id', 'workspaces', ['stripe_subscription_id'])


def downgrade() -> None:
    # Drop indexes first
    op.drop_index('ix_workspaces_stripe_subscription_id', 'workspaces')
    op.drop_index('ix_workspaces_stripe_customer_id', 'workspaces')

    # Drop columns
    op.drop_column('workspaces', 'subscription_current_period_end')
    op.drop_column('workspaces', 'subscription_status')
    op.drop_column('workspaces', 'stripe_subscription_id')
    op.drop_column('workspaces', 'stripe_customer_id')