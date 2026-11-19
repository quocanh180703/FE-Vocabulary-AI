import { useEffect, useState } from 'react';

/**
 * Animated deep-sage misty library background under the glass UI.
 * Pauses automatically when tab is hidden and disables animation under prefers-reduced-motion.
 */
export function SageScene() {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setPaused(document.hidden || mq.matches);
    sync();
    document.addEventListener('visibilitychange', sync);
    mq.addEventListener('change', sync);
    return () => {
      document.removeEventListener('visibilitychange', sync);
      mq.removeEventListener('change', sync);
    };
  }, []);

  return (
    <div
      className={`scene ${paused ? 'scene-paused' : ''}`}
      aria-hidden="true"
    >
      <div className="scene-depth">
        <div className="arch a" />
        <div className="arch b" />
        <div className="arch c" />
        <div className="mist m1" />
        <div className="mist m2" />
        <div className="mist m3" />
      </div>
    </div>
  );
}

/**
 * Codrops-style split-text staggered page heading (65ms per word, y + opacity).
 */
export function SplitHeading({
  text,
  as = 'h1',
  className = '',
}: {
  text: string;
  as?: 'h1' | 'h2';
  className?: string;
}) {
  const words = text.trim().split(/\s+/);
  const Tag = as;
  return (
    <Tag className={`split-heading ${className}`.trim()}>
      {words.map((word, idx) => (
        <span
          key={`${word}-${idx}`}
          className="word-rise"
          style={{ '--word-i': idx } as React.CSSProperties}
        >
          {word}
          {idx < words.length - 1 ? '\u00A0' : ''}
        </span>
      ))}
    </Tag>
  );
}

/**
 * Animated SVG circular score ring with clean sage progress arc.
 */
export function ScoreRing({
  value,
  max = 100,
  label,
  size = 76,
  accentColor,
  onDark = false,
}: {
  value: number;
  max?: number;
  label?: string;
  size?: number;
  accentColor?: string;
  onDark?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(id);
  }, [value]);

  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  const r = 34;
  const circumference = 2 * Math.PI * r; // 213.63
  const offset = mounted ? circumference * (1 - pct / 100) : circumference;

  return (
    <span
      className="score-ring-wrap"
      style={{ width: size, height: size, color: onDark ? 'var(--cream)' : 'var(--ink)' }}
    >
      <svg className="score-ring" viewBox="0 0 88 88" width={size} height={size} aria-hidden="true">
        <circle
          cx="44"
          cy="44"
          r={r}
          className="ring-track"
          style={onDark ? { stroke: 'rgba(250, 248, 241, 0.22)' } : undefined}
        />
        <circle
          cx="44"
          cy="44"
          r={r}
          className="ring-progress"
          style={{
            strokeDasharray: circumference.toFixed(2),
            strokeDashoffset: offset.toFixed(2),
            stroke: accentColor || 'var(--sage)',
          }}
        />
      </svg>
      <strong className="score-ring-val">{label ?? value}</strong>
    </span>
  );
}
