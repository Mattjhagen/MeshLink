import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Send, Lock, Zap } from "lucide-react";
import { encryptMessage, getConversationId } from "@/components/ui/crypto";
import { registerPlugin } from '@capacitor/core';

const NearbyMeshPlugin = registerPlugin('NearbyMesh');

function HopBadge({ hops }) {
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
      <Zap className="w-2.5 h-2.5" />
      {hops} hop{hops !== 1 ? "s" : ""}
    </span>
  );
}

function MessageBubble({ msg, isMe }) {
  return (
    <motion.div
      className={`flex ${isMe ? "justify-end" : "justify-start"} mb-3`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-1`}>
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${isMe
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-secondary text-foreground rounded-bl-sm border border-border"
            }`}
        >
          {msg.decrypted ?? (
            <span className="text-muted-foreground italic text-xs">Decrypting…</span>
          )}
        </div>
        <div className="flex items-center gap-2 px-1">
          <Lock className="w-2.5 h-2.5 text-primary opacity-60" />
          <span className="text-[10px] font-mono text-muted-foreground">
            {new Date(msg.created_date).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {!isMe && msg.hops > 1 && <HopBadge hops={msg.hops} />}
        </div>
      </div>
    </motion.div>
  );
}

export default function ChatPanel({ peerNode, myUser }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef(null);

  const conversationId = getConversationId(myUser.email, peerNode.user_email);

  useEffect(() => {
    // Listen for incoming native mesh packets
    const sub = NearbyMeshPlugin.addListener('onMessageReceived', async (msg) => {
      if (msg.conversation_id === conversationId) {

        // Use local crypto UI to decrypt
        import('@/components/ui/crypto').then(async ({ decryptMessage }) => {
          try {
            const text = await decryptMessage(msg.encrypted_content, msg.iv, msg.sender_email, msg.recipient_email);

            setMessages(prev => [...prev, {
              id: msg.id,
              sender_email: msg.sender_email,
              decrypted: text,
              created_date: new Date().toISOString(),
              hops: 1 // hardcoded for demo UI
            }]);
          } catch (e) { console.error("Decryption failed", e); }
        })
      }
    });

    return () => { sub.then(s => s.remove()); };
  }, [conversationId, myUser.email, peerNode.user_email]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const plain = inputText;
    setInputText("");

    // Optimistic UI
    const tempId = Date.now().toString();
    setMessages(prev => [...prev, {
      id: tempId,
      sender_email: myUser.email,
      decrypted: plain,
      created_date: new Date().toISOString()
    }]);

    try {
      const { ciphertext, iv } = await encryptMessage(plain, myUser.email, peerNode.user_email);

      // Send natively via Capacitor Plugin
      await NearbyMeshPlugin.sendMessage({
        sender_email: myUser.email,
        recipient_email: peerNode.user_email,
        encrypted_content: ciphertext,
        iv: iv,
        conversation_id: conversationId
      });

    } catch (err) {
      console.error("Failed to send message", err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background relative">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-50">
            <Lock className="w-12 h-12 text-muted-foreground" />
            <div>
              <p className="font-mono text-sm text-foreground">End-to-End Encrypted</p>
              <p className="text-xs text-muted-foreground mt-1">
                Messages to {peerNode.display_name} are secured natively via AES.
              </p>
            </div>
          </div>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} msg={m} isMe={m.sender_email === myUser.email} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 bg-background/80 backdrop-blur-xl border-t border-border shrink-0">
        <form onSubmit={handleSend} className="relative flex items-center">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Message ${peerNode.display_name}…`}
            className="w-full bg-secondary/50 border border-border rounded-full pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all text-foreground placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="absolute right-1.5 w-9 h-9 flex items-center justify-center bg-primary text-primary-foreground rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-all"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
