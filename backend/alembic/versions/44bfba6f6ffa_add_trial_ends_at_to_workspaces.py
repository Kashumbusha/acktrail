"""add_trial_ends_at_to_workspaces

Revision ID: 44bfba6f6ffa
Revises: a3751439e8e6
Create Date: 2025-10-11 19:47:33.493176

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '44bfba6f6ffa'
down_revision = 'a3751439e8e6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add trial_ends_at column to workspaces table
    op.add_column('workspaces', sa.Column('trial_ends_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    # Remove trial_ends_at column from workspaces table
    op.drop_column('workspaces', 'trial_ends_at')