"""Provider-backed email connector abstraction for deterministic actions."""

from __future__ import annotations

from typing import Any, Dict, Optional, Protocol

from sqlalchemy.orm import Session

from app.models.integration import IntegrationProvider
from app.models.membership import Membership
from app.services.integrations.google_gmail import GmailService
from app.services.integrations.integration_token_manager import IntegrationTokenManager
from app.services.integrations.microsoft_outlook import OutlookService


class EmailConnector(Protocol):
    async def get_message(self, message_id: str) -> Dict[str, Any]: ...
    async def apply_label(self, message_id: str, label_name: str) -> Dict[str, Any]: ...
    async def remove_label(self, message_id: str, label_name: str, label_id: Optional[str] = None) -> Any: ...
    async def move_to_inbox(self, message_id: str) -> Any: ...
    async def archive_message(self, message_id: str) -> Any: ...
    async def delete_draft(self, draft_id: str) -> Any: ...
    async def send_message(
        self,
        recipient: str,
        subject: str,
        body: str,
        thread_id: Optional[str] = None,
        reply_to_id: Optional[str] = None,
    ) -> Dict[str, Any]: ...
    async def get_attachment(self, message_id: str, attachment_id: str) -> Dict[str, Any]: ...


class GmailConnector:
    def __init__(self, service: GmailService):
        self.service = service

    async def get_message(self, message_id: str) -> Dict[str, Any]:
        return self.service.get_message(message_id)

    async def apply_label(self, message_id: str, label_name: str) -> Dict[str, Any]:
        return self.service.apply_label(message_id, label_name)

    async def remove_label(self, message_id: str, label_name: str, label_id: Optional[str] = None) -> Any:
        return self.service.remove_label(message_id, label_name, label_id=label_id)

    async def move_to_inbox(self, message_id: str) -> Any:
        return self.service.move_to_inbox(message_id)

    async def archive_message(self, message_id: str) -> Any:
        return self.service.archive_message(message_id)

    async def delete_draft(self, draft_id: str) -> Any:
        return self.service.delete_draft(draft_id)

    async def send_message(self, recipient: str, subject: str, body: str, thread_id: Optional[str] = None, reply_to_id: Optional[str] = None) -> Dict[str, Any]:
        return self.service.send_message(recipient, subject, body, thread_id=thread_id, reply_to_id=reply_to_id)

    async def get_attachment(self, message_id: str, attachment_id: str) -> Dict[str, Any]:
        return self.service.get_attachment(message_id, attachment_id)


class OutlookConnector:
    def __init__(self, service: OutlookService):
        self.service = service

    async def get_message(self, message_id: str) -> Dict[str, Any]:
        return self.service.get_message(message_id)

    async def apply_label(self, message_id: str, label_name: str) -> Dict[str, Any]:
        return self.service.apply_label(message_id, label_name)

    async def remove_label(self, message_id: str, label_name: str, label_id: Optional[str] = None) -> Any:
        return self.service.remove_label(message_id, label_name, label_id=label_id)

    async def move_to_inbox(self, message_id: str) -> Any:
        return self.service.move_to_inbox(message_id)

    async def archive_message(self, message_id: str) -> Any:
        return self.service.archive_message(message_id)

    async def delete_draft(self, draft_id: str) -> Any:
        return self.service.delete_draft(draft_id)

    async def send_message(self, recipient: str, subject: str, body: str, thread_id: Optional[str] = None, reply_to_id: Optional[str] = None) -> Dict[str, Any]:
        return self.service.send_message(recipient, subject, body, thread_id=thread_id, reply_to_id=reply_to_id)

    async def get_attachment(self, message_id: str, attachment_id: str) -> Dict[str, Any]:
        # For Outlook, attachment_id is enough to get it via Graph, but we follow the interface.
        # Actually in Graph it's per message.
        atts = self.service.get_attachments(message_id)
        for a in atts:
            if a.get("id") == attachment_id:
                return a
        return {}


class EmailConnectorFactory:
    """Resolve authorized connector instance for a workspace/user/provider."""

    def __init__(self, db: Session, workspace_id: str):
        self.db = db
        self.workspace_id = workspace_id
        self.token_manager = IntegrationTokenManager(db)

    def _assert_workspace_access(self, user_id: str) -> None:
        membership = (
            self.db.query(Membership)
            .filter(
                Membership.workspace_id == self.workspace_id,
                Membership.user_id == user_id,
            )
            .first()
        )
        if not membership:
            raise PermissionError("User is not authorized for this workspace")

    async def get_connector(self, user_id: str, provider: str) -> EmailConnector:
        self._assert_workspace_access(user_id)
        normalized = str(provider or "").lower().strip()

        if normalized in {"google", "gmail"}:
            token = self.token_manager.get_valid_token(self.workspace_id, IntegrationProvider.GOOGLE_GMAIL)
            if not token:
                raise ValueError("Gmail is not connected")
            return GmailConnector(GmailService(token))

        if normalized in {"microsoft", "outlook"}:
            token = self.token_manager.get_valid_token(self.workspace_id, IntegrationProvider.OUTLOOK)
            access_token = str((token or {}).get("access_token") or "")
            if not access_token:
                raise ValueError("Outlook is not connected")
            return OutlookConnector(OutlookService(access_token))

        raise ValueError(f"Unsupported provider '{provider}'")
