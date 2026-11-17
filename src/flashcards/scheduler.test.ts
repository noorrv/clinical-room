import { describe, expect, it } from 'vitest';
import { FIRST_INTERVAL, isDifficult, isDue, isLearning, isMastered, isOverdue, preview, rate, recall, spanWord, type Rate } from './scheduler';

const MIN = 60_000;
const DAY = 86_400_000;
const T0 = new Date('2026-11-16T09:00:00').getTime();
const KEY = 'surgery/apx-01';

describe('first rating of a new card', () => {
  it.each([
    [1, 5 * MIN, 'learning'],
    [2, 30 * MIN, 'learning'],
    [3, DAY, 'review'],
    [4, 3 * DAY, 'review'],
  ] as Array<[Rate, number, string]>)('rating %i is due after the fixed starting interval', (r, gap, state) => {
    const { card, log } = rate(KEY, null, r, T0);
    expect(card.due - T0).toBe(gap);
    expect(FIRST_INTERVAL[r]).toBe(gap);
    expect(card.state).toBe(state);
    expect(card.reps).toBe(1);
    expect(log.stateBefore).toBe('new');
    expect(log.rating).toBe(r);
    expect(log.retrievability).toBeNull();
  });

  it('gives easier ratings more stability and less difficulty', () => {
    const again = rate(KEY, null, 1, T0).card;
    const easy = rate(KEY, null, 4, T0).card;
    expect(easy.stability).toBeGreaterThan(again.stability);
    expect(easy.difficulty).toBeLessThan(again.difficulty);
  });

  it('previews the same intervals the buttons will give', () => {
    const p = preview(KEY, null, T0);
    expect(p[1]).toBe(5 * MIN);
    expect(p[3]).toBe(DAY);
    expect(spanWord(p[1])).toBe('5 min');
    expect(spanWord(p[2])).toBe('30 min');
    expect(spanWord(p[3])).toBe('1 day');
    expect(spanWord(p[4])).toBe('3 days');
  });
});

describe('later reviews follow FSRS', () => {
  it('a Good review on time stretches the interval', () => {
    const first = rate(KEY, null, 3, T0).card;
    const second = rate(KEY, first, 3, first.due).card;
    expect(second.state).toBe('review');
    expect(second.due - first.due).toBeGreaterThan(DAY);
    expect(second.stability).toBeGreaterThan(first.stability);
    expect(second.reps).toBe(2);
  });

  it('Again on a review card lapses it into relearning, soon', () => {
    const first = rate(KEY, null, 3, T0).card;
    const { card, log } = rate(KEY, first, 1, first.due);
    expect(card.state).toBe('relearning');
    expect(card.lapses).toBe(1);
    expect(card.due - first.due).toBeLessThan(DAY);
    expect(log.stateBefore).toBe('review');
    expect(log.retrievability).not.toBeNull();
  });

  it('adapts: the same card reviewed with Easy grows faster than with Hard', () => {
    const start = rate(KEY, null, 3, T0).card;
    let easy = start;
    let hard = start;
    for (let i = 0; i < 3; i++) {
      easy = rate(KEY, easy, 4, easy.due).card;
      hard = rate(KEY, hard, 2, hard.due).card;
    }
    expect(easy.due - easy.lastReview).toBeGreaterThan(hard.due - hard.lastReview);
  });

  it('a learning card moves on through its steps', () => {
    const first = rate(KEY, null, 1, T0).card;
    expect(isLearning(first)).toBe(true);
    const next = rate(KEY, first, 3, first.due).card;
    expect(next.due).toBeGreaterThan(first.due);
  });
});

describe('recall and categories', () => {
  it('recall falls as time passes', () => {
    const c = rate(KEY, null, 3, T0).card;
    const soon = recall(c, T0 + DAY)!;
    const late = recall(c, T0 + 30 * DAY)!;
    expect(soon).toBeGreaterThan(late);
    expect(soon).toBeLessThanOrEqual(1);
    expect(late).toBeGreaterThan(0);
  });

  it('due and overdue follow the calendar day', () => {
    const c = rate(KEY, null, 3, T0).card; // due tomorrow 09:00
    expect(isDue(c, T0)).toBe(false);
    expect(isDue(c, T0 + DAY)).toBe(true);
    expect(isOverdue(c, T0 + DAY)).toBe(false);
    expect(isOverdue(c, T0 + 2 * DAY)).toBe(true);
  });

  it('difficult and mastered', () => {
    let c = rate(KEY, null, 3, T0).card;
    expect(isMastered(c)).toBe(false);
    for (let i = 0; i < 6; i++) c = rate(KEY, c, 4, c.due).card;
    expect(isMastered(c)).toBe(true);
    let h = rate(KEY, null, 3, T0).card;
    h = rate(KEY, h, 1, h.due).card;
    h = rate(KEY, h, 3, h.due).card;
    h = rate(KEY, h, 1, h.due).card;
    expect(h.lapses).toBe(2);
    expect(isDifficult(h)).toBe(true);
  });
});
