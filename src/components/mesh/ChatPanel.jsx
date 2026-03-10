import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Lock, Radio, X, Zap } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { encryptMessage, decryptMessage, getConversationId } from "@/components/crypto";

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
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
            isMe
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
 
