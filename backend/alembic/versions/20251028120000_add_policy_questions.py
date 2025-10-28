from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20251028120000'
down_revision = '2a9d1d2eeb8c'  # Updated to point to current head
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('policies', sa.Column('questions_enabled', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.create_table(
        'policy_questions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('policy_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('policies.id'), nullable=False),
        sa.Column('order_index', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('prompt', sa.Text(), nullable=False),
        sa.Column('choices', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('correct_index', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('ix_policy_questions_policy_id', 'policy_questions', ['policy_id'])


def downgrade():
    op.drop_index('ix_policy_questions_policy_id', table_name='policy_questions')
    op.drop_table('policy_questions')
    op.drop_column('policies', 'questions_enabled')


