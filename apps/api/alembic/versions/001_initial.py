"""Initial migration - create all Phase-2 tables.

Revision ID: 001_initial
Revises: 
Create Date: 2024-01-23 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create all tables."""

    # Users table
    op.create_table(
        "users",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("hashed_password", sa.String(), nullable=False),
        sa.Column("full_name", sa.String(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("is_superuser", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)

    # Workspaces table
    op.create_table(
        "workspaces",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("slug", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("owner_id", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )
    op.create_index(op.f("ix_workspaces_owner_id"), "workspaces", ["owner_id"])

    # Employees table (AI employees)
    op.create_table(
        "employees",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("role", sa.String(), nullable=False),
        sa.Column("bio", sa.String(), nullable=True),
        sa.Column("traits", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    # Memberships table (user workspace membership)
    op.create_table(
        "memberships",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("workspace_id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("role", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_memberships_workspace_id"), "memberships", ["workspace_id"])
    op.create_index(op.f("ix_memberships_user_id"), "memberships", ["user_id"])

    # Employee assignments
    op.create_table(
        "employee_assignments",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("workspace_id", sa.String(), nullable=False),
        sa.Column("employee_id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("is_enabled", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_employee_assignments_workspace_id"),
        "employee_assignments",
        ["workspace_id"],
    )
    op.create_index(
        op.f("ix_employee_assignments_employee_id"),
        "employee_assignments",
        ["employee_id"],
    )
    op.create_index(
        op.f("ix_employee_assignments_user_id"), "employee_assignments", ["user_id"]
    )

    # Threads table
    op.create_table(
        "threads",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("workspace_id", sa.String(), nullable=False),
        sa.Column("employee_id", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_threads_workspace_id"), "threads", ["workspace_id"])
    op.create_index(op.f("ix_threads_employee_id"), "threads", ["employee_id"])

    # Messages table
    op.create_table(
        "messages",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("workspace_id", sa.String(), nullable=False),
        sa.Column("thread_id", sa.String(), nullable=False),
        sa.Column("employee_id", sa.String(), nullable=False),
        sa.Column("author_type", sa.String(), nullable=False),
        sa.Column("author_user_id", sa.String(), nullable=True),
        sa.Column("content_text", sa.Text(), nullable=False),
        sa.Column("content_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_messages_workspace_id"), "messages", ["workspace_id"])
    op.create_index(op.f("ix_messages_thread_id"), "messages", ["thread_id"])
    op.create_index(op.f("ix_messages_employee_id"), "messages", ["employee_id"])
    op.create_index(op.f("ix_messages_author_user_id"), "messages", ["author_user_id"])
    op.create_index(op.f("ix_messages_created_at"), "messages", ["created_at"])

    # Artifacts table
    op.create_table(
        "artifacts",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("workspace_id", sa.String(), nullable=False),
        sa.Column("employee_id", sa.String(), nullable=False),
        sa.Column("thread_id", sa.String(), nullable=True),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=True),
        sa.Column("content_json", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_artifacts_workspace_id"), "artifacts", ["workspace_id"])
    op.create_index(op.f("ix_artifacts_employee_id"), "artifacts", ["employee_id"])
    op.create_index(op.f("ix_artifacts_thread_id"), "artifacts", ["thread_id"])
    op.create_index(op.f("ix_artifacts_created_at"), "artifacts", ["created_at"])

    # Schedules table
    op.create_table(
        "schedules",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("workspace_id", sa.String(), nullable=False),
        sa.Column("artifact_id", sa.String(), nullable=False),
        sa.Column("scheduled_for", sa.DateTime(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_schedules_workspace_id"), "schedules", ["workspace_id"])
    op.create_index(op.f("ix_schedules_artifact_id"), "schedules", ["artifact_id"])
    op.create_index(op.f("ix_schedules_scheduled_for"), "schedules", ["scheduled_for"])

    # Guidelines table
    op.create_table(
        "guidelines",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("workspace_id", sa.String(), nullable=False),
        sa.Column("employee_id", sa.String(), nullable=False),
        sa.Column("schema_version", sa.String(), nullable=False),
        sa.Column("content_json", sa.Text(), nullable=False),
        sa.Column("content_text", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_guidelines_workspace_id"), "guidelines", ["workspace_id"])
    op.create_index(op.f("ix_guidelines_employee_id"), "guidelines", ["employee_id"])

    # Abilities table
    op.create_table(
        "abilities",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("workspace_id", sa.String(), nullable=False),
        sa.Column("employee_id", sa.String(), nullable=False),
        sa.Column("toggles_json", sa.Text(), nullable=False),
        sa.Column("labels_json", sa.Text(), nullable=True),
        sa.Column("tool_permissions_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_abilities_workspace_id"), "abilities", ["workspace_id"])
    op.create_index(op.f("ix_abilities_employee_id"), "abilities", ["employee_id"])

    # Integrations table
    op.create_table(
        "integrations",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("workspace_id", sa.String(), nullable=False),
        sa.Column("provider", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("scopes_json", sa.Text(), nullable=True),
        sa.Column("token_encrypted", sa.Text(), nullable=True),
        sa.Column("config_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_integrations_workspace_id"), "integrations", ["workspace_id"])

    # Actions table
    op.create_table(
        "actions",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("workspace_id", sa.String(), nullable=False),
        sa.Column("employee_id", sa.String(), nullable=False),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column("risk_level", sa.String(), nullable=False),
        sa.Column("state", sa.String(), nullable=False),
        sa.Column("target_type", sa.String(), nullable=True),
        sa.Column("target_id", sa.String(), nullable=True),
        sa.Column("input_json", sa.Text(), nullable=True),
        sa.Column("result_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_actions_workspace_id"), "actions", ["workspace_id"])
    op.create_index(op.f("ix_actions_employee_id"), "actions", ["employee_id"])
    op.create_index(op.f("ix_actions_created_at"), "actions", ["created_at"])

    # Approvals table
    op.create_table(
        "approvals",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("workspace_id", sa.String(), nullable=False),
        sa.Column("action_id", sa.String(), nullable=False),
        sa.Column("requested_by_user_id", sa.String(), nullable=False),
        sa.Column("decided_by_user_id", sa.String(), nullable=True),
        sa.Column("decision", sa.String(), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("decided_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_approvals_workspace_id"), "approvals", ["workspace_id"])
    op.create_index(op.f("ix_approvals_action_id"), "approvals", ["action_id"])

    # Jobs table
    op.create_table(
        "jobs",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("workspace_id", sa.String(), nullable=False),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column("payload_json", sa.Text(), nullable=True),
        sa.Column("run_at", sa.DateTime(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_jobs_workspace_id"), "jobs", ["workspace_id"])
    op.create_index(op.f("ix_jobs_run_at"), "jobs", ["run_at"])

    # Call sessions table
    op.create_table(
        "call_sessions",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("workspace_id", sa.String(), nullable=False),
        sa.Column("employee_id", sa.String(), nullable=False),
        sa.Column("provider", sa.String(), nullable=False),
        sa.Column("direction", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("from_number", sa.String(), nullable=True),
        sa.Column("to_number", sa.String(), nullable=True),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("ended_at", sa.DateTime(), nullable=True),
        sa.Column("recording_provider_url", sa.String(), nullable=True),
        sa.Column("recording_drive_file_id", sa.String(), nullable=True),
        sa.Column("recording_drive_link", sa.String(), nullable=True),
        sa.Column("recording_status", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_call_sessions_workspace_id"), "call_sessions", ["workspace_id"]
    )
    op.create_index(
        op.f("ix_call_sessions_employee_id"), "call_sessions", ["employee_id"]
    )
    op.create_index(op.f("ix_call_sessions_created_at"), "call_sessions", ["created_at"])

    # Call rules table
    op.create_table(
        "call_rules",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("workspace_id", sa.String(), nullable=False),
        sa.Column("employee_id", sa.String(), nullable=False),
        sa.Column("allowed_countries_json", sa.Text(), nullable=True),
        sa.Column("allowed_time_windows_json", sa.Text(), nullable=True),
        sa.Column("max_calls_per_day", sa.Integer(), nullable=False, server_default="100"),
        sa.Column("approval_required", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("recording_enabled", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_call_rules_workspace_id"), "call_rules", ["workspace_id"])
    op.create_index(op.f("ix_call_rules_employee_id"), "call_rules", ["employee_id"])

    # Call scripts table
    op.create_table(
        "call_scripts",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("workspace_id", sa.String(), nullable=False),
        sa.Column("employee_id", sa.String(), nullable=False),
        sa.Column("greeting", sa.Text(), nullable=False),
        sa.Column("general_instructions", sa.Text(), nullable=True),
        sa.Column("end_call_conditions", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_call_scripts_workspace_id"), "call_scripts", ["workspace_id"])
    op.create_index(op.f("ix_call_scripts_employee_id"), "call_scripts", ["employee_id"])

    # Audit logs table
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("workspace_id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("action", sa.String(), nullable=False),
        sa.Column("entity_type", sa.String(), nullable=False),
        sa.Column("entity_id", sa.String(), nullable=True),
        sa.Column("changes", sa.Text(), nullable=True),
        sa.Column("metadata", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_audit_logs_workspace_id"), "audit_logs", ["workspace_id"])
    op.create_index(op.f("ix_audit_logs_user_id"), "audit_logs", ["user_id"])
    op.create_index(op.f("ix_audit_logs_action"), "audit_logs", ["action"])
    op.create_index(op.f("ix_audit_logs_entity_type"), "audit_logs", ["entity_type"])
    op.create_index(op.f("ix_audit_logs_entity_id"), "audit_logs", ["entity_id"])
    op.create_index(op.f("ix_audit_logs_created_at"), "audit_logs", ["created_at"])

    # Tasks table (existing)
    op.create_table(
        "tasks",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("workspace_id", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("assigned_to", sa.String(), nullable=True),
        sa.Column("created_by", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_tasks_workspace_id"), "tasks", ["workspace_id"])
    op.create_index(op.f("ix_tasks_assigned_to"), "tasks", ["assigned_to"])


def downgrade() -> None:
    """Drop all tables."""
    op.drop_table("tasks")
    op.drop_table("audit_logs")
    op.drop_table("call_scripts")
    op.drop_table("call_rules")
    op.drop_table("call_sessions")
    op.drop_table("jobs")
    op.drop_table("approvals")
    op.drop_table("actions")
    op.drop_table("integrations")
    op.drop_table("abilities")
    op.drop_table("guidelines")
    op.drop_table("schedules")
    op.drop_table("artifacts")
    op.drop_table("messages")
    op.drop_table("threads")
    op.drop_table("employee_assignments")
    op.drop_table("memberships")
    op.drop_table("employees")
    op.drop_table("workspaces")
    op.drop_table("users")
