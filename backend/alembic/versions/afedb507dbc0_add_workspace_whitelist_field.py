"""add_workspace_whitelist_field

Revision ID: afedb507dbc0
Revises: 7bc5ffc54367
Create Date: 2025-10-14 20:01:47.920231

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'afedb507dbc0'
down_revision = '7bc5ffc54367'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add is_whitelisted column to workspaces table
    op.add_column('workspaces', sa.Column('is_whitelisted', sa.Boolean(), nullable=False, server_default='false'))


def downgrade() -> None:
    # Remove is_whitelisted column from workspaces table
    op.drop_column('workspaces', 'is_whitelisted')