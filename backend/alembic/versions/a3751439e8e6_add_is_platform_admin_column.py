"""add_is_platform_admin_column

Revision ID: a3751439e8e6
Revises: c55ef725e7a1
Create Date: 2025-10-11 19:15:20.541403

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a3751439e8e6'
down_revision = 'c55ef725e7a1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add is_platform_admin column to users table
    op.add_column('users', sa.Column('is_platform_admin', sa.Boolean(), nullable=False, server_default='false'))


def downgrade() -> None:
    # Remove is_platform_admin column from users table
    op.drop_column('users', 'is_platform_admin')