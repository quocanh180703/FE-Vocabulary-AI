/**
 * VocabAI Motion Design System - UI Motion Laws Tokens
 *
 * - Easing chuẩn: cubic-bezier(0.23, 1, 0.32, 1)
 * - Press scale: 0.965
 * - Stagger: 65ms
 * - Exit ≈ 75% của Enter
 * - Tôn trọng prefers-reduced-motion
 */

export const motionTokens = {
  duration: {
    instant: 0,
    fast: 0.16,      // ~165ms (~75% of normal)
    normal: 0.22,    // 220ms: micro-interactions, tab switch
    moderate: 0.46,  // 465ms (~75% of 620ms)
    deliberate: 0.62,// 620ms: enter transitions, card reveal
  },
  ease: {
    gentleOut: [0.23, 1, 0.32, 1] as const,
    premium: [0.23, 1, 0.32, 1] as const,
    standard: [0.23, 1, 0.32, 1] as const,
    softSpring: { type: 'spring', damping: 26, stiffness: 280 } as const,
    cardSpring: { type: 'spring', damping: 24, stiffness: 240 } as const,
  },
  distance: {
    hoverElevation: -3,
    hoverScale: 1.01,
    tapScale: 0.965,
    pageOffsetY: 12,
    entranceOffsetY: 16,
    staggerDelay: 0.065,
  },
} as const;
