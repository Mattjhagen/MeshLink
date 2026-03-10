import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

function getNodeColor(isMe, isActive) {
  if (isMe) return "#00f5ff";
  if (isActive) return "#a855f7";
  return "#334155";
}

export default function MeshMap({ nodes, myEmail, onSelectNode, selectedNodeEmail }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    // Draw connections
    nodes.forEach((a, i) => {
      nodes.slice(i + 1).forEach((b) => {
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
  }, [nodes]);

 
