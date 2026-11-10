import { Fragment, type ReactNode } from 'react';
import { BookOpen, Check, CircleAlert, Hospital, Lightbulb, Pin, Stethoscope, TriangleAlert, X } from 'lucide-react';

/*
  Emojis in imported material are shown as the library's own marks: ornamental stars for importance
  ratings and key points, a fleuron for flourishes, and thin Lucide line icons for symbols that carry
  a meaning (warning, check, references…). The stored text keeps the original character, so nothing is
  lost and editors see what the author wrote; only the display changes.
*/

const EMOJI = /(⭐+|🌟|📚|⚠️?|✅|✔️?|🏥|🔥|❗|💡|📌|🩺|❌)/u;

function Star() {
  return (
    <svg viewBox="-10 -10 20 20" className="orn-star__svg" aria-hidden>
      <path d="M0 -9 L2.2 -2.6 L9 -2.3 L3.6 1.8 L5.6 8.6 L0 4.8 L-5.6 8.6 L-3.6 1.8 L-9 -2.3 L-2.2 -2.6 Z" />
    </svg>
  );
}

const ICON_PROPS = { size: '1em', strokeWidth: 1.75, className: 'orn-icon', 'aria-hidden': true } as const;

function mark(token: string, key: number): ReactNode {
  if (token.startsWith('⭐')) {
    const n = [...token].length;
    if (n === 1)
      return (
        <span key={key} className="orn-star" role="img" aria-label="Key point">
          <Star />
        </span>
      );
    return (
      <span key={key} className="orn-rating" role="img" aria-label={`Importance: ${n} of 5`}>
        {Array.from({ length: n }, (_, i) => (
          <Star key={i} />
        ))}
      </span>
    );
  }
  const labelled = (label: string, icon: ReactNode) => (
    <span key={key} className="orn-mark" role="img" aria-label={label}>
      {icon}
    </span>
  );
  switch (token.replace('️', '')) {
    case '🌟':
      return (
        <span key={key} className="orn-flourish" aria-hidden>
          ❦
        </span>
      );
    case '📚':
      return labelled('References', <BookOpen {...ICON_PROPS} />);
    case '⚠':
      return labelled('Warning', <TriangleAlert {...ICON_PROPS} />);
    case '✅':
    case '✔':
      return labelled('Correct', <Check {...ICON_PROPS} />);
    case '🏥':
      return labelled('Hospital', <Hospital {...ICON_PROPS} />);
    case '🔥':
      return (
        <span key={key} className="orn-emphasis" role="img" aria-label="High-yield">
          ❖
        </span>
      );
    case '❗':
      return labelled('Important', <CircleAlert {...ICON_PROPS} />);
    case '💡':
      return labelled('Tip', <Lightbulb {...ICON_PROPS} />);
    case '📌':
      return labelled('Note', <Pin {...ICON_PROPS} />);
    case '🩺':
      return labelled('Examination', <Stethoscope {...ICON_PROPS} />);
    case '❌':
      return labelled('Incorrect', <X {...ICON_PROPS} />);
    default:
      return token;
  }
}

/** Text with its emojis replaced by ornaments and line icons. */
export function withOrnaments(text: string): ReactNode {
  if (!EMOJI.test(text)) return text;
  const parts = text.split(new RegExp(EMOJI.source, 'gu'));
  return parts.map((p, i) => (i % 2 ? mark(p, i) : <Fragment key={i}>{p}</Fragment>));
}
