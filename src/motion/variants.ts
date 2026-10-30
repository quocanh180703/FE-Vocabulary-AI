import type { Variants } from 'motion/react';
import { motionTokens } from './tokens';

/**
 * 1. Page Transition Variants
 * Chuyển cảnh mềm mại khi điều hướng route: fade-in + translateY 8px
 */
export const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: motionTokens.distance.pageOffsetY,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: motionTokens.duration.moderate,
      ease: motionTokens.ease.gentleOut,
    },
  },
  exit: {
    opacity: 0,
    y: -motionTokens.distance.pageOffsetY * 0.75,
    transition: {
      duration: motionTokens.duration.fast,
      ease: motionTokens.ease.standard,
    },
  },
};

/**
 * 2. Staggered Container & Child Items
 * Cho lưới thẻ KPI, danh sách từ vựng, danh sách câu hỏi
 */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: motionTokens.distance.staggerDelay,
      delayChildren: 0.02,
    },
  },
};

export const staggerItem: Variants = {
  hidden: {
    opacity: 0,
    y: motionTokens.distance.entranceOffsetY,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: motionTokens.duration.normal,
      ease: motionTokens.ease.gentleOut,
    },
  },
};

/**
 * 3. Modal / Dialog Scale & Fade
 */
export const modalVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.96,
    y: 10,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: motionTokens.duration.normal,
      ease: motionTokens.ease.gentleOut,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 6,
    transition: {
      duration: motionTokens.duration.fast,
      ease: motionTokens.ease.standard,
    },
  },
};

export const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: motionTokens.duration.fast },
  },
  exit: {
    opacity: 0,
    transition: { duration: motionTokens.duration.fast },
  },
};

/**
 * 4. Micro-interactions cho Cards & Buttons & Chips (Nguyên tắc 5)
 */
export const buttonTapProps = {
  whileHover: {
    y: motionTokens.distance.hoverElevation,
    scale: motionTokens.distance.hoverScale,
  },
  whileTap: {
    scale: motionTokens.distance.tapScale,
  },
  transition: {
    duration: motionTokens.duration.fast,
    ease: motionTokens.ease.gentleOut,
  },
};

export const cardHoverTransition = {
  duration: motionTokens.duration.fast,
  ease: motionTokens.ease.gentleOut,
};

/**
 * 5. Tin nhắn AI Tutor (Chat)
 */
export const messageBubbleVariant: Variants = {
  hidden: {
    opacity: 0,
    y: 8,
    scale: 0.98,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: motionTokens.duration.normal,
      ease: motionTokens.ease.gentleOut,
    },
  },
};

/**
 * 6. Breathing Mascot Animation (Nhẹ nhàng, không gây phân tâm)
 */
export const mascotFloatVariant: Variants = {
  animate: {
    y: [-2, 2, -2],
    transition: {
      duration: 3.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};
