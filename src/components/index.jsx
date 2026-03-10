import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Radio, Users, Lock, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import NodeCard from "@/components/mesh/NodeCard";
import ChatPanel from "@/components/mesh/ChatPanel";
import SetupModal from "@/components/mesh/SetupModal";
import { decryptMessage } from "@/components/ui/crypto";
import { registerPlugin } from '@capacitor/core';

let NearbyMeshPlugin = null;
try {
  NearbyMeshPlugin = registerPlugin('NearbyMesh');
} catch {
  console.warn("Capacitor Native plugins are not available in this environment. Falling back to web MVP mode.");
}

export default function Home() {
  const [user, setUser] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [showSetup, setShowSetup] = useState(true);
  const [loading, setLoading] = useState(false);
  const userRef = useRef(null);

  // When plugin emits a discovered node
  useEffect(() => {
    const nodeFoundSub = NearbyMeshPlugin.addListener('onNodeDiscovered', (node) => {
      setNodes(prev => {
        // Quick deduplication based on email
        if (prev.find(n => n.user_email === node.email)) return prev;
        return [...prev, {
          id: node.endpointId,
          user_email: node.email,
          display_name: node.name,
          last_seen: new Date().toISOString()
        }];
      });
      toast.success(`Discovered ${node.name || node.email}`);
    });

    const nodeLostSub = NearbyMeshPlugin.addListener('onNodeLost', (node) => {
      setNodes(prev => prev.filter(n => n.id !== node.endpointId));
    });

    return () => {
      nodeFoundSub.then(sub => sub.remove());
      nodeLostSub.then(sub => sub.remove());
    };
  }, []);

  const handleSetupComplete = async (setupUser) => {
    setUser({ email: setupUser.email, display_name: setupUser.display_name });
    setShowSetup(false);
    setLoading(true);

    // Initialize native plugin with setup data
    try {
      await NearbyMeshPlugin.initializeNode({
        email: setupUser.email,
        displayName: setupUser.display_name
      });

      // Start offline mesh
      await NearbyMeshPlugin.startMesh();
      setLoading(false);
    } catch (err) {
      console.error("Native plugin err", err);
      setLoading(false);
    }
  };

  useEffect(() => { userRef.current = user; }, [user]);

  // Handle incoming messages for toast alerts
  useEffect(() => {
    const msgSub = NearbyMeshPlugin.addListener('onMessageReceived', async (msg) => {
      const me = userRef.current;
      if (!me || msg.recipient_email !== me.email) return; // Not for me

      let preview = "New encrypted offline message";
      try {
        const plaintext = await decryptMessage(msg.encrypted_content, msg.iv, msg.sender_email, msg.recipient_email);
        preview = plaintext.length > 60 ? plaintext.slice(0, 60) + "…" : plaintext;
      } catch (e) { console.error("Toast descrypt error", e) }

      const senderName = msg.sender_email.split("@")[0]; // Simple fallback

      toast(senderName, {
        description: preview,
        icon: <MessageSquare className="w-4 h-4 text-primary" />,
        duration: 4000,
        className: "font-mono border-primary/50",
      });
    });

    return () => { msgSub.then(m => m.remove()); }
  }, []);

  if (showSetup) {
    // Generate a dummy 'user' to bypass the auth requirement of SetupModal
    return <SetupModal user={{ id: "native", email: "guest@mesh.local" }} onComplete={handleSetupComplete} />;
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        >
          <motion.div
            className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center"
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Radio className="w-7 h-7 text-primary" />
          </motion.div>
          <p className="font-mono text-sm text-muted-foreground tracking-widest">
            STARTING OFFLINE MESH…
          </p>
        </motion.div>
      </div>
    );
  }

  const activeCount = nodes.length;

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
            <Radio className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="font-mono font-bold text-sm tracking-wider">
              MESH<span className="text-primary">NET</span> (Offline)
            </h1>
            <p className="text-[10px] font-mono text-muted-foreground">
              {user?.display_name ?? "connected"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="font-mono text-[10px] text-primary">
              {activeCount} CONNECTED
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary border border-border">
            <Lock className="w-3 h-3 text-primary" />
            <span className="font-mono text-[10px] text-muted-foreground">AES-256</span>
          </div>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Node list */}
        <div className="w-64 border-r border-border flex flex-col shrink-0 overflow-hidden">
          {/* Mesh map placeholder */}
          <div className="h-48 border-b border-border relative bg-muted/30 flex flex-col items-center justify-center shrink-0">
            <Radio className="w-10 h-10 text-primary opacity-30 mb-2" />
            <span className="text-xs text-muted-foreground font-mono opacity-50">Local Scanning Enabled</span>
          </div>

          {/* Node list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <p className="font-mono text-[10px] text-muted-foreground tracking-widest px-1 mb-3">
              NEARBY NODES ({nodes.length})
            </p>
            {nodes.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                <p className="text-xs text-muted-foreground font-mono">No nodes detected</p>
                <p className="text-[10px] text-muted-foreground mt-1 text-balance">Turn on Bluetooth and Wi-Fi</p>
              </div>
            ) : (
              nodes.map((node) => (
                <NodeCard
                  key={node.id}
                  node={node}
                  isSelected={selectedNode?.user_email === node.user_email}
                  onClick={() => setSelectedNode(node)}
                />
              ))
            )}
          </div>
        </div>

        {/* Right: Chat or Welcome */}
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {selectedNode ? (
              <motion.div
                key={selectedNode.user_email}
                className="h-full"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <ChatPanel
                  peerNode={selectedNode}
                  myUser={user}
                  onClose={() => setSelectedNode(null)}
                />
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                className="h-full flex items-center justify-center"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              >
                <div className="text-center max-w-xs px-6">
                  <motion.div
                    className="w-20 h-20 rounded-2xl bg-primary/5 border border-primary/20 flex items-center justify-center mx-auto mb-5"
                  >
                    <Radio className="w-8 h-8 text-primary opacity-60" />
                  </motion.div>
                  <h2 className="font-mono font-bold text-base text-foreground mb-2">
                    Native P2P Active
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Local mesh network is scanning. Select a node to start a directly encrypted chat.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
