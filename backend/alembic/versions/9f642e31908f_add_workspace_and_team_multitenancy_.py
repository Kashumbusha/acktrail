"""add workspace and team multitenancy support

Revision ID: 9f642e31908f
Revises:
Create Date: 2025-10-11 14:23:12.559170

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid


# revision identifiers, used by Alembic.
revision = '9f642e31908f'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create workspaces table
    op.create_table(
        'workspaces',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('slug', sa.String(255), nullable=True, unique=True),
        sa.Column('plan', sa.Enum('small', 'medium', 'large', name='plantier'), nullable=False, server_default='small'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
    )

    # Create teams table
    op.create_table(
        'teams',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('workspaces.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
    )

    # Add new columns to users table
    op.add_column('users', sa.Column('workspace_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('workspaces.id'), nullable=True))
    op.add_column('users', sa.Column('can_login', sa.Boolean(), nullable=False, server_default='true'))
    op.add_column('users', sa.Column('active', sa.Boolean(), nullable=False, server_default='true'))
    op.add_column('users', sa.Column('is_guest', sa.Boolean(), nullable=False, server_default='false'))

    # Add workspace_id and team_id to policies table
    op.add_column('policies', sa.Column('workspace_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('workspaces.id'), nullable=True))
    op.add_column('policies', sa.Column('team_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('teams.id'), nullable=True))

    # Add workspace_id and team_id to assignments table
    op.add_column('assignments', sa.Column('workspace_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('workspaces.id'), nullable=True))
    op.add_column('assignments', sa.Column('team_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('teams.id'), nullable=True))

    # Data migration: Create default workspace and link existing records
    op.execute("""
        INSERT INTO workspaces (id, name, slug, plan, created_at)
        VALUES (gen_random_uuid(), 'Default Workspace', 'default', 'small', now())
        ON CONFLICT DO NOTHING;
    """)

    op.execute("""
        UPDATE users
        SET workspace_id = (SELECT id FROM workspaces WHERE slug = 'default' LIMIT 1)
        WHERE workspace_id IS NULL;
    """)

    op.execute("""
        UPDATE policies
        SET workspace_id = (SELECT id FROM workspaces WHERE slug = 'default' LIMIT 1)
        WHERE workspace_id IS NULL;
    """)

    op.execute("""
        UPDATE assignments
        SET workspace_id = (SELECT id FROM workspaces WHERE slug = 'default' LIMIT 1)
        WHERE workspace_id IS NULL;
    """)


def downgrade() -> None:
    # Remove columns from assignments
    op.drop_column('assignments', 'team_id')
    op.drop_column('assignments', 'workspace_id')

    # Remove columns from policies
    op.drop_column('policies', 'team_id')
    op.drop_column('policies', 'workspace_id')

    # Remove columns from users
    op.drop_column('users', 'is_guest')
    op.drop_column('users', 'active')
    op.drop_column('users', 'can_login')
    op.drop_column('users', 'workspace_id')

    # Drop tables
    op.drop_table('teams')
    op.drop_table('workspaces')

    # Drop enum type
    op.execute('DROP TYPE IF EXISTS plantier')
