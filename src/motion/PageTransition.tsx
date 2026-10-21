import { type ReactNode, forwardRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { pageVariants } from './variants';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const PageTransition = forwardRef<HTMLDivElement, PageTransitionProps>(
  ({ children, className, style }, ref) => {
    const shouldReduceMotion = useReducedMotion();

    if (shouldReduceMotion) {
      return (
        <div ref={ref} className={className} style={style}>
          {children}
        </div>
      );
    }

    return (
      <motion.div
        ref={ref}
        className={className}
        style={style}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageVariants}
      >
        {children}
      </motion.div>
    );
  }
);

PageTransition.displayName = 'PageTransition';
