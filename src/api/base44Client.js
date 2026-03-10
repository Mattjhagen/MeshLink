{
  "name": "Message",
  "type": "object",
  "properties": {
    "conversation_id": {
      "type": "string",
      "description": "Unique ID for the conversation thread"
    },
    "sender_email": {
      "type": "string",
      "description": "Email of the sender"
    },
    "recipient_email": {
      "type": "string",
      "description": "Email of the recipient"
    },
    "encrypted_content": {
      "type": "string",
      "description": "AES-encrypted message content (base64)"
    },
    "iv": {
      "type": "string",
      "description": "Initialization vector for AES decryption (base64)"
    },
    "hops": {
      "type": "number",
      "description": "Number of mesh hops the message traveled",
      "default": 1
    },
    "read": {
      "type": "boolean",
      "default": false
    }
  },
  "required": [
    "conversation_id",
    "sender_email",
    "recipient_email",
    "encrypted_content",
    "iv"
  ]
}
