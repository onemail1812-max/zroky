import pytest
import io
from app.services.extraction.file_extractor import FileExtractorService

def test_extract_text_plain():
    content = b"Hello, this is a test."
    res = FileExtractorService.extract_text(content, "text/plain")
    assert "Hello, this is a test." in res

from unittest.mock import patch, MagicMock

def test_extract_text_pdf_mock():
    # Mock PdfReader to avoid needing a real PDF file
    with patch("app.services.extraction.file_extractor.PdfReader") as mock_pdf_class:
        mock_reader = MagicMock()
        mock_page = MagicMock()
        mock_page.extract_text.return_value = "Extracted PDF Text"
        mock_reader.pages = [mock_page]
        mock_pdf_class.return_value = mock_reader
        
        content = b"%PDF-1.5 test"
        res = FileExtractorService.extract_text(content, "application/pdf")
        assert "Extracted PDF Text" in res

def test_extract_text_docx_mock():
    with patch("app.services.extraction.file_extractor.docx") as mock_docx_mod:
        mock_doc = MagicMock()
        mock_para1 = MagicMock()
        mock_para1.text = "Hello DOCX"
        mock_doc.paragraphs = [mock_para1]
        mock_docx_mod.Document.return_value = mock_doc

        content = b"fake docx content"
        res = FileExtractorService.extract_text(content, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
        assert "Hello DOCX" in res

def test_extract_text_xlsx_mock():
    with patch("app.services.extraction.file_extractor.openpyxl") as mock_openpyxl_mod:
        mock_wb = MagicMock()
        mock_wb.sheetnames = ["Sheet1"]
        
        mock_sheet = MagicMock()
        mock_sheet.iter_rows.return_value = [("Row1Col1", "Row1Col2")]
        mock_wb.__getitem__.return_value = mock_sheet
        
        mock_openpyxl_mod.load_workbook.return_value = mock_wb

        content = b"fake xlsx content"
        res = FileExtractorService.extract_text(content, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        assert "Row1Col1 | Row1Col2" in res

def test_is_image():
    assert FileExtractorService.is_image("image/png") is True
    assert FileExtractorService.is_image("application/pdf") is False
