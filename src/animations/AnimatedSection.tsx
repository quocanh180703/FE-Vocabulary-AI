import { type ReactNode, forwardRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';

interface AnimatedSectionProps {
  id?: string;
  className?: string;
  children: ReactNode;
  delay?: number;
  threshold?: number;
}

export const AnimatedSection = forwardRef<HTMLElement, AnimatedSectionProps>(
  ({ id, className, children, delay = 0, threshold = 0.12 }, ref) => {
    const shouldReduceMotion = useReducedMotion();

    if (shouldReduceMotion) {
      return (
        <section id={id} className={className} ref={ref}>
          {children}
        </section>
      );
    }

    return (
      <motion.section
        id={id}
        ref={ref}
        className={className}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: threshold }}
        variants={{
          hidden: { opacity: 0, y: 28 },
          visible: {
            opacity: 1,
            y: 0,
            transition: {
              duration: 0.65,
              delay,
              ease: [0.16, 1, 0.3, 1],
            },
          },
        }}
      >
        {children}
      </motion.section>
    );
  }
);

AnimatedSection.displayName = 'AnimatedSection';
