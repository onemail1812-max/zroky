"""Add Sprint 1 Aaliyah sensory foundation tables.

Revision ID: 002_aaliyah_sprint1_foundation
Revises: 001_initial
Create Date: 2026-02-11 13:45:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "002_aaliyah_sprint1_foundation"
down_revision = "001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "triaged_emails",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("workspace_id", sa.String(), nullable=False),
        sa.Column("provider", sa.String(), nullable=False),
        sa.Column("external_message_id", sa.String(), nullable=False),
        sa.Column("thread_id", sa.String(), nullable=True),
        sa.Column("sender", sa.String(), nullable=True),
        sa.Column("subject", sa.String(), nullable=True),
        sa.Column("snippet", sa.Text(), nullable=False, server_default=""),
        sa.Column("received_at", sa.DateTime(), nullable=True),
        sa.Column("category", sa.String(), nullable=False),
        sa.Column("priority", sa.String(), nullable=False),
        sa.Column("is_noise", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("confidence", sa.String(), nullable=True),
        sa.Column("reasoning", sa.Text(), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_triaged_emails_workspace_id"), "triaged_emails", ["workspace_id"], unique=False)
    op.create_index(op.f("ix_triaged_emails_provider"), "triaged_emails", ["provider"], unique=False)
    op.create_index(op.f("ix_triaged_emails_external_message_id"), "triaged_emails", ["external_message_id"], unique=False)
    op.create_index(op.f("ix_triaged_emails_thread_id"), "triaged_emails", ["thread_id"], unique=False)
    op.create_index(op.f("ix_triaged_emails_received_at"), "triaged_emails", ["received_at"], unique=False)
    op.create_index(op.f("ix_triaged_emails_category"), "triaged_emails", ["category"], unique=False)
    op.create_index(op.f("ix_triaged_emails_priority"), "triaged_emails", ["priority"], unique=False)

    op.create_table(
        "calendar_event_snapshots",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("workspace_id", sa.String(), nullable=False),
        sa.Column("provider", sa.String(), nullable=False),
        sa.Column("external_event_id", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("organizer", sa.String(), nullable=True),
        sa.Column("start_at", sa.DateTime(), nullable=False),
        sa.Column("end_at", sa.DateTime(), nullable=False),
        sa.Column("is_all_day", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("is_cancelled", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("metadata_json", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_calendar_event_snapshots_workspace_id"), "calendar_event_snapshots", ["workspace_id"], unique=False)
    op.create_index(op.f("ix_calendar_event_snapshots_provider"), "calendar_event_snapshots", ["provider"], unique=False)
    op.create_index(op.f("ix_calendar_event_snapshots_external_event_id"), "calendar_event_snapshots", ["external_event_id"], unique=False)
    op.create_index(op.f("ix_calendar_event_snapshots_start_at"), "calendar_event_snapshots", ["start_at"], unique=False)
    op.create_index(op.f("ix_calendar_event_snapshots_end_at"), "calendar_event_snapshots", ["end_at"], unique=False)

    op.create_table(
        "calendar_conflicts",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("workspace_id", sa.String(), nullable=False),
        sa.Column("event_a_id", sa.String(), nullable=False),
        sa.Column("event_b_id", sa.String(), nullable=False),
        sa.Column("conflict_type", sa.String(), nullable=False),
        sa.Column("conflict_minutes", sa.String(), nullable=True),
        sa.Column("explain", sa.Text(), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_calendar_conflicts_workspace_id"), "calendar_conflicts", ["workspace_id"], unique=False)
    op.create_index(op.f("ix_calendar_conflicts_event_a_id"), "calendar_conflicts", ["event_a_id"], unique=False)
    op.create_index(op.f("ix_calendar_conflicts_event_b_id"), "calendar_conflicts", ["event_b_id"], unique=False)
    op.create_index(op.f("ix_calendar_conflicts_conflict_type"), "calendar_conflicts", ["conflict_type"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_calendar_conflicts_conflict_type"), table_name="calendar_conflicts")
    op.drop_index(op.f("ix_calendar_conflicts_event_b_id"), table_name="calendar_conflicts")
    op.drop_index(op.f("ix_calendar_conflicts_event_a_id"), table_name="calendar_conflicts")
    op.drop_index(op.f("ix_calendar_conflicts_workspace_id"), table_name="calendar_conflicts")
    op.drop_table("calendar_conflicts")

    op.drop_index(op.f("ix_calendar_event_snapshots_end_at"), table_name="calendar_event_snapshots")
    op.drop_index(op.f("ix_calendar_event_snapshots_start_at"), table_name="calendar_event_snapshots")
    op.drop_index(op.f("ix_calendar_event_snapshots_external_event_id"), table_name="calendar_event_snapshots")
    op.drop_index(op.f("ix_calendar_event_snapshots_provider"), table_name="calendar_event_snapshots")
    op.drop_index(op.f("ix_calendar_event_snapshots_workspace_id"), table_name="calendar_event_snapshots")
    op.drop_table("calendar_event_snapshots")

    op.drop_index(op.f("ix_triaged_emails_priority"), table_name="triaged_emails")
    op.drop_index(op.f("ix_triaged_emails_category"), table_name="triaged_emails")
    op.drop_index(op.f("ix_triaged_emails_received_at"), table_name="triaged_emails")
    op.drop_index(op.f("ix_triaged_emails_thread_id"), table_name="triaged_emails")
    op.drop_index(op.f("ix_triaged_emails_external_message_id"), table_name="triaged_emails")
    op.drop_index(op.f("ix_triaged_emails_provider"), table_name="triaged_emails")
    op.drop_index(op.f("ix_triaged_emails_workspace_id"), table_name="triaged_emails")
    op.drop_table("triaged_emails")
