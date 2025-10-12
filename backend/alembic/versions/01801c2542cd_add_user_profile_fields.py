"""add_user_profile_fields

Revision ID: 01801c2542cd
Revises: bf66fef97bf8
Create Date: 2025-10-12 17:15:35.525861

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '01801c2542cd'
down_revision = 'bf66fef97bf8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new profile fields to users table
    op.add_column('users', sa.Column('first_name', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('last_name', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('phone', sa.String(length=50), nullable=True))
    op.add_column('users', sa.Column('country', sa.String(length=100), nullable=True))


def downgrade() -> None:
    # Remove the new profile fields
    op.drop_column('users', 'country')
    op.drop_column('users', 'phone')
    op.drop_column('users', 'last_name')
    op.drop_column('users', 'first_name')