import { useState } from "react";
import { motion } from "framer-motion";
import { Radio, Zap } from "lucide-react";

export default function SetupModal({ user, onComplete }) {
  const [handle, setHandle] = useState("Guest");
  const [loading, setLoading] = useState(false);

  const join = async () => {
    if (!handle.trim()) return;
    setLoading(true);

    // Call onComplete and pass back the name and a generated or existing email
    onComplete({
      email: user?.email || `user_${Date.now()}@mesh.local`,
      display_name: handle.trim()
    });

    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm p-4">
      <motion.div
        className="w-full max-w-sm bg-card border border-border rounded-2xl overflow-hidden shadow-2xl"
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
      >
        <div className="p-6">
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5">
            <Radio className="w-6 h-6 text-primary" />
          </div>

          <h2 className="font-mono font-bold text-xl mb-2 text-foreground">
            Join Local Mesh
          </h2>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            Enter a display name to broadcast to nearby devices over Bluetooth and Wi-Fi Direct.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block font-mono text-xs text-muted-foreground mb-1.5 ml-1">
                DISPLAY NAME
              </label>
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="e.g. Echo_Base"
                className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all text-foreground"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && join()}
              />
            </div>

            <button
              onClick={join}
              disabled={!handle.trim() || loading}
              className="w-full bg-primary text-primary-foreground font-mono font-bold text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-background/20 border-t-background rounded-full animate-spin" />
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-current" />
                  CONNECT NODE
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
