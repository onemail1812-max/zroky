"""GmailService wrapper around GmailClient for EmailIngestor compatibility."""
from app.integrations.gmail_client import GmailClient
import logging

logger = logging.getLogger(__name__)


def _extract_header(msg: dict, name: str) -> str | None:
    """Extract a header value from Gmail API message payload.headers array."""
    payload = msg.get("payload", {})
    headers = payload.get("headers", [])
    for h in headers:
        if h.get("name", "").lower() == name.lower():
            return h.get("value")
    return None


def _enrich_message(msg: dict) -> dict:
    """Promote Gmail payload.headers fields to top-level keys
    that normalize_message expects (sender, subject, received_at)."""
    if not msg.get("sender"):
        msg["sender"] = _extract_header(msg, "From")
    if not msg.get("subject"):
        msg["subject"] = _extract_header(msg, "Subject")
    if not msg.get("received_at"):
        msg["received_at"] = _extract_header(msg, "Date")
    return msg


class GmailService:
    def __init__(self, access_token: str, on_auth_failure=None):
        self.client = GmailClient(access_token)
        self.on_auth_failure = on_auth_failure

    async def list_unread_messages(self, max_results: int = 10):
        res = await self.client.list_threads(max_results=max_results, query="label:UNREAD")
        messages = []
        for t in res.get("threads", []):
             thread_data = await self.client.get_thread(t["id"], format="full")
             if thread_data.get("messages"):
                  msg = thread_data["messages"][-1]
                  msg["thread_id"] = t["id"]
                  messages.append(_enrich_message(msg))
        return messages

    async def search_messages(self, query: str, max_results: int = 10):
        res = await self.client.list_threads(max_results=max_results, query=query)
        threads = []
        for t in res.get("threads", []):
             thread_data = await self.client.get_thread(t["id"], format="full")
             if thread_data.get("messages"):
                  msg = thread_data["messages"][-1]
                  msg["thread_id"] = t["id"]
                  threads.append(_enrich_message(msg))
        logger.info(f"GmailService.search_messages: {len(threads)} messages for query '{query}'")
        return threads

    async def get_message(self, message_id: str, format: str = "full"):
        msg = await self.client.get_message(message_id, format=format)
        return _enrich_message(msg)

    async def get_thread(self, thread_id: str, format: str = "full"):
        return await self.client.get_thread(thread_id, format=format)

    async def get_profile(self):
        import httpx
        async with httpx.AsyncClient() as c:
            resp = await c.get(
                "https://gmail.googleapis.com/gmail/v1/users/me/profile",
                headers={"Authorization": f"Bearer {self.client.access_token}"}
            )
            return resp.json()

    async def list_history(self, start_history_id: str):
        import httpx
        async with httpx.AsyncClient() as c:
            resp = await c.get(
                f"https://gmail.googleapis.com/gmail/v1/users/me/history",
                headers={"Authorization": f"Bearer {self.client.access_token}"},
                params={"startHistoryId": start_history_id}
            )
            return resp.json()

    async def send_message(self, to: str, subject: str, text: str, cc: str | None = None, bcc: str | None = None, thread_id: str | None = None, attachments: list | None = None) -> dict:
        return await self.client.send_message(to, subject, text, cc=cc, bcc=bcc, thread_id=thread_id, attachments=attachments)

    async def list_sent_messages(self, max_results: int = 5):
        return await self.search_messages(query="in:sent", max_results=max_results)
