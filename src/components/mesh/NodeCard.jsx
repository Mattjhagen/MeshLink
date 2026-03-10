import { motion } from "framer-motion";
import { Radio, Battery, Signal, MessageSquare } from "lucide-react";

export default function NodeCard({ node, isSelected, onClick }) {
  const isActive =
    node.last_seen &&
    Date.now() - new Date(node.last_seen).getTime() < 5 * 60 * 1000;

  const signalBars = Math.ceil((node.signal_strength ?? 70) / 25);

  return (
    <motion.button
      className={`w-full text-left p-3 rounded-xl border transition-all ${
        isSelected
          ? "border-primary bg-primary/10"
          : "border-border bg-card hover:border-primary/40 hover:bg-secondary/50"
      }`}
      onClick={onClick}
      whileHover={{ x: 2 }}
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="relative">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center font-mono text-sm font-bold ${
              isActive ? "bg-accent/20 text-accent" : "bg-muted text-muted-foreground"
            }`}
          >
            {node.display_name?.slice(0, 2).toUpperCase() ?? "??"}
          </div>
          <div
            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-background ${
              isActive ? "bg-primary" : "bg-muted-foreground"
            }`}
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="font-mono text-sm font-semibold text-foreground truncate">
 
