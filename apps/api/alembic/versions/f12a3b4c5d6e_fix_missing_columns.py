"""fix missing columns

Revision ID: f12a3b4c5d6e
Revises: ea96b1fa44ca
Create Date: 2026-03-01 17:15:00.000000

"""
from alembic import op
import sqlalchemy as sa
import app.db_types

# revision identifiers, used by Alembic.
revision = 'f12a3b4c5d6e'
down_revision = '36fc5403bc75'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Add settings_json to workspaces
    with op.batch_alter_table('workspaces', schema=None) as batch_op:
        batch_op.add_column(sa.Column('settings_json', app.db_types.SafeJSON(), nullable=True))

    # Add missing columns to employees
    with op.batch_alter_table('employees', schema=None) as batch_op:
        batch_op.add_column(sa.Column('workspace_id', sa.String(), nullable=False, server_default=sa.text("'default'")))
        batch_op.add_column(sa.Column('user_id', sa.String(), nullable=False, server_default=sa.text("'system'")))
        batch_op.drop_column('traits')
        batch_op.drop_column('bio')
        batch_op.drop_column('name')

    # Add missing columns to triaged_emails
    with op.batch_alter_table('triaged_emails', schema=None) as batch_op:
        batch_op.add_column(sa.Column('needs_clarity', sa.Boolean(), nullable=True, server_default=sa.false()))
        batch_op.add_column(sa.Column('can_draft', sa.Boolean(), nullable=True, server_default=sa.false()))

    # Add missing columns to jobs
    with op.batch_alter_table('jobs', schema=None) as batch_op:
        batch_op.add_column(sa.Column('dedupe_id', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('max_attempts', sa.Integer(), nullable=False, server_default=sa.text('3')))
        batch_op.add_column(sa.Column('locked_at', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('locked_by', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('traceback_data', sa.Text(), nullable=True))

def downgrade() -> None:
    pass
