try:
    import magic
except ImportError:
    magic = None
import mimetypes
import os
import logging
from typing import Tuple, List

logger = logging.getLogger(__name__)

# Enterprise allowlist for file types
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/csv",
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/zip", # Use caution with zips
}

class FileSecurityService:
    @staticmethod
    def scan_file(content: bytes, filename: str) -> Tuple[bool, str]:
        """
        Scan file for viruses and verify type.
        In a real enterprise environment, this would integrate with ClamAV or similar.
        """
        # 1. Size check (e.g. 25MB limit)
        if len(content) > 25 * 1024 * 1024:
            return False, "File too large (Max 25MB)"

        # 2. Mime-type verification (Magic numbers)
        if magic:
            try:
                m = magic.Magic(mime=True)
                detected_type = m.from_buffer(content)
            except Exception:
                detected_type, _ = mimetypes.guess_type(filename)
        else:
            detected_type, _ = mimetypes.guess_type(filename)
        
        detected_type = detected_type or "application/octet-stream"

        if detected_type not in ALLOWED_MIME_TYPES:
            # Check if extension is allows as second fallback
            import os
            _, ext = os.path.splitext(filename.lower())
            if not any(filename.lower().endswith(e) for e in [".pdf", ".docx", ".txt", ".csv", ".xlsx"]):
                logger.warning(f"BLOCKED: Security policy blocked file {filename} with type {detected_type}")
                return False, f"File type {detected_type} not allowed for security reasons."

        # 3. Virus Scan Placeholder
        # TODO: Integration with npx clamscan or a SaaS API
        logger.info(f"SCAN: File {filename} ({detected_type}) passed basic security checks.")
        
        return True, "Safe"

    @staticmethod
    def is_safe_extension(filename: str) -> bool:
        safe_exts = {".pdf", ".docx", ".doc", ".xlsx", ".xls", ".csv", ".txt", ".png", ".jpg", ".jpeg"}
        import os
        _, ext = os.path.splitext(filename.lower())
        return ext in safe_exts
