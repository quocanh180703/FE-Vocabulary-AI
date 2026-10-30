import { motion, useReducedMotion } from 'motion/react';
import { motionTokens } from './tokens';

export interface AnimatedProgressBarProps {
  progress?: number; // 0 to 100
  value?: number; // alias for progress
  color?: string; // custom fill color
  height?: number | string; // track height
  className?: string;
  barClassName?: string;
  style?: React.CSSProperties;
  barStyle?: React.CSSProperties;
}

/**
 * AnimatedProgressBar component
 * Animates using transform (scaleX) with transformOrigin: 'left' for maximum 60fps performance.
 * Respects prefers-reduced-motion.
 */
export function AnimatedProgressBar({
  progress,
  value,
  color,
  height,
  className = '',
  barClassName = '',
  style,
  barStyle,
}: AnimatedProgressBarProps) {
  const shouldReduce = useReducedMotion();
  const actualProgress = progress ?? value ?? 0;
  const clampedProgress = Math.min(100, Math.max(0, actualProgress));

  const trackStyle: React.CSSProperties = {
    overflow: 'hidden',
    ...(height != null ? { height } : {}),
    ...style,
  };

  const fillStyle: React.CSSProperties = {
    ...(color ? { background: color } : {}),
    ...barStyle,
  };

  if (shouldReduce) {
    return (
      <div className={`progress-track ${className}`} style={trackStyle}>
        <div
          className={`progress-fill ${barClassName}`}
          style={{ width: `${clampedProgress}%`, ...fillStyle }}
        />
      </div>
    );
  }

  return (
    <div className={`progress-track ${className}`} style={trackStyle}>
      <motion.div
        className={`progress-fill ${barClassName}`}
        style={{
          width: '100%',
          height: '100%',
          transformOrigin: 'left center',
          ...fillStyle,
        }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: clampedProgress / 100 }}
        transition={{
          duration: motionTokens.duration.deliberate,
          ease: motionTokens.ease.gentleOut,
        }}
      />
    </div>
  );
}
