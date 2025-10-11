"""add password and magic link support

Revision ID: 70a16060df82
Revises: 9f642e31908f
Create Date: 2025-10-11 14:36:58.638488

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '70a16060df82'
down_revision = '9f642e31908f'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add password_hash column to users table
    op.add_column('users', sa.Column('password_hash', sa.String(255), nullable=True))

    # Add magic_token column to auth_codes table
    op.add_column('auth_codes', sa.Column('magic_token', sa.String(255), nullable=True))


def downgrade() -> None:
    # Remove password_hash from users
    op.drop_column('users', 'password_hash')

    # Remove magic_token from auth_codes
    op.drop_column('auth_codes', 'magic_token')
