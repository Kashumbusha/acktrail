"""add_unique_constraint_to_workspace_name

Revision ID: c55ef725e7a1
Revises: 2497b946325e
Create Date: 2025-10-11 16:31:35.424805

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c55ef725e7a1'
down_revision = '2497b946325e'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add unique constraint to workspace name
    op.create_unique_constraint('uix_workspace_name', 'workspaces', ['name'])


def downgrade() -> None:
    # Drop the unique constraint
    op.drop_constraint('uix_workspace_name', 'workspaces', type_='unique')