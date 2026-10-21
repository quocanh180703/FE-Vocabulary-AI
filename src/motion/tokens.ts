/**
 * VocabAI Motion Design System - Design Tokens
 * 
 * Chuẩn hóa các thông số chuyển động theo phong cách Soft & Premium SaaS:
 * - Thời lượng ngắn, tránh độ trễ thao tác
 * - Easing tự nhiên (ease-out cubic bezier mượt mà)
 * - Khoảng cách dịch chuyển vi mô (micro-distance 6-12px)
 * - Tương thích hoàn toàn với prefers-reduced-motion
 */

export const motionTokens = {
  // 1. Duration (Thời lượng tính theo giây cho motion/react)
  duration: {
    instant: 0,
    fast: 0.15,      // 150ms: micro-interactions, nút bấm, hover, tooltip
    normal: 0.22,    // 220ms: dropdown, accordion, card hover, tab switch
    moderate: 0.3,   // 300ms: page transition, modal entrance, sidebar slide
    deliberate: 0.45,// 450ms: 3D flip card, hero illustration
  },

  // 2. Easing Curves (Cubic Bezier mượt mà, tự nhiên)
  ease: {
    // Easing mượt mà, giảm tốc êm ái cho entrance và transitions
    gentleOut: [0.16, 1, 0.3, 1] as const,
    // Easing cân bằng, sang trọng cho card hover và micro-interactions
    premium: [0.25, 1, 0.5, 1] as const,
    // Easing cho các chuyển động vào/ra thông thường
    standard: [0.4, 0, 0.2, 1] as const,
    // Spring mềm cho cảm giác nảy nhẹ mà không bị rung lắc
    softSpring: { type: 'spring', damping: 25, stiffness: 280 } as const,
    cardSpring: { type: 'spring', damping: 22, stiffness: 220 } as const,
  },

  // 3. Distance & Offsets (Khoảng cách dịch chuyển vi mô)
  distance: {
    hoverElevation: -3, // nâng nhẹ 3px khi hover card/button
    hoverScale: 1.015,  // scale nhẹ 1.5%
    tapScale: 0.98,     // ấn xuống 2% khi tap/click
    pageOffsetY: 8,     // chuyển trang trượt nhẹ 8px
    entranceOffsetY: 12,// nội dung trượt lên 12px
    staggerDelay: 0.05, // độ trễ xuất hiện giữa các item liên tiếp (50ms)
  },
} as const;
