"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

export function FloatingParticles({
  containerRef,
  count = 10,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  count?: number;
}) {
  const [mounted, setMounted] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const particles = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        initialX: Math.random(),
        initialY: Math.random(),
        targetX: Math.random(),
        targetY: Math.random(),
        duration: Math.random() * 10 + 10,
      })),
    [count],
  );

  useEffect(() => {
    setMounted(true);
    const element = containerRef.current;
    if (!element) return;

    const updateDimensions = () => {
      const { width, height } = element.getBoundingClientRect();
      setDimensions({ width, height });
    };

    updateDimensions();

    const observer = new ResizeObserver(updateDimensions);
    observer.observe(element);
    return () => observer.disconnect();
  }, [containerRef]);

  if (!mounted || dimensions.width === 0 || dimensions.height === 0) return null;

  const { width, height } = dimensions;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-primary/20 rounded-full"
          initial={{
            x: particle.initialX * width,
            y: particle.initialY * height,
          }}
          animate={{
            x: [null, particle.targetX * width],
            y: [null, particle.targetY * height],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
