import { type ReactNode, forwardRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { motionTokens } from './tokens';

interface FlipCardProps {
  isFlipped: boolean;
  onFlip: () => void;
  front: ReactNode;
  back: ReactNode;
  minHeight?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

export const FlipCard = forwardRef<HTMLDivElement, FlipCardProps>(
  ({ isFlipped, onFlip, front, back, minHeight = 420, className = '', style }, ref) => {
    const shouldReduce = useReducedMotion();

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        onFlip();
      }
    };

    if (shouldReduce) {
      // Reduced motion fallback: Smooth crossfade instead of 3D spin
      return (
        <div
          ref={ref}
          role="button"
          tabIndex={0}
          aria-label={isFlipped ? 'Mặt sau flashcard, bấm để lật lại' : 'Mặt trước flashcard, bấm để xem nghĩa'}
          onClick={onFlip}
          onKeyDown={handleKeyDown}
          className={`flashcard-container ${className}`}
          style={{
            position: 'relative',
            minHeight,
            cursor: 'pointer',
            ...style,
          }}
        >
          <motion.div
            key={isFlipped ? 'back' : 'front'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: motionTokens.duration.fast }}
            style={{ width: '100%', height: '100%' }}
          >
            {isFlipped ? back : front}
          </motion.div>
        </div>
      );
    }

    return (
      <div
        ref={ref}
        role="button"
        tabIndex={0}
        aria-label={isFlipped ? 'Mặt sau flashcard, bấm để lật lại' : 'Mặt trước flashcard, bấm để xem nghĩa'}
        onClick={onFlip}
        onKeyDown={handleKeyDown}
        className={`flashcard-perspective-container ${className}`}
        style={{
          perspective: 1200,
          minHeight,
          cursor: 'pointer',
          outline: 'none',
          ...style,
        }}
      >
        <motion.div
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{
            duration: motionTokens.duration.deliberate,
            ease: motionTokens.ease.gentleOut,
          }}
          style={{
            width: '100%',
            height: '100%',
            position: 'relative',
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Front Face */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              zIndex: isFlipped ? 1 : 2,
            }}
          >
            {front}
          </div>

          {/* Back Face */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              zIndex: isFlipped ? 2 : 1,
            }}
          >
            {back}
          </div>
        </motion.div>
      </div>
    );
  }
);

FlipCard.displayName = 'FlipCard';
