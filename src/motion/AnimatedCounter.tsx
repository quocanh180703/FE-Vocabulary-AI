import { useEffect, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { motionTokens } from './tokens';

export interface AnimatedCounterProps {
  value: number;
  duration?: number; // duration in seconds
  formatter?: (val: number) => string;
  prefix?: string;
  suffix?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * AnimatedCounter component
 * Counts up smoothly from 0 to target value using gentleOut cubic-bezier.
 * Respects prefers-reduced-motion.
 */
export function AnimatedCounter({
  value,
  duration = motionTokens.duration.deliberate + 0.15, // ~600ms for smooth count
  formatter,
  prefix = '',
  suffix = '',
  className,
  style,
}: AnimatedCounterProps) {
  const shouldReduce = useReducedMotion();
  const [displayValue, setDisplayValue] = useState<number>(shouldReduce ? value : 0);

  useEffect(() => {
    if (shouldReduce) {
      setDisplayValue(value);
      return;
    }

    const start = 0;
    const end = value;
    if (start === end) {
      setDisplayValue(end);
      return;
    }

    const durationMs = Math.max(150, duration * 1000);
    const startTime = performance.now();

    // Gentle cubic ease-out curve
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    let animationFrameId: number;

    const updateCount = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      const easedProgress = easeOutCubic(progress);

      const current = Math.round(start + (end - start) * easedProgress);
      setDisplayValue(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(updateCount);
      } else {
        setDisplayValue(end);
      }
    };

    animationFrameId = requestAnimationFrame(updateCount);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [value, duration, shouldReduce]);

  const formatted = formatter ? formatter(displayValue) : displayValue.toLocaleString('vi-VN');

  return (
    <span className={className} style={{ color: 'inherit', ...style }}>
      {prefix}{formatted}{suffix}
    </span>
  );
}
