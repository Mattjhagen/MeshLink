// Client-side AES-GCM encryption using Web Crypto API
// Keys are derived from a shared secret based on conversation ID
// Nothing is ever sent in plaintext

const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;

async function deriveKey(secret) {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode("meshnet-salt-v1"),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

export function getConversationId(emailA, emailB) {
  return [emailA, emailB].sort().join("|");
}

function getConversationSecret(emailA, emailB) {
  return `meshnet:${getConversationId(emailA, emailB)}`;
}

// Convert ArrayBuffer to Base64 easily
function bufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert Base64 back to ArrayBuffer
function base64ToBuffer(base64) {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function encryptMessage(plaintext, senderEmail, recipientEmail) {
  const secret = getConversationSecret(senderEmail, recipientEmail);
  const key = await deriveKey(secret);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();

  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    enc.encode(plaintext)
  );

  return {
    ciphertext: bufferToBase64(ciphertextBuffer),
    iv: bufferToBase64(iv)
  };
}

export async function decryptMessage(ciphertextB64, ivB64, senderEmail, recipientEmail) {
  const secret = getConversationSecret(senderEmail, recipientEmail);
  const key = await deriveKey(secret);

  const ciphertext = base64ToBuffer(ciphertextB64);
  const iv = base64ToBuffer(ivB64);

  try {
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: ALGORITHM, iv: new Uint8Array(iv) },
      key,
      ciphertext
    );

    const dec = new TextDecoder();
    return dec.decode(decryptedBuffer);
  } catch (e) {
    throw new Error("Decryption failed. Bad key or corrupted payload.");
  }
}
