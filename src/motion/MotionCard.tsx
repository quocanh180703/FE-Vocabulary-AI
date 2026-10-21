import { type ReactNode, forwardRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { motionTokens } from './tokens';

interface MotionCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  interactive?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
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
          {...props}
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
          transition: {
            duration: motionTokens.duration.normal,
            ease: motionTokens.ease.premium,
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
