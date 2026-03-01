"""
Enterprise-Grade Headless Meeting Notetaker Service.

Architecture:
  1. Playwright headless browser joins Google Meet / Zoom / Teams
  2. Dual-mode transcription:
     - Mode A (Live): DOM caption scraping every 2s for real-time text
     - Mode B (Post-meeting): Screen recording → FFmpeg audio extraction → Whisper STT
  3. Existing Brain LLM pipeline generates executive summaries

Supports: Google Meet, Zoom Web Client, Microsoft Teams

Open-source references:
  - screenappai/meeting-bot (Playwright meeting automation)
  - OpenAI Whisper (speech-to-text)
  - Playwright built-in video recording
"""

import asyncio
import json
import logging
import os
import re
import subprocess
import tempfile
import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from app.config import settings
from app.services.brain.core import Brain

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Data Models
# ---------------------------------------------------------------------------

class MeetingPlatform(str, Enum):
    GOOGLE_MEET = "google_meet"
    ZOOM = "zoom"
    TEAMS = "teams"
    UNKNOWN = "unknown"


class NotetakerSummary(BaseModel):
    summary: str = Field(..., description="A high-level executive summary of the meeting.")
    key_decisions: List[str] = Field(default_factory=list, description="Key decisions made during the meeting.")
    action_items: List[Dict[str, str]] = Field(default_factory=list, description="Action items with owner and task.")
    sentiment: str = Field(default="neutral", description="Overall meeting sentiment.")
    keywords: List[str] = Field(default_factory=list, description="Topic keywords.")
    duration_minutes: Optional[int] = Field(None, description="Meeting duration in minutes.")


@dataclass
class CaptionChunk:
    speaker: str
    text: str
    timestamp: float


@dataclass
class TranscriptionResult:
    """Combined result from dual-mode transcription."""
    live_captions: List[CaptionChunk] = field(default_factory=list)
    whisper_transcript: str = ""
    merged_transcript: str = ""
    duration_seconds: float = 0.0
    platform: str = "unknown"


# ---------------------------------------------------------------------------
# Platform Detection
# ---------------------------------------------------------------------------

def detect_platform(url: str) -> MeetingPlatform:
    """Detect meeting platform from URL."""
    url_lower = url.lower()
    if "meet.google.com" in url_lower:
        return MeetingPlatform.GOOGLE_MEET
    if "zoom.us" in url_lower or "zoom.com" in url_lower:
        return MeetingPlatform.ZOOM
    if "teams.microsoft.com" in url_lower or "teams.live.com" in url_lower:
        return MeetingPlatform.TEAMS
    return MeetingPlatform.UNKNOWN


# ---------------------------------------------------------------------------
# Caption DOM Selectors (per platform)
# ---------------------------------------------------------------------------

CAPTION_SELECTORS: Dict[MeetingPlatform, Dict[str, str]] = {
    MeetingPlatform.GOOGLE_MEET: {
        # Google Meet caption container and individual caption spans
        "container": "div[jsname='tgaKEf'], div.a4cQT",
        "speaker": "div.zs7s8d, div.KcIKyf",
        "text": "span.CNusmb, span",
    },
    MeetingPlatform.ZOOM: {
        "container": ".meeting-chat__container, #live-transcription-subtitle-wrap, .vz0Dy",
        "speaker": ".speaker-name, .transcript-sender",
        "text": ".transcript-text, .subtitle-content",
    },
    MeetingPlatform.TEAMS: {
        "container": "[data-tid='closed-caption-v2-renderer'], .ui-chat",
        "speaker": ".ui-chat__message__author",
        "text": ".ui-chat__message__body, [data-tid='closed-caption-text']",
    },
}

# ---------------------------------------------------------------------------
# Whisper Integration
# ---------------------------------------------------------------------------

class WhisperTranscriber:
    """
    Transcribes audio files using OpenAI Whisper.
    Supports both local whisper library and OpenAI Whisper API.
    """

    def __init__(self):
        self._local_model = None
        self._use_api = bool(settings.OPENROUTER_API_KEY or os.environ.get("OPENAI_API_KEY"))

    async def transcribe(self, audio_path: str) -> str:
        """Transcribe an audio file to text."""
        if not Path(audio_path).exists():
            logger.error("Audio file not found: %s", audio_path)
            return ""

        # Try API first (faster, no GPU needed)
        if self._use_api:
            try:
                return await self._transcribe_via_api(audio_path)
            except Exception as e:
                logger.warning("Whisper API failed, trying local: %s", e)

        # Fall back to local whisper
        try:
            return await self._transcribe_local(audio_path)
        except Exception as e:
            logger.error("Local Whisper transcription failed: %s", e)
            return ""

    async def _transcribe_via_api(self, audio_path: str) -> str:
        """Use OpenAI Whisper API for transcription."""
        import httpx

        api_key = os.environ.get("OPENAI_API_KEY") or settings.OPENROUTER_API_KEY
        if not api_key:
            raise ValueError("No API key available for Whisper API")

        async with httpx.AsyncClient(timeout=300) as client:
            with open(audio_path, "rb") as f:
                response = await client.post(
                    "https://api.openai.com/v1/audio/transcriptions",
                    headers={"Authorization": f"Bearer {api_key}"},
                    files={"file": (Path(audio_path).name, f, "audio/wav")},
                    data={
                        "model": "whisper-1",
                        "response_format": "verbose_json",
                        "timestamp_granularities[]": "segment",
                    },
                )

            if response.status_code != 200:
                raise RuntimeError(f"Whisper API error {response.status_code}: {response.text}")

            result = response.json()
            return result.get("text", "")

    async def _transcribe_local(self, audio_path: str) -> str:
        """Use local whisper library for transcription."""
        try:
            import whisper
        except ImportError:
            logger.warning("Local whisper not installed. Install with: pip install openai-whisper")
            return ""

        loop = asyncio.get_event_loop()

        def _run():
            if self._local_model is None:
                self._local_model = whisper.load_model("base")
            result = self._local_model.transcribe(audio_path)
            return result.get("text", "")

        return await loop.run_in_executor(None, _run)


# ---------------------------------------------------------------------------
# Audio Extraction (FFmpeg)
# ---------------------------------------------------------------------------

async def extract_audio_from_video(video_path: str, output_dir: Optional[str] = None) -> Optional[str]:
    """Extract audio track from a video file using FFmpeg."""
    if not Path(video_path).exists():
        logger.error("Video file not found: %s", video_path)
        return None

    out_dir = output_dir or tempfile.mkdtemp(prefix="aaliyah_audio_")
    audio_path = os.path.join(out_dir, f"meeting_audio_{uuid.uuid4().hex[:8]}.wav")

    cmd = [
        "ffmpeg", "-i", video_path,
        "-vn",                          # No video
        "-acodec", "pcm_s16le",         # PCM 16-bit (Whisper-compatible)
        "-ar", "16000",                 # 16kHz sample rate (Whisper optimal)
        "-ac", "1",                     # Mono
        "-y",                           # Overwrite
        audio_path,
    ]

    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        _, stderr = await asyncio.wait_for(proc.communicate(), timeout=300)

        if proc.returncode != 0:
            logger.error("FFmpeg failed: %s", stderr.decode()[:500])
            return None

        if Path(audio_path).exists() and Path(audio_path).stat().st_size > 0:
            logger.info("Audio extracted: %s (%.1f MB)", audio_path, Path(audio_path).stat().st_size / 1e6)
            return audio_path

        return None

    except asyncio.TimeoutError:
        logger.error("FFmpeg timed out after 300s")
        return None
    except FileNotFoundError:
        logger.error("FFmpeg not found. Install with: apt-get install ffmpeg (Linux) or choco install ffmpeg (Windows)")
        return None


# ---------------------------------------------------------------------------
# HeadlessNotetakerService — Main Service
# ---------------------------------------------------------------------------

class HeadlessNotetakerService:
    """
    Enterprise-grade meeting notetaker that joins video calls via headless browser,
    captures live captions + records audio for high-accuracy Whisper transcription,
    and generates executive summaries via the Brain LLM pipeline.

    Supported platforms: Google Meet, Zoom (Web), Microsoft Teams
    """

    def __init__(self, bot_name: str = "Aaliyah Notetaker"):
        self.brain = Brain()
        self.bot_name = bot_name
        self.is_connected = False
        self.platform: MeetingPlatform = MeetingPlatform.UNKNOWN
        self.meeting_url: str = ""

        # Playwright state
        self._browser = None
        self._context = None
        self._page = None

        # Transcription state
        self._captions: List[CaptionChunk] = []
        self._caption_task: Optional[asyncio.Task] = None
        self._recording_path: Optional[str] = None
        self._start_time: float = 0.0

        # Workers
        self._whisper = WhisperTranscriber()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def join_meeting(self, meeting_url: str, join_code: Optional[str] = None) -> bool:
        """
        Launch headless Chromium and join the meeting.
        Returns True on successful join, False on failure.
        """
        self.meeting_url = meeting_url
        self.platform = detect_platform(meeting_url)

        logger.info("[Notetaker] Joining %s meeting: %s", self.platform.value, meeting_url)

        try:
            from playwright.async_api import async_playwright
        except ImportError:
            logger.error(
                "[Notetaker] Playwright not installed. "
                "Install with: pip install playwright && playwright install chromium"
            )
            return False

        try:
            pw = await async_playwright().start()

            # Temp dir for recording
            recording_dir = tempfile.mkdtemp(prefix="aaliyah_meeting_")

            self._browser = await pw.chromium.launch(
                headless=True,
                args=[
                    "--use-fake-ui-for-media-stream",   # Auto-allow mic/camera
                    "--use-fake-device-for-media-stream",
                    "--disable-blink-features=AutomationControlled",
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-gpu",
                ],
            )

            self._context = await self._browser.new_context(
                permissions=["microphone", "camera", "notifications"],
                user_agent=(
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/120.0.0.0 Safari/537.36"
                ),
                record_video_dir=recording_dir,
                record_video_size={"width": 1280, "height": 720},
                viewport={"width": 1280, "height": 720},
            )

            self._page = await self._context.new_page()

            # Platform-specific join
            joined = False
            if self.platform == MeetingPlatform.GOOGLE_MEET:
                joined = await self._join_google_meet(meeting_url)
            elif self.platform == MeetingPlatform.ZOOM:
                joined = await self._join_zoom(meeting_url)
            elif self.platform == MeetingPlatform.TEAMS:
                joined = await self._join_teams(meeting_url)
            else:
                # Generic: just navigate and hope for the best
                await self._page.goto(meeting_url, wait_until="networkidle", timeout=30000)
                joined = True

            if joined:
                self.is_connected = True
                self._start_time = time.time()
                logger.info("[Notetaker] Successfully joined meeting as '%s'", self.bot_name)

                # Start caption scraping in background
                self._caption_task = asyncio.create_task(self._scrape_captions_loop())

            return joined

        except Exception as e:
            logger.error("[Notetaker] Failed to join meeting: %s", e, exc_info=True)
            await self._cleanup()
            return False

    async def start_transcription(self) -> str:
        """
        Wait for the meeting to end, then produce the final merged transcript.
        Blocks until the meeting ends (detected by page close or disconnect).
        Returns the full transcript text.
        """
        if not self.is_connected:
            raise RuntimeError("Cannot start transcription: Not connected to a meeting.")

        logger.info("[Notetaker] Monitoring meeting for end signal...")

        # Wait for meeting to end
        await self._wait_for_meeting_end()

        # Stop caption scraping
        if self._caption_task and not self._caption_task.done():
            self._caption_task.cancel()
            try:
                await self._caption_task
            except asyncio.CancelledError:
                pass

        duration = time.time() - self._start_time
        logger.info("[Notetaker] Meeting ended after %.0f seconds. Processing transcript...", duration)

        # Get recording path before closing context
        recording_path = None
        if self._page and self._page.video:
            try:
                recording_path = await self._page.video.path()
            except Exception:
                pass

        # Close browser to finalize recording
        await self._cleanup()

        # Build the final transcript
        result = TranscriptionResult(
            live_captions=list(self._captions),
            duration_seconds=duration,
            platform=self.platform.value,
        )

        # Mode A: Format live captions
        caption_transcript = self._format_captions(self._captions)

        # Mode B: Whisper transcription from recording
        whisper_transcript = ""
        if recording_path and Path(recording_path).exists():
            audio_path = await extract_audio_from_video(recording_path)
            if audio_path:
                logger.info("[Notetaker] Running Whisper transcription...")
                whisper_transcript = await self._whisper.transcribe(audio_path)
                result.whisper_transcript = whisper_transcript

                # Clean up temp audio file
                try:
                    os.unlink(audio_path)
                except OSError:
                    pass

        # Merge: prefer Whisper (more accurate) but use captions as fallback
        if whisper_transcript and len(whisper_transcript) > len(caption_transcript):
            # Whisper got more content — use it as primary, with caption speakers
            result.merged_transcript = self._merge_transcripts(caption_transcript, whisper_transcript)
        elif caption_transcript:
            result.merged_transcript = caption_transcript
        else:
            result.merged_transcript = whisper_transcript or "(No transcript captured)"

        logger.info(
            "[Notetaker] Transcript ready: %d caption chunks + %d chars Whisper = %d chars merged",
            len(self._captions),
            len(whisper_transcript),
            len(result.merged_transcript),
        )

        return result.merged_transcript

    async def generate_summary(self, raw_transcript: str) -> NotetakerSummary:
        """
        Process the raw meeting transcript through Aaliyah's Brain
        to extract executive summaries, decisions, and action items.
        """
        if not raw_transcript or raw_transcript == "(No transcript captured)":
            return NotetakerSummary(
                summary="No transcript was captured for this meeting.",
                key_decisions=[],
                action_items=[],
            )

        system_prompt = (
            "You are an elite Executive Assistant responsible for summarizing meeting transcripts.\n"
            "Extract a concise executive summary, key decisions made, and individual action items.\n"
            "For action items, identify the owner (person responsible) and the specific task.\n"
            "Also assess the overall sentiment and extract topic keywords.\n"
            "Output strictly as a JSON object matching the requested schema.\n"
            "STRICT RULES:\n"
            "1. Be concise and actionable. No fluff.\n"
            "2. Action items must have an owner. If unclear, mark as 'Unassigned'.\n"
            "3. Decisions must be concrete, not vague summaries.\n"
        )

        # Truncate very long transcripts to fit context window
        max_chars = 12000
        transcript_text = raw_transcript[:max_chars]
        if len(raw_transcript) > max_chars:
            transcript_text += "\n\n[Transcript truncated for processing]"

        user_prompt = (
            f"Summarize this meeting transcript:\n\n"
            f"{transcript_text}\n\n"
            f"Return JSON with: executive_summary (str), key_decisions (list[str]), "
            f"action_items (list[dict with 'owner' and 'task']), sentiment (str), keywords (list[str])"
        )

        try:
            response = await self.brain.think_json(
                prompt=user_prompt,
                response_model=NotetakerSummary,
                system_prompt=system_prompt,
                temperature_override=0.1,
            )
            return response
        except Exception as e:
            logger.error("[Notetaker] LLM summary failed: %s", e)
            # Fallback: extract basic info heuristically
            return self._heuristic_summary(raw_transcript)

    # ------------------------------------------------------------------
    # Platform-Specific Join Strategies
    # ------------------------------------------------------------------

    async def _join_google_meet(self, url: str) -> bool:
        """Join a Google Meet session."""
        page = self._page
        try:
            await page.goto(url, wait_until="networkidle", timeout=30000)
            await asyncio.sleep(2)

            # Dismiss "Got it" / cookie banners
            for selector in ["button:has-text('Got it')", "button:has-text('Dismiss')", "[aria-label='Dismiss']"]:
                try:
                    btn = page.locator(selector).first
                    if await btn.is_visible(timeout=2000):
                        await btn.click()
                        await asyncio.sleep(0.5)
                except Exception:
                    pass

            # Enter name if "Your name" field is visible (guest mode)
            try:
                name_input = page.locator("input[aria-label='Your name']").first
                if await name_input.is_visible(timeout=3000):
                    await name_input.fill(self.bot_name)
                    await asyncio.sleep(0.5)
            except Exception:
                pass

            # Turn off camera and microphone
            for aria_label in ["Turn off camera", "Turn off microphone"]:
                try:
                    btn = page.locator(f"[aria-label='{aria_label}']").first
                    if await btn.is_visible(timeout=2000):
                        await btn.click()
                        await asyncio.sleep(0.3)
                except Exception:
                    pass

            # Click "Ask to join" or "Join now"
            for join_text in ["Ask to join", "Join now", "Join"]:
                try:
                    join_btn = page.locator(f"button:has-text('{join_text}')").first
                    if await join_btn.is_visible(timeout=3000):
                        await join_btn.click()
                        logger.info("[Notetaker] Clicked '%s' button", join_text)
                        break
                except Exception:
                    continue

            # Wait for the meeting UI to load (indicates we are in)
            await asyncio.sleep(5)

            # Enable captions
            await self._enable_google_meet_captions(page)

            return True

        except Exception as e:
            logger.error("[Notetaker] Google Meet join failed: %s", e)
            return False

    async def _enable_google_meet_captions(self, page) -> None:
        """Enable closed captions in Google Meet."""
        try:
            # Try the captions button (usually [c] keyboard shortcut)
            await page.keyboard.press("c")
            await asyncio.sleep(1)
            logger.info("[Notetaker] Enabled Google Meet captions via keyboard shortcut")
        except Exception:
            # Fallback: click the CC button
            try:
                cc_btn = page.locator("[aria-label='Turn on captions']").first
                if await cc_btn.is_visible(timeout=3000):
                    await cc_btn.click()
                    logger.info("[Notetaker] Enabled Google Meet captions via button")
            except Exception as e:
                logger.warning("[Notetaker] Could not enable captions: %s", e)

    async def _join_zoom(self, url: str) -> bool:
        """Join a Zoom meeting via web client."""
        page = self._page
        try:
            # Force web client by appending the launch URL
            web_url = url
            if "zoom.us/j/" in url and "?pwd=" not in url:
                web_url = url.replace("zoom.us/j/", "zoom.us/wc/join/")
            elif "zoom.us/j/" in url:
                meeting_id = re.search(r"/j/(\d+)", url)
                if meeting_id:
                    web_url = f"https://zoom.us/wc/{meeting_id.group(1)}/join"

            await page.goto(web_url, wait_until="networkidle", timeout=30000)
            await asyncio.sleep(3)

            # Click "Join from Your Browser" if present
            try:
                browser_link = page.locator("a:has-text('Join from Your Browser'), a:has-text('join from your browser')").first
                if await browser_link.is_visible(timeout=5000):
                    await browser_link.click()
                    await asyncio.sleep(3)
            except Exception:
                pass

            # Fill in name
            try:
                name_input = page.locator("#inputname, input[placeholder='Your Name']").first
                if await name_input.is_visible(timeout=3000):
                    await name_input.fill(self.bot_name)
            except Exception:
                pass

            # Accept terms if present
            try:
                terms_checkbox = page.locator("#wc_agree1, input[type='checkbox']").first
                if await terms_checkbox.is_visible(timeout=2000):
                    await terms_checkbox.check()
            except Exception:
                pass

            # Click Join
            try:
                join_btn = page.locator("button:has-text('Join'), #joinBtn").first
                if await join_btn.is_visible(timeout=3000):
                    await join_btn.click()
                    await asyncio.sleep(5)
            except Exception:
                pass

            # Mute audio + video
            for selector in ["[aria-label='mute my microphone']", "[aria-label='stop my video']"]:
                try:
                    btn = page.locator(selector).first
                    if await btn.is_visible(timeout=2000):
                        await btn.click()
                except Exception:
                    pass

            return True

        except Exception as e:
            logger.error("[Notetaker] Zoom join failed: %s", e)
            return False

    async def _join_teams(self, url: str) -> bool:
        """Join a Microsoft Teams meeting via web client."""
        page = self._page
        try:
            await page.goto(url, wait_until="networkidle", timeout=30000)
            await asyncio.sleep(3)

            # Click "Continue on this browser"
            try:
                browser_btn = page.locator("button:has-text('Continue on this browser'), a:has-text('Join on the web instead')").first
                if await browser_btn.is_visible(timeout=5000):
                    await browser_btn.click()
                    await asyncio.sleep(3)
            except Exception:
                pass

            # Enter name
            try:
                name_input = page.locator("input[data-tid='prejoin-display-name-input'], input[placeholder='Type your name']").first
                if await name_input.is_visible(timeout=3000):
                    await name_input.clear()
                    await name_input.fill(self.bot_name)
            except Exception:
                pass

            # Toggle off camera and mic
            for label in ["toggle-video", "toggle-mute"]:
                try:
                    toggle = page.locator(f"[data-tid='{label}'], [aria-label*='camera'], [aria-label*='microphone']").first
                    if await toggle.is_visible(timeout=2000):
                        await toggle.click()
                except Exception:
                    pass

            # Click "Join now"
            try:
                join_btn = page.locator("button:has-text('Join now'), button[data-tid='prejoin-join-button']").first
                if await join_btn.is_visible(timeout=5000):
                    await join_btn.click()
                    await asyncio.sleep(5)
            except Exception:
                pass

            return True

        except Exception as e:
            logger.error("[Notetaker] Teams join failed: %s", e)
            return False

    # ------------------------------------------------------------------
    # Caption Scraping Engine
    # ------------------------------------------------------------------

    async def _scrape_captions_loop(self) -> None:
        """Continuously scrape live captions from the meeting DOM."""
        if self.platform not in CAPTION_SELECTORS:
            logger.warning("[Notetaker] No caption selectors for platform %s", self.platform.value)
            return

        selectors = CAPTION_SELECTORS[self.platform]
        seen_texts: set = set()
        poll_interval = 2.0

        logger.info("[Notetaker] Caption scraper started (polling every %.1fs)", poll_interval)

        while self.is_connected:
            try:
                # Scrape all caption containers
                containers = await self._page.query_selector_all(selectors["container"])

                for container in containers:
                    # Extract speaker
                    speaker = "Unknown"
                    try:
                        speaker_el = await container.query_selector(selectors["speaker"])
                        if speaker_el:
                            speaker = (await speaker_el.inner_text()).strip() or "Unknown"
                    except Exception:
                        pass

                    # Extract text
                    text = ""
                    try:
                        text_el = await container.query_selector(selectors["text"])
                        if text_el:
                            text = (await text_el.inner_text()).strip()
                    except Exception:
                        pass

                    if text and text not in seen_texts:
                        seen_texts.add(text)
                        chunk = CaptionChunk(
                            speaker=speaker,
                            text=text,
                            timestamp=time.time() - self._start_time,
                        )
                        self._captions.append(chunk)
                        logger.debug("[Caption] %s: %s", speaker, text[:80])

            except Exception as e:
                # Page might be navigating or closed
                if "Target closed" in str(e) or "Connection closed" in str(e):
                    break
                logger.debug("[Notetaker] Caption scrape error (non-fatal): %s", e)

            await asyncio.sleep(poll_interval)

        logger.info("[Notetaker] Caption scraper stopped. Captured %d chunks.", len(self._captions))

    # ------------------------------------------------------------------
    # Meeting End Detection
    # ------------------------------------------------------------------

    async def _wait_for_meeting_end(self) -> None:
        """
        Wait for the meeting to end. Detected by:
        1. Page navigation away from meeting URL
        2. "You left the meeting" / "Call ended" overlay
        3. Browser context closing
        4. Maximum duration timeout (3 hours)
        """
        max_duration = 3 * 60 * 60  # 3 hours
        check_interval = 5  # seconds
        elapsed = 0

        while self.is_connected and elapsed < max_duration:
            try:
                # Check if page is still alive
                if self._page.is_closed():
                    logger.info("[Notetaker] Page closed — meeting ended")
                    break

                # Check for "meeting ended" indicators
                end_indicators = [
                    "text='You left the meeting'",
                    "text='The meeting has ended'",
                    "text='Call ended'",
                    "text='You have been removed'",
                    "text='Return to home screen'",
                ]
                for indicator in end_indicators:
                    try:
                        locator = self._page.locator(indicator).first
                        if await locator.is_visible(timeout=500):
                            logger.info("[Notetaker] Meeting end detected: %s", indicator)
                            self.is_connected = False
                            return
                    except Exception:
                        pass

            except Exception as e:
                if "Target closed" in str(e) or "Connection closed" in str(e):
                    break
                logger.debug("[Notetaker] End detection check error: %s", e)

            await asyncio.sleep(check_interval)
            elapsed += check_interval

        if elapsed >= max_duration:
            logger.warning("[Notetaker] Maximum meeting duration (3hr) reached — force-ending")

        self.is_connected = False

    # ------------------------------------------------------------------
    # Transcript Processing
    # ------------------------------------------------------------------

    def _format_captions(self, captions: List[CaptionChunk]) -> str:
        """Format caption chunks into a readable transcript."""
        if not captions:
            return ""

        lines = []
        current_speaker = None

        for chunk in captions:
            if chunk.speaker != current_speaker:
                current_speaker = chunk.speaker
                minutes = int(chunk.timestamp // 60)
                seconds = int(chunk.timestamp % 60)
                lines.append(f"\n[{minutes:02d}:{seconds:02d}] {current_speaker}:")

            lines.append(f"  {chunk.text}")

        return "\n".join(lines).strip()

    def _merge_transcripts(self, caption_text: str, whisper_text: str) -> str:
        """
        Merge caption-based transcript (has speakers) with Whisper transcript (more accurate text).
        Uses caption speakers as headers and Whisper content for the body.
        """
        if not caption_text:
            return whisper_text
        if not whisper_text:
            return caption_text

        # Use caption transcript as the base (has speaker labels and timestamps)
        # But append Whisper's full transcript as a high-accuracy reference
        merged = (
            "--- LIVE TRANSCRIPT (with speakers) ---\n\n"
            f"{caption_text}\n\n"
            "--- HIGH-ACCURACY TRANSCRIPT (Whisper) ---\n\n"
            f"{whisper_text}"
        )
        return merged

    def _heuristic_summary(self, transcript: str) -> NotetakerSummary:
        """Fallback summary when LLM is unavailable."""
        lines = transcript.split("\n")
        speakers = set()
        for line in lines:
            if ":" in line and line.startswith("["):
                parts = line.split("]", 1)
                if len(parts) > 1:
                    speaker_part = parts[1].strip().rstrip(":")
                    if speaker_part:
                        speakers.add(speaker_part)

        word_count = len(transcript.split())
        est_minutes = max(1, word_count // 150)  # ~150 words per minute of speech

        return NotetakerSummary(
            summary=f"Meeting with {len(speakers)} participants, approximately {est_minutes} minutes.",
            key_decisions=["(LLM summarization unavailable — please review transcript manually)"],
            action_items=[],
            sentiment="neutral",
            keywords=list(speakers)[:5],
            duration_minutes=est_minutes,
        )

    # ------------------------------------------------------------------
    # Cleanup
    # ------------------------------------------------------------------

    async def _cleanup(self) -> None:
        """Safely close all Playwright resources."""
        self.is_connected = False

        if self._caption_task and not self._caption_task.done():
            self._caption_task.cancel()
            try:
                await self._caption_task
            except asyncio.CancelledError:
                pass

        try:
            if self._page and not self._page.is_closed():
                # Save video path before closing
                if self._page.video:
                    try:
                        self._recording_path = await self._page.video.path()
                    except Exception:
                        pass
                await self._page.close()
        except Exception:
            pass

        try:
            if self._context:
                await self._context.close()
        except Exception:
            pass

        try:
            if self._browser:
                await self._browser.close()
        except Exception:
            pass

        logger.info("[Notetaker] Playwright resources cleaned up")
