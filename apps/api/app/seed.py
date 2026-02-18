"""Seed script for demo data."""
import uuid
import json
from datetime import datetime, timezone, timedelta

from app.database import SessionLocal, Base, engine
from app.models.user import User
from app.models.workspace import Workspace
from app.models.employee import Employee
from app.models.membership import Membership, MembershipRole
from app.models.employee_assignment import EmployeeAssignment
from app.models.thread import Thread
from app.models.message import Message, AuthorType
from app.models.artifact import Artifact, ArtifactType, ArtifactStatus
from app.models.action import Action, ActionState, RiskLevel
from app.models.approval import Approval, ApprovalDecision
from app.models.guideline import Guideline
from app.models.ability import Ability
from app.models.call_session import CallSession, CallStatus, RecordingStatus, CallDirection
from app.models.call_script import CallScript
from app.models.call_rule import CallRule
from app.services.audit_log_service import AuditLogService, AuditAction, AuditEntityType


def seed_database():
    """Seed demo data."""
    # Create tables
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Create workspace
        workspace_id = "ws_demo_001"
        workspace = Workspace(
            id=workspace_id,
            name="Demo Workspace",
            slug="demo",
            owner_id="user_demo_001",
        )
        db.add(workspace)

        # Create users
        admin_user = User(
            id="user_demo_001",
            email="admin@demo.com",
            hashed_password="$2b$12$demo",
            full_name="Admin User",
            is_active=True,
            is_superuser=True,
        )
        regular_user = User(
            id="user_demo_002",
            email="user@demo.com",
            hashed_password="$2b$12$demo",
            full_name="Regular User",
            is_active=True,
        )
        db.add(admin_user)
        db.add(regular_user)

        # Create memberships
        admin_membership = Membership(
            id=str(uuid.uuid4()),
            workspace_id=workspace_id,
            user_id="user_demo_001",
            role=MembershipRole.ADMIN,
        )
        user_membership = Membership(
            id=str(uuid.uuid4()),
            workspace_id=workspace_id,
            user_id="user_demo_002",
            role=MembershipRole.USER,
        )
        db.add(admin_membership)
        db.add(user_membership)

        # AI Employees
        employees_data = [
            ("emp_aaliyah", "Aaliyah", "Executive Assistant"),
            ("emp_shlok", "Shlok", "Social Media Manager"),
            ("emp_perry", "Perry", "SEO Content Writer"),
            ("emp_megan", "Megan", "AI Receptionist"),
            ("emp_reya", "Reya", "Legal Document Assistant"),
            ("emp_rico", "Rico", "Sales Outreach Coordinator"),
            ("emp_babi", "Babi", "Business Analyst"),
            ("emp_renee", "Renee", "HR Coordinator"),
        ]

        employees = []
        for emp_id, name, role in employees_data:
            emp = Employee(
                id=emp_id,
                name=name,
                role=role,
                bio=f"{name} is an AI expert in {role}",
                traits=[role],
            )
            db.add(emp)
            employees.append(emp)

        db.flush()

        # Create employee assignments
        for emp in employees:
            assignment = EmployeeAssignment(
                id=str(uuid.uuid4()),
                workspace_id=workspace_id,
                employee_id=emp.id,
                user_id="user_demo_002",
                is_enabled=True,
            )
            db.add(assignment)

        # Create threads per employee
        threads = {}
        for emp in employees:
            thread = Thread(
                id=str(uuid.uuid4()),
                workspace_id=workspace_id,
                employee_id=emp.id,
                title=f"Chat with {emp.name}",
            )
            db.add(thread)
            db.flush()
            threads[emp.id] = thread

        # Create sample messages in Aaliyah and Shlok threads
        for emp_id in ["emp_aaliyah", "emp_shlok"]:
            thread = threads[[e.id for e in employees if e.id == emp_id][0]]
            msg1 = Message(
                id=str(uuid.uuid4()),
                workspace_id=workspace_id,
                thread_id=thread.id,
                employee_id=emp_id,
                author_type=AuthorType.USER,
                author_user_id="user_demo_002",
                content_text="Hello, what can you help me with?",
            )
            msg2 = Message(
                id=str(uuid.uuid4()),
                workspace_id=workspace_id,
                thread_id=thread.id,
                employee_id=emp_id,
                author_type=AuthorType.AI,
                content_text="I'm ready to assist you. What would you like me to do?",
            )
            db.add(msg1)
            db.add(msg2)

        # Create sample artifacts
        shlok_artifacts = []
        for i in range(3):
            artifact = Artifact(
                id=str(uuid.uuid4()),
                workspace_id=workspace_id,
                employee_id="emp_shlok",
                thread_id=threads["emp_shlok"].id if "emp_shlok" in threads else None,
                type=ArtifactType.SOCIAL_POST,
                status=ArtifactStatus.SCHEDULED if i == 2 else ArtifactStatus.DRAFT,
                title=f"Social Post #{i+1}",
                content_json=json.dumps(
                    {"platform": "Twitter", "content": f"Sample tweet #{i+1}"}
                ),
            )
            db.add(artifact)
            shlok_artifacts.append(artifact)

        article = Artifact(
            id=str(uuid.uuid4()),
            workspace_id=workspace_id,
            employee_id="emp_perry",
            type=ArtifactType.ARTICLE,
            status=ArtifactStatus.DRAFT,
            title="SEO Guide",
            content_json=json.dumps({"title": "SEO Guide", "sections": []}),
        )
        db.add(article)

        lead_list = Artifact(
            id=str(uuid.uuid4()),
            workspace_id=workspace_id,
            employee_id="emp_rico",
            type=ArtifactType.LEAD_LIST,
            status=ArtifactStatus.DRAFT,
            title="Leads Q1",
            content_json=json.dumps({"leads": []}),
        )
        db.add(lead_list)

        # Call session for Megan
        call_session = CallSession(
            id=str(uuid.uuid4()),
            workspace_id=workspace_id,
            employee_id="emp_megan",
            provider="TWILIO",
            direction=CallDirection.INBOUND,
            status=CallStatus.ENDED,
            from_number="+1234567890",
            to_number="+9876543210",
            started_at=datetime.now(timezone.utc) - timedelta(hours=1),
            ended_at=datetime.now(timezone.utc) - timedelta(minutes=55),
            recording_drive_file_id="file_abc123",
            recording_drive_link="https://drive.google.com/file/d/file_abc123/view",
            recording_status=RecordingStatus.UPLOADED,
        )
        db.add(call_session)
        db.flush()

        # Call summary artifact
        call_summary = Artifact(
            id=str(uuid.uuid4()),
            workspace_id=workspace_id,
            employee_id="emp_megan",
            type=ArtifactType.CALL_SUMMARY,
            status=ArtifactStatus.DRAFT,
            title="Call Summary - 2024-01-23",
            content_json=json.dumps(
                {
                    "call_id": call_session.id,
                    "duration": "5 minutes",
                    "summary": "Customer inquired about pricing",
                }
            ),
        )
        db.add(call_summary)

        db.flush()

        # Create sample actions and approvals
        action = Action(
            id=str(uuid.uuid4()),
            workspace_id=workspace_id,
            employee_id="emp_rico",
            type="SOCIAL_PUBLISH",
            risk_level=RiskLevel.MEDIUM,
            state=ActionState.AWAITING_APPROVAL,
            target_type="artifact",
            target_id=shlok_artifacts[0].id if shlok_artifacts else None,
            input_json=json.dumps({"platform": "LinkedIn"}),
        )
        db.add(action)
        db.flush()

        approval = Approval(
            id=str(uuid.uuid4()),
            workspace_id=workspace_id,
            action_id=action.id,
            requested_by_user_id="user_demo_002",
            decision=ApprovalDecision.PENDING,
        )
        db.add(approval)


        # Create guidelines and abilities for each employee
        for emp in employees:
            if emp.id == "emp_shlok":
                content_json = {
                    "instructions": (
                        "Shlok is the Social Media Manager. "
                        "All outputs must be draft-first and approval-first. "
                        "Shlok must explain intent and rationale before any action. "
                        "Shlok must never claim content is posted or published without explicit user approval."
                    ),
                    "tone": {
                        "default": "clear, concise, confident",
                        "avoid": ["over-promising", "claiming execution without approval"],
                    },
                    "reference_playbooks": [
                        {
                            "type": "video",
                            "source": "youtube",
                            "url": "https://www.youtube.com/watch?v=placeholder_1",
                            "title": "High-Engagement LinkedIn Content Framework",
                            "notes": "Use as reference for hook structures and post pacing. Do not copy phrasing.",
                        },
                        {
                            "type": "video",
                            "source": "youtube",
                            "url": "https://www.youtube.com/watch?v=placeholder_2",
                            "title": "Short-Form Content Systems for Founders",
                            "notes": "Reference for cadence and storytelling flow only.",
                        },
                        {
                            "type": "video",
                            "source": "youtube",
                            "url": "https://www.youtube.com/watch?v=placeholder_3",
                            "title": "Community-Led Growth Playbook",
                            "notes": "Use for moderation tone and community response patterns.",
                        },
                        {
                            "type": "video",
                            "source": "youtube",
                            "url": "https://www.youtube.com/watch?v=placeholder_4",
                            "title": "Brand Voice Consistency Across Platforms",
                            "notes": "Reference for maintaining voice consistency across LinkedIn, Twitter, and Instagram.",
                        },
                    ],
                }
                guideline = Guideline(
                    id=str(uuid.uuid4()),
                    workspace_id=workspace_id,
                    employee_id=emp.id,
                    schema_version="v1",
                    content_json=json.dumps(content_json),
                    content_text="Default Shlok social media guidelines with reference playbooks.",
                )
                db.add(guideline)
            else:
                guideline = Guideline(
                    id=str(uuid.uuid4()),
                    workspace_id=workspace_id,
                    employee_id=emp.id,
                    content_json=json.dumps(
                        {
                            "instructions": f"Guidelines for {emp.name}",
                            "tone": "professional",
                        }
                    ),
                )
                db.add(guideline)

            ability = Ability(
                id=str(uuid.uuid4()),
                workspace_id=workspace_id,
                employee_id=emp.id,
                toggles_json=json.dumps({"enabled": True, "draft_mode": False}),
                labels_json=json.dumps({"categories": []}),
                tool_permissions_json=json.dumps({"read": True, "write": True}),
            )
            db.add(ability)

        # Call rules and scripts for telephony employees
        for emp_id in ["emp_megan", "emp_rico"]:
            call_rule = CallRule(
                id=str(uuid.uuid4()),
                workspace_id=workspace_id,
                employee_id=emp_id,
                allowed_countries_json=json.dumps(["US", "CA"]),
                max_calls_per_day=100,
                approval_required=False,
                recording_enabled=True,
            )
            db.add(call_rule)

            call_script = CallScript(
                id=str(uuid.uuid4()),
                workspace_id=workspace_id,
                employee_id=emp_id,
                greeting="Hello, how can I help you?",
                general_instructions="Be professional and helpful",
                end_call_conditions="When customer is satisfied",
            )
            db.add(call_script)

        # EVA-style Default Categories for Aaliyah
        from app.models.email_category import EmailCategory
        eva_categories = [
            {"name": "To Respond", "color": "#fb4c2f", "icon": "⚡"},
            {"name": "FYI", "color": "#16a765", "icon": "👀"},
            {"name": "Marketing", "color": "#ffad47", "icon": "📢"},
            {"name": "Meeting Update", "color": "#42d692", "icon": "📅"},
            {"name": "Notifications", "color": "#a479e2", "icon": "🔔"},
            {"name": "Awaiting Reply", "color": "#fad165", "icon": "⏳"},
        ]
        
        for idx, cat in enumerate(eva_categories):
            ec = EmailCategory(
                id=str(uuid.uuid4()),
                workspace_id=workspace_id,
                user_id="emp_aaliyah", # Associated with the AI employee or the user? Typically the user. 
                # But current model schema says 'user_id'. Let's assume it's the EMPLOYEE ID based on context or USER ID?
                # EmailCategory model says 'user_id', but ProcessedEmail uses 'employee_id'. 
                # Let's use the employee_id 'emp_aaliyah' as the 'user_id' owner of these rules implies the AI's logic.
                # Actually, checking EmailCategory model: user_id = Column(String...
                # In EmailService, it queries settings for employee_id.
                # Let's stick to emp_aaliyah for now as the 'owner' of these default categories.
                name=cat["name"],
                color=cat["color"],
                icon=cat["icon"],
                is_default=True,
                order=idx,
            )
            db.add(ec)

        # Create a sample TriagedEmail for Aaliyah
        from app.models.triaged_email import TriagedEmail
        demo_email_id = "draft_demo_001"
        demo_email = TriagedEmail(
            id=demo_email_id,
            workspace_id=workspace_id,
            provider="google",
            external_message_id="msg_abc123",
            thread_id="thread_xyz789",
            sender="sarah@northbridge.com",
            subject="Q3 Investor Update and Scheduling Alignment",
            snippet="Hi, let's discuss the Q3 update...",
            category="To Respond",
            priority="High",
            requires_approval=True,
            metadata_json={
                "draft": {
                    "to": "board@northbridge.com",
                    "subject": "Q3 Investor Update and Scheduling Alignment",
                    "body": "<p>Attached is the refined update. Pending your approval, I will send to legal and finance, then align board prep to remove conflicts.</p>",
                    "status": "pending_approval"
                }
            }
        )
        db.add(demo_email)

        db.commit()
        print("✓ Demo data seeded successfully")

    except Exception as e:
        db.rollback()
        print(f"✗ Error seeding data: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
