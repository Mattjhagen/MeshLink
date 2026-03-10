import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { Radio, Shield, Users, Wifi, Lock, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import MeshMap from "@/components/mesh/MeshMap";
import NodeCard from "@/components/mesh/NodeCard";
import ChatPanel from "@/components/mesh/ChatPanel";
import SetupModal from "@/components/mesh/SetupModal";
import { decryptMessage, getConversationId } from "@/components/crypto";

export default function Home() {
  const [user, setUser] = useState(null);
  const [myNode, setMyNode] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [showSetup, setShowSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const userRef = useRef(null);
  const selectedNodeRef = useRef(null);

  const loadData = async () => {
    const me = await base44.auth.me();
    setUser(me);

    const myNodes = await base44.entities.MeshNode.filter({ user_email: me.email });
    if (myNodes.length === 0) {
      setShowSetup(true);
      setLoading(false);
      return;
    }

    const currentNode = myNodes[0];
    // Refresh last_seen
    await base44.entities.MeshNode.update(currentNode.id, {
      last_seen: new Date().toISOString(),
    });
    setMyNode(currentNode);

    const allNodes = await base44.entities.MeshNode.list("-last_seen", 50);
    setNodes(allNodes);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(async () => {
      if (!user) return;
      const all = await base44.entities.MeshNode.list("-last_seen", 50);
      setNodes(all);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleSetupComplete = () => {
    setShowSetup(false);
    loadData();
  };

  // Keep refs in sync so the subscription closure always sees current values
  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { selectedNodeRef.current = selectedNode; }, [selectedNode]);

  // Real-time incoming message notifications
  useEffect(() => {
    const unsub = base44.entities.Message.subscribe(async (event) => {
      if (event.type !== "create") return;
      const msg = event.data;
      const me = userRef.current;
      if (!me || msg.recipient_email !== me.email) return;

      // Don't notify if this conversation is already open
      const activeConvId = selectedNodeRef.current
        ? getConversationId(me.email, selectedNodeRef.current.user_email)
        : null;
      if (msg.conversation_id === activeConvId) return;

      // Decrypt and show toast
      let preview = "New encrypted message";
      try {
        const plaintext = await decryptMessage(msg.encrypted_content, msg.iv, msg.sender_email, msg.recipient_email);
        preview = plaintext.length > 60 ? plaintext.slice(0, 60) + "…" : plaintext;
      } catch (err) { console.debug("preview dec err", err); }

      // Resolve sender display name from loaded nodes
      const senderNode = nodes.find((n) => n.user_email === msg.sender_email);
      const senderName = senderNode?.display_name ?? msg.sender_email.split("@")[0];

      toast(senderName, {
        description: preview,
        icon: <MessageSquare className="w-4 h-4 text-primary" />,
        action: {
          label: "Open",
          onClick: () => {
            if (senderNode) setSelectedNode(senderNode);
          },
        },
        duration: 6000,
        className: "font-mono",
      });
    });
    return unsub;
  }, [nodes]);

  const otherNodes = nodes.filter((n) => n.user_email !== user?.email);
  const activeCount = otherNodes.filter(
    (n) => n.last_seen && Date.now() - new Date(n.last_seen).getTime() < 5 * 60 * 1000
  ).length;

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center"
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Radio className="w-7 h-7 text-primary" />
          </motion.div>
          <p className="font-mono text-sm text-muted-foreground tracking-widest">
            SCANNING MESH…
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {showSetup && user && (
        <SetupModal user={user} onComplete={handleSetupComplete} />
      )}

      {/* Top Bar */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
            <Radio className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="font-mono font-bold text-sm tracking-wider">
              MESH<span className="text-primary">NET</span>
            </h1>
            <p className="text-[10px] font-mono text-muted-foreground">
              {myNode?.display_name ?? "connecting…"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="font-mono text-[10px] text-primary">
              {activeCount} ACTIVE
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary border border-border">
            <Lock className="w-3 h-3 text-primary" />
            <span className="font-mono text-[10px] text-muted-foreground">E2E</span>
          </div>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Node list */}
        <div className="w-64 border-r border-border flex flex-col shrink-0 overflow-hidden">
          {/* Mesh map */}
          <div className="h-48 border-b border-border relative bg-muted/30 overflow-hidden shrink-0">
            {/* Grid overlay */}
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage:
                  "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }}
            />
            <MeshMap
              nodes={nodes}
              myEmail={user?.email}
              onSelectNode={setSelectedNode}
              selectedNodeEmail={selectedNode?.user_email}
            />
          </div>

          {/* Node list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <p className="font-mono text-[10px] text-muted-foreground tracking-widest px-1 mb-3">
              NEARBY NODES ({otherNodes.length})
            </p>
            {otherNodes.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                <p className="text-xs text-muted-foreground font-mono">No nodes detected</p>
                <p className="text-[10px] text-muted-foreground mt-1">Invite others to join</p>
              </div>
            ) : (
              otherNodes.map((node) => (
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
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="text-center max-w-xs px-6">
                  <motion.div
                    className="w-20 h-20 rounded-2xl bg-primary/5 border border-primary/20 flex items-center justify-center mx-auto mb-5"
                    animate={{
                      boxShadow: [
                        "0 0 20px rgba(0,245,255,0.05)",
                        "0 0 40px rgba(0,245,255,0.15)",
                        "0 0 20px rgba(0,245,255,0.05)",
                      ],
                    }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    <Radio className="w-8 h-8 text-primary opacity-60" />
                  </motion.div>
                  <h2 className="font-mono font-bold text-base text-foreground mb-2">
                    Select a node
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Pick a nearby node from the list to start an encrypted mesh conversation.
                  </p>
                  <div className="mt-6 grid grid-cols-3 gap-2 text-center">
                    {[
                      { icon: Shield, label: "AES-256" },
                      { icon: Radio, label: "Mesh" },
                      { icon: Wifi, label: "Multi-hop" },
                    ].map(({ icon: Icon, label }) => (
                      <div key={label} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-secondary/50 border border-border">
                        <Icon className="w-4 h-4 text-primary" />
                        <span className="text-[10px] font-mono text-muted-foreground">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
