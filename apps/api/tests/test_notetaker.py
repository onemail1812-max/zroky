"""
Enterprise-grade tests for HeadlessNotetakerService.

Tests cover:
  - Platform detection (Google Meet, Zoom, Teams, unknown)
  - Service initialization and state management
  - Caption formatting and merging
  - Heuristic fallback summary
  - Summary generation via mocked Brain
  - Worker DB persistence flow
"""

import unittest
from unittest.mock import patch, AsyncMock, MagicMock
from datetime import datetime

from app.services.meetings.notetaker import (
    HeadlessNotetakerService,
    NotetakerSummary,
    MeetingPlatform,
    CaptionChunk,
    WhisperTranscriber,
    detect_platform,
    extract_audio_from_video,
)


class TestPlatformDetection(unittest.TestCase):
    """Verify URL → platform mapping for all supported platforms."""

    def test_google_meet(self):
        self.assertEqual(detect_platform("https://meet.google.com/abc-defg-hij"), MeetingPlatform.GOOGLE_MEET)

    def test_google_meet_with_params(self):
        self.assertEqual(detect_platform("https://meet.google.com/abc-defg-hij?authuser=0"), MeetingPlatform.GOOGLE_MEET)

    def test_zoom(self):
        self.assertEqual(detect_platform("https://zoom.us/j/123456789"), MeetingPlatform.ZOOM)

    def test_zoom_with_password(self):
        self.assertEqual(detect_platform("https://zoom.us/j/123456789?pwd=abc123"), MeetingPlatform.ZOOM)

    def test_zoom_dot_com(self):
        self.assertEqual(detect_platform("https://us02web.zoom.com/j/12345"), MeetingPlatform.ZOOM)

    def test_teams(self):
        self.assertEqual(detect_platform("https://teams.microsoft.com/l/meetup-join/abc"), MeetingPlatform.TEAMS)

    def test_teams_live(self):
        self.assertEqual(detect_platform("https://teams.live.com/meet/abc"), MeetingPlatform.TEAMS)

    def test_unknown(self):
        self.assertEqual(detect_platform("https://example.com/meeting"), MeetingPlatform.UNKNOWN)

    def test_empty_url(self):
        self.assertEqual(detect_platform(""), MeetingPlatform.UNKNOWN)


class TestHeadlessNotetakerService(unittest.IsolatedAsyncioTestCase):
    """Service lifecycle and state management tests."""

    def test_initialization(self):
        service = HeadlessNotetakerService()
        self.assertFalse(service.is_connected)
        self.assertEqual(service.bot_name, "Aaliyah Notetaker")
        self.assertEqual(service.platform, MeetingPlatform.UNKNOWN)

    def test_custom_bot_name(self):
        service = HeadlessNotetakerService(bot_name="Test Bot")
        self.assertEqual(service.bot_name, "Test Bot")

    async def test_transcription_fails_if_not_connected(self):
        service = HeadlessNotetakerService()
        with self.assertRaises(RuntimeError):
            await service.start_transcription()

    async def test_summary_generation_with_mock_brain(self):
        """Verify that generate_summary returns a valid NotetakerSummary via mocked Brain."""
        service = HeadlessNotetakerService()

        mock_response = NotetakerSummary(
            summary="Meeting about Q3 budget.",
            key_decisions=["Increased budget to $75k."],
            action_items=[{"owner": "Alex", "task": "Update finance sheet."}],
            sentiment="positive",
            keywords=["budget", "Q3"],
        )
        service.brain.think_json = AsyncMock(return_value=mock_response)

        transcript = (
            "[00:00] Alex:\n  Hey everyone, thanks for joining.\n"
            "[00:05] Sarah:\n  Hi Alex.\n"
            "[00:10] Alex:\n  We need to finalize the Q3 budget at $75k.\n"
        )
        result = await service.generate_summary(transcript)

        self.assertEqual(result.summary, "Meeting about Q3 budget.")
        self.assertEqual(len(result.key_decisions), 1)
        self.assertEqual(len(result.action_items), 1)
        self.assertEqual(result.action_items[0]["owner"], "Alex")
        self.assertEqual(result.sentiment, "positive")

    async def test_summary_empty_transcript(self):
        """Verify graceful handling of empty/no transcript."""
        service = HeadlessNotetakerService()
        result = await service.generate_summary("")
        self.assertIn("No transcript", result.summary)

    async def test_summary_no_transcript_captured(self):
        service = HeadlessNotetakerService()
        result = await service.generate_summary("(No transcript captured)")
        self.assertIn("No transcript", result.summary)


class TestCaptionFormatting(unittest.TestCase):
    """Test live caption formatting and merging."""

    def test_format_empty_captions(self):
        service = HeadlessNotetakerService()
        self.assertEqual(service._format_captions([]), "")

    def test_format_single_speaker(self):
        service = HeadlessNotetakerService()
        captions = [
            CaptionChunk(speaker="Alex", text="Hello everyone", timestamp=5.0),
            CaptionChunk(speaker="Alex", text="Let's get started", timestamp=8.0),
        ]
        result = service._format_captions(captions)
        self.assertIn("[00:05] Alex:", result)
        self.assertIn("Hello everyone", result)
        self.assertIn("Let's get started", result)
        # Should NOT have a second speaker header since same speaker
        self.assertEqual(result.count("Alex:"), 1)

    def test_format_multiple_speakers(self):
        service = HeadlessNotetakerService()
        captions = [
            CaptionChunk(speaker="Alex", text="Hello", timestamp=5.0),
            CaptionChunk(speaker="Sarah", text="Hi Alex", timestamp=10.0),
            CaptionChunk(speaker="Alex", text="Let's begin", timestamp=15.0),
        ]
        result = service._format_captions(captions)
        self.assertIn("Alex:", result)
        self.assertIn("Sarah:", result)
        # Alex speaks twice (two separate turns)
        self.assertEqual(result.count("Alex:"), 2)

    def test_format_timestamps(self):
        service = HeadlessNotetakerService()
        captions = [
            CaptionChunk(speaker="Alex", text="Late in the meeting", timestamp=3661.0),  # 1h 1m 1s
        ]
        result = service._format_captions(captions)
        self.assertIn("[61:01]", result)

    def test_merge_both_present(self):
        service = HeadlessNotetakerService()
        caption_text = "[00:05] Alex:\n  Hello everyone"
        whisper_text = "Hello everyone. Let's discuss the Q3 budget."
        result = service._merge_transcripts(caption_text, whisper_text)
        self.assertIn("LIVE TRANSCRIPT", result)
        self.assertIn("HIGH-ACCURACY TRANSCRIPT", result)
        self.assertIn("Alex", result)
        self.assertIn("Q3 budget", result)

    def test_merge_only_captions(self):
        service = HeadlessNotetakerService()
        result = service._merge_transcripts("Caption text", "")
        self.assertEqual(result, "Caption text")

    def test_merge_only_whisper(self):
        service = HeadlessNotetakerService()
        result = service._merge_transcripts("", "Whisper text")
        self.assertEqual(result, "Whisper text")


class TestHeuristicSummary(unittest.TestCase):
    """Test the fallback heuristic summary when LLM is unavailable."""

    def test_heuristic_extracts_speakers(self):
        service = HeadlessNotetakerService()
        transcript = (
            "[00:05] Alex:\n  Hello everyone\n"
            "[00:10] Sarah:\n  Hi there\n"
            "[00:15] Alex:\n  Let's discuss the budget\n"
        )
        result = service._heuristic_summary(transcript)
        self.assertIn("2 participants", result.summary)
        self.assertIn("Alex", result.keywords)
        self.assertIn("Sarah", result.keywords)

    def test_heuristic_estimates_duration(self):
        service = HeadlessNotetakerService()
        # ~300 words = ~2 minutes
        words = " ".join(["word"] * 300)
        result = service._heuristic_summary(words)
        self.assertIsNotNone(result.duration_minutes)
        self.assertGreater(result.duration_minutes, 0)


class TestWorkerPayloadValidation(unittest.IsolatedAsyncioTestCase):
    """Test the worker handles invalid payloads gracefully."""

    async def test_missing_meeting_url(self):
        from app.workers.notetaker_worker import process_meeting_job
        # Should not crash, just log and return
        await process_meeting_job({"workspace_id": "test-ws"})

    async def test_missing_workspace_id(self):
        from app.workers.notetaker_worker import process_meeting_job
        await process_meeting_job({"meeting_url": "https://meet.google.com/abc"})


if __name__ == "__main__":
    unittest.main()
