"""add_sso_config_table

Revision ID: ae377ce98f53
Revises: afedb507dbc0
Create Date: 2025-10-20 22:22:39.644802

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision = 'ae377ce98f53'
down_revision = 'afedb507dbc0'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create sso_configs table
    op.create_table(
        'sso_configs',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('workspace_id', UUID(as_uuid=True), sa.ForeignKey('workspaces.id'), nullable=False, unique=True),
        sa.Column('provider', sa.String(50), nullable=False, server_default='microsoft'),
        sa.Column('tenant_id', sa.String(255), nullable=False),
        sa.Column('client_id', sa.String(255), nullable=False),
        sa.Column('client_secret_encrypted', sa.Text(), nullable=False),
        sa.Column('auto_provision_users', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('default_role', sa.String(50), nullable=False, server_default='employee'),
        sa.Column('enforce_sso', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('last_tested_at', sa.DateTime(), nullable=True),
        sa.Column('test_status', sa.String(50), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('created_by', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
    )

    # Create indexes
    op.create_index('ix_sso_configs_workspace_id', 'sso_configs', ['workspace_id'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_sso_configs_workspace_id', 'sso_configs')

    # Drop table
    op.drop_table('sso_configs')