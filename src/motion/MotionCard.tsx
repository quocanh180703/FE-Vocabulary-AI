import { type ReactNode, forwardRef } from 'react';
import { motion, useReducedMotion, type HTMLMotionProps } from 'motion/react';
import { motionTokens } from './tokens';

export interface MotionCardProps extends HTMLMotionProps<'div'> {
  children?: ReactNode;
  interactive?: boolean;
}

export const MotionCard = forwardRef<HTMLDivElement, MotionCardProps>(
  ({ children, interactive = true, className = '', style, onClick, ...props }, ref) => {
    const shouldReduce = useReducedMotion();

    if (shouldReduce || !interactive) {
      return (
        <div
          ref={ref}
          className={`card ${className}`}
          style={style}
          onClick={onClick}
          {...(props as any)}
        >
          {children}
        </div>
      );
    }

    return (
      <motion.div
        ref={ref}
        className={`card ${className}`}
        style={style}
        onClick={onClick}
        whileHover={{
          y: motionTokens.distance.hoverElevation,
          scale: motionTokens.distance.hoverScale,
          transition: {
            duration: motionTokens.duration.fast,
            ease: motionTokens.ease.gentleOut,
          },
        }}
        whileTap={{
          scale: motionTokens.distance.tapScale,
          transition: { duration: motionTokens.duration.fast },
        }}
        {...(props as any)}
      >
        {children}
      </motion.div>
    );
  }
);

MotionCard.displayName = 'MotionCard';
