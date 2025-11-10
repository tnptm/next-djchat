import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from base64 import b64encode, b64decode


def encrypt_with_room_key(room_key: bytes, plaintext: bytes) -> tuple:
    # AES-GCM with 12-byte nonce
    nonce = os.urandom(12)
    aesgcm = AESGCM(room_key[:32])  # AES256 needs 32 bytes
    ct = aesgcm.encrypt(nonce, plaintext, None)
    return ct, nonce


def decrypt_with_room_key(room_key: bytes, ciphertext: bytes, nonce: bytes) -> bytes:
    aesgcm = AESGCM(room_key[:32])
    pt = aesgcm.decrypt(nonce, ciphertext, None)
    return pt
