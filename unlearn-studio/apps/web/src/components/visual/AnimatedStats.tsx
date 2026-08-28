"use client";

import { useEffect, useRef, useState } from "react";

const STATS = [
  { value: 3500, suffix: "+", label: "Models unlearned", sublabel: "across research labs and companies" },
  { value: 47, suffix: "%", label: "Avg compute reduction", sublabel: "without accuracy loss" },
  { value: 2.1, suffix: "M", label: "GPU hours saved", sublabel: "equivalent to $6.3M in compute" },
  { value: 99.2, suffix: "%", label: "Avg accuracy retained", sublabel: "after selective unlearning" },
  { value: 180, suffix: "+", label: "Supported models", sublabel: "HuggingFace compatible" },
  { value: 12, suffix: "K", label: "Developers", sublabel: "using Remap Studios" },
];

function useCountUp(target: number, duration: number, shouldStart: boolean) {
  const [value, setValue] = useState(0);
  const startTime = useRef<number | null>(null);

  useEffect(() => {
    if (!shouldStart) return;

    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp;
      const elapsed = timestamp - startTime.current;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(eased * target);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [shouldStart, target, duration]);

  return value;
}

function StatCard({ stat, index }: { stat: (typeof STATS)[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const val = useCountUp(stat.value, 2000 + index * 200, visible);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const display = stat.value >= 100
    ? Math.round(val).toLocaleString()
    : val.toFixed(1);

  return (
    <div ref={ref} className="p-6 border-b md:border-b-0 md:border-r border-border last:border-r-0 text-center">
      <p className="font-display text-4xl md:text-5xl font-bold tracking-tight">
        {display}<span className="text-text-muted">{stat.suffix}</span>
      </p>
      <p className="font-display font-semibold text-sm mt-2">{stat.label}</p>
      <p className="body-sm mt-1">{stat.sublabel}</p>
    </div>
  );
}

export default function AnimatedStats() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-0 border border-border">
      {STATS.map((stat, i) => (
        <StatCard key={stat.label} stat={stat} index={i} />
      ))}
    </div>
  );
}
