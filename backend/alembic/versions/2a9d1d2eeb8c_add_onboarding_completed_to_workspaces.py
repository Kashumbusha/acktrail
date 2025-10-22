"""add onboarding_completed to workspaces

Revision ID: 2a9d1d2eeb8c
Revises: ae377ce98f53
Create Date: 2025-10-22 22:27:35.313721

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '2a9d1d2eeb8c'
down_revision = 'ae377ce98f53'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add onboarding_completed column to workspaces table
    op.add_column('workspaces', sa.Column('onboarding_completed', sa.Boolean(), nullable=False, server_default='false'))


def downgrade() -> None:
    # Remove onboarding_completed column
    op.drop_column('workspaces', 'onboarding_completed')