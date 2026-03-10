import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

function getNodeColor(isMe, isActive) {
  if (isMe) return "#00f5ff";
  if (isActive) return "#a855f7";
  return "#334155";
}

export default function MeshMap({ nodes, myEmail, onSelectNode, selectedNodeEmail }) {
  const canvasRef = useRef(null);

  // Auto assign random coordinates for newly discovered native nodes just for visual effect
  const activeNodes = nodes.map(n => ({
    ...n,
    node_x: n.node_x || Math.floor(Math.random() * 80) + 10,
    node_y: n.node_y || Math.floor(Math.random() * 80) + 10
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    // Draw connections
    activeNodes.forEach((a, i) => {
      activeNodes.slice(i + 1).forEach((b) => {
        const ax = (a.node_x / 100) * W;
        const ay = (a.node_y / 100) * H;
        const bx = (b.node_x / 100) * W;
        const by = (b.node_y / 100) * H;
        const dist = Math.hypot(ax - bx, ay - by);
        if (dist < W * 0.45) {
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
          ctx.strokeStyle = `rgba(0, 245, 255, ${Math.max(0, 0.15 - dist / (W * 4))})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });
    });
  }, [activeNodes]);

  return (
    <div className="absolute inset-0">
      <canvas
        ref={canvasRef}
        width={300}
        height={300}
        className="absolute inset-0 w-full h-full opacity-50 pointer-events-none"
      />
      {activeNodes.map((n) => {
        const isMe = n.user_email === myEmail;
        const isSelected = n.user_email === selectedNodeEmail;
        const isActive = true; // offline nodes

        return (
          <motion.div
            key={n.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer"
            style={{ left: `${n.node_x}%`, top: `${n.node_y}%` }}
            onClick={() => !isMe && onSelectNode(n)}
            whileHover={{ scale: 1.2 }}
            animate={{
              scale: isSelected ? 1.3 : 1,
              zIndex: isSelected ? 10 : 1,
            }}
          >
            <div
              className={`w-4 h-4 rounded-full border-2 border-background flex items-center justify-center transition-colors ${isSelected ? "ring-4 ring-primary/30" : ""
                }`}
              style={{ backgroundColor: getNodeColor(isMe, isActive) }}
            >
              {isMe && <div className="w-1.5 h-1.5 bg-background rounded-full" />}
            </div>

            {/* Tooltip */}
            <div className={`absolute top-full mt-1 left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none transition-opacity ${isSelected || isMe ? 'opacity-100' : 'opacity-0'}`}>
              <div className="bg-background/90 backdrop-blur border border-border px-2 py-0.5 rounded text-[9px] font-mono text-foreground font-bold">
                {isMe ? "YOU" : n.display_name}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
