"""add_sso_enabled_to_workspaces

Revision ID: 65ef63f731fa
Revises: 44bfba6f6ffa
Create Date: 2025-10-11 22:45:45.131922

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '65ef63f731fa'
down_revision = '44bfba6f6ffa'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add sso_enabled column to workspaces table
    op.add_column('workspaces', sa.Column('sso_enabled', sa.Boolean(), nullable=False, server_default='false'))


def downgrade() -> None:
    # Remove sso_enabled column from workspaces table
    op.drop_column('workspaces', 'sso_enabled')