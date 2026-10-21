import type { Variants } from 'motion/react';
import { motionTokens } from '../motion/tokens';

// Smooth cubic bezier easing
export const easeOutExpo = motionTokens.ease.gentleOut;

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: motionTokens.distance.entranceOffsetY },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: motionTokens.duration.moderate,
      ease: easeOutExpo,
    },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: 'easeOut',
    },
  },
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

export const staggerSlow: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.14,
      delayChildren: 0.1,
    },
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.55,
      ease: easeOutExpo,
    },
  },
};

export const heroIllustrationVariant: Variants = {
  hidden: { opacity: 0, y: 32, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.85,
      ease: easeOutExpo,
      delay: 0.15,
    },
  },
};

export const floatSubtle: Variants = {
  animate: {
    y: [-3, 3, -3],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};
