import io
import logging
from typing import Optional
try:
    from pypdf import PdfReader
except ImportError:
    PdfReader = None

logger = logging.getLogger(__name__)

class FileExtractorService:
    @staticmethod
    def extract_text(content: bytes, mime_type: str) -> Optional[str]:
        """
        Extract searchable text from attachments (PDF, Text).
        """
        try:
            if mime_type == "application/pdf":
                if not PdfReader:
                    logger.warning("pypdf not installed, skipping PDF extraction.")
                    return None
                reader = PdfReader(io.BytesIO(content))
                text_parts = []
                # Extract first 5 pages to avoid massive blowup
                for i in range(min(len(reader.pages), 5)):
                    text_parts.append(reader.pages[i].extract_text())
                return "\n".join(text_parts)
            
            elif mime_type.startswith("text/"):
                return content.decode("utf-8", errors="ignore")
                
        except Exception as e:
            logger.warning(f"Extraction failed for type {mime_type}: {e}")
            
        return None
