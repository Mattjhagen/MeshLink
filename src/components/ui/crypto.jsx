// Client-side AES-GCM encryption using Web Crypto API
// Keys are derived from a shared secret based on conversation ID
// Nothing is ever sent in plaintext

const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;

async function deriveKey(secret) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
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

function getConversationSecret(emailA, emailB) {
  const sorted = [emailA, emailB].sort().join("|");
  return `meshnet:${sorted}`;
}

export async function encryptMessage(plaintext, senderEmail, recipientEmail) {
  const secret = getConversationSecret(senderEmail, recipientEmail);
  const key = await deriveKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();

 
