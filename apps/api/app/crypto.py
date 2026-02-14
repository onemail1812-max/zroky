"""Cryptography utilities."""
from cryptography.fernet import Fernet
from app.config import settings
import base64
import hashlib


def generate_key() -> str:
    """Generate a Fernet encryption key."""
    return Fernet.generate_key().decode()


def get_cipher() -> Fernet:
    """Get Fernet cipher instance using secret key."""
    key = base64.urlsafe_b64encode(
        hashlib.sha256(settings.secret_key.encode()).digest()
    )
    return Fernet(key)


def encrypt_data(data: str) -> str:
    """Encrypt a string value."""
    cipher = get_cipher()
    return cipher.encrypt(data.encode()).decode()


def decrypt_data(encrypted_data: str) -> str:
    """Decrypt an encrypted string value."""
    cipher = get_cipher()
    return cipher.decrypt(encrypted_data.encode()).decode()
