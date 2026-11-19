import React, { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '@mantine/hooks';
import './states.css';

const LOADED_SRC_CACHE = new Set<string>();

export interface BlurUpImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
  transparent?: boolean;
  borderRadius?: number | string;
  className?: string;
  imgClassName?: string;
  style?: React.CSSProperties;
}

/**
 * Blur-up image loader with scene-tinted placeholder and explicit dimensions
 * for zero Cumulative Layout Shift (CLS = 0). Respects prefers-reduced-motion.
 */
export function BlurUpImage({
  src,
  alt,
  width,
  height,
  priority = false,
  transparent = false,
  borderRadius,
  className = '',
  imgClassName = '',
  style,
}: BlurUpImageProps) {
  const reducedMotion = useReducedMotion();
  const imgRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(() => LOADED_SRC_CACHE.has(src));

  useEffect(() => {
    if (LOADED_SRC_CACHE.has(src)) {
      setLoaded(true);
      return;
    }
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth > 0) {
      LOADED_SRC_CACHE.add(src);
      setLoaded(true);
    } else {
      setLoaded(false);
    }
  }, [src]);

  const markLoaded = () => {
    LOADED_SRC_CACHE.add(src);
    setLoaded(true);
  };

  const isVisible = loaded || reducedMotion;

  return (
    <span
      className={`blurup-wrap ${transparent ? 'is-transparent' : ''} ${isVisible ? 'is-loaded' : ''} ${className}`.trim()}
      style={{
        width,
        height,
        borderRadius,
        ...style,
      }}
    >
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        onLoad={markLoaded}
        onError={markLoaded}
        className={`blurup-img ${isVisible ? 'is-loaded' : ''} ${imgClassName}`.trim()}
      />
    </span>
  );
}
