'use client';

import { useEffect, useRef, useCallback } from 'react';

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
}

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<Node[]>([]);
  const animationRef = useRef<number>(0);
  const mouseRef = useRef({ x: -1000, y: -1000 });

  const initNodes = useCallback((width: number, height: number) => {
    const count = Math.min(Math.floor((width * height) / 15000), 80);
    const colors = [
      'oklch(0.65 0.2 280 / 40%)',
      'oklch(0.65 0.18 190 / 35%)',
      'oklch(0.6 0.15 160 / 30%)',
      'oklch(0.7 0.15 330 / 25%)',
    ];
    const nodes: Node[] = [];
    for (let i = 0; i < count; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 2.5 + 1,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
    return nodes;
  }, []);

  const draw = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, nodes: Node[]) => {
    ctx.clearRect(0, 0, width, height);
    const connectionDistance = 150;
    const mouseInfluence = 200;

    // Update positions - create new array to avoid mutating ref directly in hook
    const updatedNodes = nodes.map(node => {
      let { x, y, vx, vy } = node;
      x += vx;
      y += vy;

      // Bounce off edges
      if (x < 0 || x > width) vx *= -1;
      if (y < 0 || y > height) vy *= -1;

      // Mouse repulsion
      const dx = x - mouseRef.current.x;
      const dy = y - mouseRef.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < mouseInfluence && dist > 0) {
        const force = (mouseInfluence - dist) / mouseInfluence;
        vx += (dx / dist) * force * 0.02;
        vy += (dy / dist) * force * 0.02;
      }

      // Dampen velocity
      vx *= 0.999;
      vy *= 0.999;

      // Keep within bounds
      x = Math.max(0, Math.min(width, x));
      y = Math.max(0, Math.min(height, y));

      return { ...node, x, y, vx, vy };
    });

    // Store updated positions back
    nodesRef.current = updatedNodes;

    // Draw connections
    for (let i = 0; i < updatedNodes.length; i++) {
      for (let j = i + 1; j < updatedNodes.length; j++) {
        const dx = updatedNodes[i].x - updatedNodes[j].x;
        const dy = updatedNodes[i].y - updatedNodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < connectionDistance) {
          const opacity = (1 - dist / connectionDistance) * 0.15;
          ctx.beginPath();
          ctx.moveTo(updatedNodes[i].x, updatedNodes[i].y);
          ctx.lineTo(updatedNodes[j].x, updatedNodes[j].y);
          ctx.strokeStyle = `oklch(0.65 0.2 280 / ${opacity})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    // Draw nodes
    for (const node of updatedNodes) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      ctx.fillStyle = node.color;
      ctx.fill();
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (nodesRef.current.length === 0) {
        nodesRef.current = initNodes(canvas.width, canvas.height);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!prefersReducedMotion) {
      const animate = () => {
        draw(ctx, canvas.width, canvas.height, nodesRef.current);
        animationRef.current = requestAnimationFrame(animate);
      };
      animate();
    } else {
      draw(ctx, canvas.width, canvas.height, nodesRef.current);
    }

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [initNodes, draw]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      aria-hidden="true"
    />
  );
}
