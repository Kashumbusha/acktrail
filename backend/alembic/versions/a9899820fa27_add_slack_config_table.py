"""add_slack_config_table

Revision ID: a9899820fa27
Revises: 20251028120000
Create Date: 2025-10-31 10:08:02.322237

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision = 'a9899820fa27'
down_revision = '20251028120000'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create slack_configs table
    op.create_table(
        'slack_configs',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('workspace_id', UUID(as_uuid=True), sa.ForeignKey('workspaces.id'), nullable=False, unique=True),
        sa.Column('team_id', sa.String(255), nullable=False),
        sa.Column('team_name', sa.String(255), nullable=True),
        sa.Column('bot_token_encrypted', sa.Text(), nullable=False),
        sa.Column('signing_secret_encrypted', sa.Text(), nullable=False),
        sa.Column('auto_sync_users', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('last_synced_at', sa.DateTime(), nullable=True),
        sa.Column('sync_status', sa.String(50), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('created_by', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
    )

    # Create indexes
    op.create_index('ix_slack_configs_workspace_id', 'slack_configs', ['workspace_id'])
    op.create_index('ix_slack_configs_team_id', 'slack_configs', ['team_id'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_slack_configs_team_id', 'slack_configs')
    op.drop_index('ix_slack_configs_workspace_id', 'slack_configs')

    # Drop table
    op.drop_table('slack_configs')