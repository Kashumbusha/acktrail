"""allow_same_email_across_workspaces

Revision ID: 2497b946325e
Revises: 70a16060df82
Create Date: 2025-10-11 16:02:24.332466

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '2497b946325e'
down_revision = '70a16060df82'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop the unique constraint on email column (if it exists)
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    constraints = [c['name'] for c in inspector.get_unique_constraints('users')]

    if 'users_email_key' in constraints:
        op.drop_constraint('users_email_key', 'users', type_='unique')

    # Create composite unique constraint on email + workspace_id
    op.create_unique_constraint('uix_email_workspace', 'users', ['email', 'workspace_id'])


def downgrade() -> None:
    # Drop the composite unique constraint
    op.drop_constraint('uix_email_workspace', 'users', type_='unique')

    # Restore the unique constraint on email column
    op.create_unique_constraint('users_email_key', 'users', ['email'])