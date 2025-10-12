"""add_staff_count_column_to_workspaces

Revision ID: 7bc5ffc54367
Revises: 01801c2542cd
Create Date: 2025-10-12 20:16:55.087267

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '7bc5ffc54367'
down_revision = '01801c2542cd'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add staff_count column to track licensed seats
    op.add_column('workspaces', sa.Column('staff_count', sa.Integer(), nullable=False, server_default='1'))


def downgrade() -> None:
    # Remove staff_count column
    op.drop_column('workspaces', 'staff_count')