"""Add labeling preference storage and triaged email read state.

Revision ID: 003_labeling_preferences_and_read_state
Revises: 002_aaliyah_sprint1_foundation
Create Date: 2026-02-11 16:05:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "003_labeling_prefs"
down_revision = "002_aaliyah_sprint1_foundation"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "triaged_emails",
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.false()),
    )

    op.create_table(
        "labeling_preferences",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("workspace_id", sa.String(), nullable=False),
        sa.Column("enabled_labels", sa.JSON(), nullable=False),
        sa.Column("vip_senders", sa.JSON(), nullable=False),
        sa.Column("internal_domains", sa.JSON(), nullable=False),
        sa.Column("keyword_rules", sa.JSON(), nullable=False),
        sa.Column("overrides_json", sa.JSON(), nullable=False),
        sa.Column("auto_label_enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("auto_sync_interval_seconds", sa.Integer(), nullable=False, server_default="120"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("workspace_id"),
    )
    op.create_index(
        op.f("ix_labeling_preferences_workspace_id"),
        "labeling_preferences",
        ["workspace_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_labeling_preferences_workspace_id"), table_name="labeling_preferences")
    op.drop_table("labeling_preferences")
    op.drop_column("triaged_emails", "is_read")
