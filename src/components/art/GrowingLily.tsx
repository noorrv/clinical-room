import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react';
import soil from './lily/soil.png';
import s1 from './lily/stage-1.png';
import s2 from './lily/stage-2.png';
import s3 from './lily/stage-3.png';
import s4 from './lily/stage-4.png';
import s5 from './lily/stage-5.png';

/*
  The study garden's lily, painted in watercolour in five stages: a seedling, a green stem, a
  closed pink bud, a lily opening, and the full bloom. Stage 0 is bare soil, waiting for the
  day's first question.

  Each new stage grows up out of the last instead of swapping: the new painting rises from the
  soil line and fades in over the old one, the opening flowers unfurl a little from the bloom
  outwards, and the full bloom sways gently from its base. Everything rests under reduced motion
  and while the lily is off screen.
*/

export type LilyStage = 0 | 1 | 2 | 3 | 4 | 5;

const ART: Record<LilyStage, string> = { 0: soil, 1: s1, 2: s2, 3: s3, 4: s4, 5: s5 };
const WORD: Record<LilyStage, string> = {
  0: 'bare soil',
  1: 'a seedling',
  2: 'a green stem',
  3: 'a closed bud',
  4: 'a lily opening',
  5: 'a lily in full bloom',
};

/** a soft, natural ease: quick to start, long to settle, never overshooting */
const GROW = [0.22, 1, 0.36, 1] as const;

/** Today's lily on the streak card: grows stage by stage up to `stage`. */
export function GrowingLily({ stage, day, className = '' }: { stage: LilyStage; day: string; className?: string }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: '80px' });
  const shown = useSteppedStage(stage, day, Boolean(reduce));
  const swaying = shown === 5 && !reduce && inView;

  return (
    <div ref={ref} className={`glily ${className}`} role="img" aria-label={`Today’s lily: ${WORD[stage]}`}>
      <motion.div
        className="glily__sway"
        style={{ transformOrigin: '50% 94%' }}
        animate={swaying ? { rotate: [0, 1.1, 0, -0.9, 0] } : { rotate: 0 }}
        transition={swaying ? { duration: 8, ease: 'easeInOut', repeat: Infinity, delay: 1.2 } : { duration: 1.2, ease: GROW }}
      >
        <AnimatePresence initial={false}>
          <motion.img
            key={shown}
            src={ART[shown]}
            alt=""
            draggable={false}
            className="glily__art"
            // growth rises from the soil line; the opening lilies also unfurl from the flower
            style={{ transformOrigin: shown >= 4 ? '46% 30%' : '50% 94%' }}
            initial={reduce ? { opacity: 0 } : shown >= 4 ? { opacity: 0, scale: 0.94, filter: 'blur(1.5px)' } : { opacity: 0, scaleY: 0.82, y: 6 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, scaleY: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, transition: { duration: reduce ? 0.2 : 1.1, ease: 'easeOut' } }}
            transition={{ duration: reduce ? 0.2 : 1.5, ease: GROW }}
          />
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

/** A small, still lily for the garden row: the stage one day reached. */
export function GardenLily({ stage, faint = false }: { stage: LilyStage; faint?: boolean }) {
  return <img className={`glily-mini${faint ? ' is-faint' : ''}`} src={ART[stage]} alt="" draggable={false} decoding="async" />;
}

/*
  The lily grows one stage at a time from what the student last saw today, so coming back after
  three questions shows the bud forming rather than a sudden jump. What was seen is remembered
  per day on this device only; a new day starts from bare soil.
*/
const SEEN_KEY = 'cr.lily-seen';

function readSeen(day: string): LilyStage | null {
  try {
    const v = JSON.parse(localStorage.getItem(SEEN_KEY) ?? 'null') as { day?: string; stage?: number } | null;
    return v && v.day === day && typeof v.stage === 'number' ? (Math.max(0, Math.min(5, v.stage)) as LilyStage) : null;
  } catch {
    return null;
  }
}

function writeSeen(day: string, stage: LilyStage) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify({ day, stage }));
  } catch {
    /* storage unavailable: the lily simply shows its stage */
  }
}

function useSteppedStage(target: LilyStage, day: string, reduce: boolean): LilyStage {
  const [shown, setShown] = useState<LilyStage>(() => {
    if (reduce) return target;
    const seen = readSeen(day);
    return seen === null ? (target > 0 ? 0 : target) : (Math.min(seen, target) as LilyStage);
  });

  useEffect(() => {
    if (reduce || shown === target) {
      if (shown !== target) setShown(target);
      writeSeen(day, target);
      return;
    }
    // one stage at a time, with a pause for each to settle; a first visit waits a moment
    const t = window.setTimeout(() => setShown((s) => (s < target ? ((s + 1) as LilyStage) : target)), shown === 0 ? 700 : 1300);
    return () => window.clearTimeout(t);
  }, [shown, target, day, reduce]);

  return shown;
}
