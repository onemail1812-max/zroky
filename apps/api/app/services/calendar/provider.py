from datetime import datetime, timedelta
import pytz
from typing import List, Tuple, Dict, Any
from sqlalchemy.orm import Session
from app.models.integration import Integration, IntegrationProvider, IntegrationStatus
from app.services.integrations.token_store import decrypt_token
import requests

class CalendarService:
    """
    Checks free/busy across Google and Microsoft calendars.
    Finds 3 available slots in IST (Indian Standard Time) for the next 3 business days.
    """
    def __init__(self, db: Session, workspace_id: str):
        self.db = db
        self.workspace_id = workspace_id
        try:
           self.ist = pytz.timezone('Asia/Kolkata')
        except:
           # Fallback/Default if pytz data incomplete
           self.ist = pytz.UTC 
           print("Warning: Asia/Kolkata timezone not found, defaulting UTC")

    def _get_active_integrations(self):
         return self.db.query(Integration).filter(
            Integration.workspace_id == self.workspace_id,
            Integration.status == IntegrationStatus.CONNECTED
        ).all()

    def get_busy_periods(self, start_dt: datetime, end_dt: datetime) -> List[Tuple[datetime, datetime]]:
        """
        Aggregate busy slots from all connected calendars.
        start_dt and end_dt should be UTC aware.
        """
        busy_slots = []
        integrations = self._get_active_integrations()
        
        for integration in integrations:
            try:
                token_data = decrypt_token(integration.token_encrypted)
                access_token = token_data.get("access_token")
                if not access_token: continue
                
                # Check scopes/type
                provider = integration.provider
                # Simplification: assume integration provider enum covers calendar capability or we check scopes
                # Google
                if provider == IntegrationProvider.GOOGLE_CALENDAR or (provider == IntegrationProvider.GOOGLE_GMAIL and "calendar" in (integration.scopes_json or "")):
                    slots = self._get_google_busy(access_token, start_dt, end_dt)
                    busy_slots.extend(slots)
                # Outlook (usually combines mail/calendar)
                elif provider == IntegrationProvider.OUTLOOK: 
                     slots = self._get_outlook_busy(access_token, start_dt, end_dt)
                     busy_slots.extend(slots)
            except Exception as e:
                print(f"Error fetching busy for {integration.id}: {e}")
                 
        return busy_slots

    def _get_google_busy(self, token: str, start: datetime, end: datetime) -> List[Tuple[datetime, datetime]]:
        url = "https://www.googleapis.com/calendar/v3/freeBusy"
        body = {
            "timeMin": start.isoformat().replace("+00:00", "Z"),
            "timeMax": end.isoformat().replace("+00:00", "Z"),
            "items": [{"id": "primary"}]
        }
        try:
            res = requests.post(url, json=body, headers={"Authorization": f"Bearer {token}"})
            if not res.ok: 
                print(f"Google Busy Error: {res.text}")
                return []
            
            calendars = res.json().get("calendars", {})
            primary = calendars.get("primary", {})
            busy = primary.get("busy", [])
            
            slots = []
            for b in busy:
                # ISO format usually contains timezone info
                s = datetime.fromisoformat(b["start"].replace("Z", "+00:00"))
                e = datetime.fromisoformat(b["end"].replace("Z", "+00:00"))
                slots.append((s, e))
            return slots
        except Exception as e:
            print(f"Google busy check failed: {e}")
            return []

    def _get_outlook_busy(self, token: str, start: datetime, end: datetime) -> List[Tuple[datetime, datetime]]:
        # Use calendarView to get actual events which act as busy slots
        # graph.microsoft.com/v1.0/me/calendarView?startDateTime={start}&endDateTime={end}
        
        # Format times for Graph (ISO 8601)
        start_str = start.isoformat().replace("+00:00", "Z")
        end_str = end.isoformat().replace("+00:00", "Z")
        
        url = f"https://graph.microsoft.com/v1.0/me/calendarView"
        params = {
            "startDateTime": start_str,
            "endDateTime": end_str,
            "$select": "start,end,showAs"
        }
        
        try:
            res = requests.get(url, params=params, headers={
                "Authorization": f"Bearer {token}", 
                "Prefer": 'outlook.timezone="UTC"' # Request UTC to simplify
            })
            if not res.ok: 
                print(f"Outlook Busy Error: {res.text}")
                return []
            
            events = res.json().get("value", [])
            slots = []
            for ev in events:
                # showAs: Free, Tentative, Busy, Oof, WorkingElsewhere
                if ev.get("showAs") == "Free": continue
                
                s_dict = ev.get("start", {})
                e_dict = ev.get("end", {})
                
                # If we requested UTC, the dateTime should be in UTC
                # It might look like "2023-10-27T10:00:00.0000000" (no Z)
                s_str = s_dict.get("dateTime")
                e_str = e_dict.get("dateTime")
                
                if s_str and e_str:
                    # Append Z if missing and strictly UTC
                    if not s_str.endswith("Z") and not "+" in s_str: s_str += "Z"
                    if not e_str.endswith("Z") and not "+" in e_str: e_str += "Z"
                    
                    s = datetime.fromisoformat(s_str.replace("Z", "+00:00"))
                    e = datetime.fromisoformat(e_str.replace("Z", "+00:00"))
                    slots.append((s, e))
            return slots
        except Exception as e:
            print(f"Outlook busy check failed: {e}")
            return []

    def find_free_slots(self, duration_minutes: int = 30) -> List[datetime]:
        """
        Find 3 available slots in next 3 business days (9am-6pm IST).
        Returns UTC start times.
        """
        now = datetime.utcnow().replace(tzinfo=pytz.UTC)
        candidates = []
        
        # Look ahead 1 to 3 days
        # We start checking from "tomorrow" to avoid immediate urgency/late night scheduling
        for i in range(1, 4):
            day_cursor = now + timedelta(days=i)
            
            # Skip weekends (5=Sat, 6=Sun)
            # We need to check weekday in IST, not UTC, ideally.
            day_ist = day_cursor.astimezone(self.ist)
            if day_ist.weekday() >= 5: continue
            
            # Define 9 AM - 6 PM IST for this day
            year, month, day = day_ist.year, day_ist.month, day_ist.day
            
            try:
                # Create naive IST times then localize
                start_naive = datetime(year, month, day, 9, 0, 0)
                end_naive = datetime(year, month, day, 18, 0, 0)
                
                start_ist = self.ist.localize(start_naive)
                end_ist = self.ist.localize(end_naive)
                
                start_utc = start_ist.astimezone(pytz.UTC)
                end_utc = end_ist.astimezone(pytz.UTC)
            except:
                 # Fallback logic if pytz fails
                 start_utc = day_cursor.replace(hour=3, minute=30, second=0, microsecond=0) # ~9am IST
                 end_utc = day_cursor.replace(hour=12, minute=30, second=0, microsecond=0) # ~6pm IST
            
            # Get combined busy periods for this window
            # We fetch freely for the whole window
            busy = self.get_busy_periods(start_utc, end_utc)
            
            # Scan 30m slots
            curr = start_utc
            while curr + timedelta(minutes=duration_minutes) <= end_utc:
                slot_end = curr + timedelta(minutes=duration_minutes)
                
                # Overlap check
                is_free = True
                for b_start, b_end in busy:
                    # Conflict if (b_start < slot_end) and (b_end > curr)
                    if b_start < slot_end and b_end > curr:
                        is_free = False
                        break
                
                if is_free:
                    candidates.append(curr)
                    if len(candidates) >= 3: 
                        return candidates
                
                curr += timedelta(minutes=30)
                
        return candidates
