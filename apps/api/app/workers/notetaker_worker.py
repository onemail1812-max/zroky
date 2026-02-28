import asyncio
import logging
from app.services.meetings.notetaker import HeadlessNotetakerService

logger = logging.getLogger(__name__)


async def process_meeting_job(meeting_url: str):
    """
    Background worker job that gets enqueued when a scheduled meeting starts.
    It spins up the HeadlessNotetakerService, records the audio, and saves the summary.
    """
    notetaker = HeadlessNotetakerService()
    
    logger.info(f"[Notetaker Worker] Dispatching headless bot to joining meeting: {meeting_url}")
    
    try:
        # 1. Join Meeting
        connected = await notetaker.join_meeting(meeting_url)
        if not connected:
            logger.error(f"[Notetaker Worker] Failed to join meeting: {meeting_url}")
            return
            
        # 2. Record and Transcribe
        logger.info("[Notetaker Worker] Meeting connected. Starting transcription...")
        raw_transcript = await notetaker.start_transcription()
        
        # 3. Analyze and Summarize
        logger.info("[Notetaker Worker] Meeting ended. Generating intelligence summary...")
        summary_data = await notetaker.generate_summary(raw_transcript)
        
        logger.info(f"[Notetaker Worker] Summary generated: {summary_data.summary}")
        logger.info(f"[Notetaker Worker] Key Decisions: {len(summary_data.key_decisions)} found.")
        logger.info(f"[Notetaker Worker] Action Items: {len(summary_data.action_items)} found.")
        
        # In a real environment, this data would be committed to the Intelligence Database/Workspace
        # session.add(MeetingSummary(url=meeting_url, data=summary_data.dict()))
        # session.commit()
        
    except Exception as e:
        logger.error(f"[Notetaker Worker] Fatal error processing meeting {meeting_url}: {e}")
