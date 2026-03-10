import { useState } from "react";
import { motion } from "framer-motion";
import { Radio, Shield, Zap } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function SetupModal({ user, onComplete }) {
  const [handle, setHandle] = useState(user.full_name ?? "");
  const [loading, setLoading] = useState(false);

  const join = async () => {
    if (!handle.trim()) return;
    setLoading(true);

    const publicKey = btoa(
      JSON.stringify({ email: user.email, ts: Date.now() })
    );

    const existing = await base44.entities.MeshNode.filter({ user_email: user.email });

    const nodeData = {
      user_email: user.email,
      display_name: handle.trim(),
      public_key: publicKey,
      last_seen: new Date().toISOString(),
      signal_strength: Math.floor(Math.random() * 20) + 75,
      battery: Math.floor(Math.random() * 30) + 65,
      node_x: Math.floor(Math.random() * 70) + 15,
      node_y: Math.floor(Math.random() * 70) + 15,
    };

    if (existing.length > 0) {
      await base44.entities.MeshNode.update(existing[0].id, nodeData);
    } else {
      await base44.entities.MeshNode.create(nodeData);
    }

    onComplete();
    setLoading(false);
  };

  return (
 
