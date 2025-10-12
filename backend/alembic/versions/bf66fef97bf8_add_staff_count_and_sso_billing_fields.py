"""add_staff_count_and_sso_billing_fields

Revision ID: bf66fef97bf8
Revises: bf48443c0caf
Create Date: 2025-10-12 12:59:05.301978

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'bf66fef97bf8'
down_revision = 'bf48443c0caf'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add billing-related fields to workspaces table
    op.add_column('workspaces', sa.Column('active_staff_count', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('workspaces', sa.Column('billing_interval', sa.String(20), nullable=False, server_default='monthly'))
    op.add_column('workspaces', sa.Column('sso_purchased', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('workspaces', sa.Column('sso_purchased_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    # Drop the billing fields
    op.drop_column('workspaces', 'sso_purchased_at')
    op.drop_column('workspaces', 'sso_purchased')
    op.drop_column('workspaces', 'billing_interval')
    op.drop_column('workspaces', 'active_staff_count')