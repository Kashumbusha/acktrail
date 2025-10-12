"""add_team_id_to_users

Revision ID: da1a607e34a7
Revises: 2177a4feb97b
Create Date: 2025-10-12 11:30:36.577460

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = 'da1a607e34a7'
down_revision = '2177a4feb97b'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add team_id column to users table
    op.add_column('users', sa.Column('team_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('teams.id'), nullable=True))

    # Create index for better query performance
    op.create_index('ix_users_team_id', 'users', ['team_id'])


def downgrade() -> None:
    # Drop index
    op.drop_index('ix_users_team_id', 'users')

    # Remove team_id column
    op.drop_column('users', 'team_id')