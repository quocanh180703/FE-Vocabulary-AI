import React from 'react';
import { VI_MASCOT_POSES, type ViPoseId } from '../constants/mascot';
import { BlurUpImage } from './states/BlurUpImage';

interface ViMascotImageProps {
  pose: ViPoseId;
  /** Width in CSS px; height automatically preserves 3:4 aspect ratio (384x512). */
  size?: number;
  width?: number;
  height?: number;
  alt?: string;
  /** Only applies to 'celebrate' and 'listen' micro-moments; disabled under reduced motion / hidden tab. */
  animated?: boolean;
  /** Use clean transparent-background cutout asset so Vi melts directly into the scene. */
  transparent?: boolean;
  priority?: boolean;
  framed?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function ViMascotImage({
  pose,
  size = 84,
  width,
  height,
  alt,
  transparent = true,
  priority = false,
  className = '',
  style,
}: ViMascotImageProps) {
  const asset = VI_MASCOT_POSES[pose];
  const w = width ?? size;
  const h = height ?? Math.round((w * asset.height) / asset.width);
  const src = asset.transparentFile || asset.file;

  return (
    <BlurUpImage
      src={src}
      alt={alt || asset.alt}
      width={w}
      height={h}
      priority={priority}
      transparent={transparent}
      borderRadius={0}
      className={`vi-mascot-img ${className}`.trim()}
      style={{
        filter: 'drop-shadow(0 8px 18px rgba(10, 28, 18, 0.26))',
        ...style,
      }}
    />
  );
}
