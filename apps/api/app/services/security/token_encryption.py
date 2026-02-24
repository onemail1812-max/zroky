import base64
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from app.config import settings

def _get_key() -> bytes:
    """Get the 32-byte encryption key from settings."""
    key_hex = settings.OAUTH_ENCRYPTION_KEY
    if len(key_hex) == 64:
        return bytes.fromhex(key_hex)
    # Fallback/Development: derived from secret key if hex not provided correctly
    return base64.b64decode(settings.SECRET_KEY.ljust(44, "="))[:32]

def encrypt_token(plaintext: str) -> str:
    """Encrypt a plaintext token using AES-256-GCM."""
    if not plaintext:
        return ""
    
    key = _get_key()
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)
    ciphertext = aesgcm.encrypt(nonce, plaintext.encode(), None)
    
    # Prepend nonce to ciphertext and base64 encode
    return base64.b64encode(nonce + ciphertext).decode()

def decrypt_token(encrypted_token: str) -> str:
    """Decrypt a base64 encoded AES-GCM token."""
    if not encrypted_token:
        return ""
    
    try:
        data = base64.b64decode(encrypted_token)
        nonce = data[:12]
        ciphertext = data[12:]
        
        key = _get_key()
        aesgcm = AESGCM(key)
        plaintext = aesgcm.decrypt(nonce, ciphertext, None)
        return plaintext.decode()
    except Exception as e:
        # If decryption fails, it might be stored in plaintext (legacy)
        # or the key changed. Return empty string or handle accordingly.
        return ""
