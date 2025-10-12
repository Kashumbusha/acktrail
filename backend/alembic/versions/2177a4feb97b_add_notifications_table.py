"""add_notifications_table

Revision ID: 2177a4feb97b
Revises: 65ef63f731fa
Create Date: 2025-10-12 10:14:25.082239

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = '2177a4feb97b'
down_revision = '65ef63f731fa'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create notification type enum
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE notificationtype AS ENUM (
                'policy_assigned',
                'policy_acknowledged',
                'policy_overdue',
                'policy_reminder',
                'user_added',
                'workspace_created'
            );
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)

    # Create notifications table
    op.create_table(
        'notifications',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('workspaces.id'), nullable=False),
        sa.Column('type', postgresql.ENUM(
            'policy_assigned',
            'policy_acknowledged',
            'policy_overdue',
            'policy_reminder',
            'user_added',
            'workspace_created',
            name='notificationtype',
            create_type=False
        ), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('link', sa.String(500), nullable=True),
        sa.Column('read', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
    )

    # Create indexes for better query performance
    op.create_index('ix_notifications_user_id', 'notifications', ['user_id'])
    op.create_index('ix_notifications_workspace_id', 'notifications', ['workspace_id'])
    op.create_index('ix_notifications_read', 'notifications', ['read'])
    op.create_index('ix_notifications_created_at', 'notifications', ['created_at'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_notifications_created_at')
    op.drop_index('ix_notifications_read')
    op.drop_index('ix_notifications_workspace_id')
    op.drop_index('ix_notifications_user_id')

    # Drop table
    op.drop_table('notifications')

    # Drop enum type
    op.execute('DROP TYPE IF EXISTS notificationtype')