"""OutlookService wrapper around OutlookClient for EmailIngestor compatibility."""
from app.integrations.outlook_client import OutlookClient
import logging

logger = logging.getLogger(__name__)

class OutlookService:
    def __init__(self, access_token: str, token_refresher=None, on_auth_failure=None):
        self.client = OutlookClient(access_token)
        self.token_refresher = token_refresher
        self.on_auth_failure = on_auth_failure

    async def list_unread_messages(self, max_results: int = 10):
        # Uses list_messages internally
        res = await self.client.list_messages(max_results=max_results, folder="inbox")
        # OutlookClient returns already parsed or raw? 
        # Actually EmailIngestor.normalize_message expects the 'value' items
        return res.get("value", [])

    async def search_messages(self, query: str, max_results: int = 10):
        # We pass `query` as the $filter parameter to Microsoft Graph.
        # This is primarily used for historical backfill date filtering.
        res = await self.client.list_messages(max_results=max_results, filter_query=query)
        return res.get("value", [])

    async def get_message(self, message_id: str):
        return await self.client.get_message(message_id)

    async def list_delta(self, delta_link: str = None):
        url = delta_link or "https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages/delta"
        resp = await self.client._request("GET", url)
        return resp.json()

    async def send_message(self, to: str, subject: str, text: str, cc: str | None = None, bcc: str | None = None, thread_id: str | None = None, attachments: list | None = None) -> bool:
        return await self.client.send_message(to, subject, text, cc=cc, bcc=bcc, thread_id=thread_id, attachments=attachments)

    async def list_sent_messages(self, max_results: int = 5):
        res = await self.client.list_messages(max_results=max_results, folder="sentitems")
        return res.get("value", [])
