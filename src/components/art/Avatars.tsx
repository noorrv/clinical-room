import { memo, useId } from 'react';

/*
  The student's picture: one of twelve illustrated portraits in the library's hand-coloured
  style (ink outlines, flat watercolour fills on a cream roundel), or the student's own photo.
  Each portrait is put together from a few parts (skin, hair or head covering, coat or scrubs,
  and a small clinical detail) so they share one hand.
*/

const INK = '#3b2416';

type Hair = 'short' | 'bun' | 'long' | 'curly' | 'bob' | 'grey' | 'hijab' | 'cap' | 'braids';
type Wear = 'coat' | 'scrubs';
type Extra = 'stethoscope' | 'glasses' | 'mirror' | 'pen' | 'bowtie' | 'none';

interface Look {
  id: string;
  name: string;
  bg: string;
  skin: string;
  hair: Hair;
  hairColor: string;
  wear: Wear;
  wearColor: string; // scrubs colour, or the shirt under the coat
  extras: Extra[];
  beard?: boolean;
  pattern?: boolean; // a sprigged cap
}

export const AVATARS: Look[] = [
  { id: 'sage-scrubs', name: 'Sage scrubs', bg: '#e6e0c6', skin: '#e8b98f', hair: 'short', hairColor: '#3b2416', wear: 'scrubs', wearColor: '#7f9468', extras: ['stethoscope'] },
  { id: 'bun-spectacles', name: 'Bun and spectacles', bg: '#f1dcd2', skin: '#d39b74', hair: 'bun', hairColor: '#5a3a24', wear: 'coat', wearColor: '#b9c9d3', extras: ['glasses'] },
  { id: 'rose-hijab', name: 'Rose hijab', bg: '#e9e3cf', skin: '#c98c66', hair: 'hijab', hairColor: '#c9837d', wear: 'coat', wearColor: '#e9d4c4', extras: ['stethoscope'] },
  { id: 'curls-blue', name: 'Curls in blue', bg: '#dce8ea', skin: '#8a5a3c', hair: 'curly', hairColor: '#24160e', wear: 'scrubs', wearColor: '#5f8ca3', extras: ['none'] },
  { id: 'head-mirror', name: 'Head mirror', bg: '#efe2c4', skin: '#c48a62', hair: 'short', hairColor: '#2e1d12', wear: 'coat', wearColor: '#8a3a3a', extras: ['mirror'], beard: true },
  { id: 'auburn-pen', name: 'Auburn and pen', bg: '#e3e8d8', skin: '#efc4a2', hair: 'long', hairColor: '#9a4f2e', wear: 'coat', wearColor: '#c7d6b8', extras: ['pen'] },
  { id: 'teal-cap', name: 'Teal theatre cap', bg: '#f0e0d8', skin: '#ddb08a', hair: 'cap', hairColor: '#3f7f80', wear: 'scrubs', wearColor: '#3f7f80', extras: ['none'] },
  { id: 'sage-hijab', name: 'Sage hijab', bg: '#f2e6d9', skin: '#e2ae88', hair: 'hijab', hairColor: '#8fa37a', wear: 'scrubs', wearColor: '#7d2e35', extras: ['none'] },
  { id: 'bow-tie', name: 'Silver and bow tie', bg: '#e4e2d4', skin: '#e9bf9c', hair: 'grey', hairColor: '#b9b4a8', wear: 'coat', wearColor: '#d9cfc0', extras: ['glasses', 'bowtie'] },
  { id: 'braids', name: 'Braids', bg: '#f1e2c8', skin: '#6f4630', hair: 'braids', hairColor: '#1c120b', wear: 'coat', wearColor: '#d7a8a0', extras: ['stethoscope'] },
  { id: 'terracotta-bob', name: 'Terracotta bob', bg: '#dfe6e2', skin: '#c9946c', hair: 'bob', hairColor: '#1f1510', wear: 'scrubs', wearColor: '#af5031', extras: ['none'] },
  { id: 'sprigged-cap', name: 'Sprigged cap', bg: '#e8dccb', skin: '#7c4e33', hair: 'cap', hairColor: '#7d2e35', wear: 'scrubs', wearColor: '#22374f', extras: ['stethoscope'], pattern: true },
];

const shade = (hex: string, by: number) => {
  const n = parseInt(hex.slice(1), 16);
  const c = (s: number) => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * (1 - by))));
  return `#${[c(16), c(8), c(0)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
};

function Portrait({ look, uid }: { look: Look; uid: string }) {
  const { skin, hair, hairColor: hc, wear, wearColor: wc, extras } = look;
  const skinShade = shade(skin, 0.14);
  const coat = '#f6efe2';
  const body = wear === 'coat' ? coat : wc;
  const covered = hair === 'hijab';

  return (
    <g>
      {/* hair that falls behind the head */}
      {hair === 'long' && <path d="M39 58 C37 36 49 30 60 30 C72 30 83 36 81 58 L83 88 C77 92 43 92 37 88 Z" fill={hc} stroke={INK} strokeWidth="1" />}
      {hair === 'bob' && <path d="M40 54 C39 36 50 31 60 31 C70 31 81 36 80 54 L80 72 C70 75 50 75 40 72 Z" fill={hc} stroke={INK} strokeWidth="1" />}
      {hair === 'braids' && (
        <>
          <path d="M42 58 C40 72 42 84 46 92" fill="none" stroke={hc} strokeWidth="7" strokeLinecap="round" />
          <path d="M78 58 C80 72 78 84 74 92" fill="none" stroke={hc} strokeWidth="7" strokeLinecap="round" />
        </>
      )}
      {covered && <path d="M35 60 C35 37 47 29 60 29 C73 29 85 37 85 60 C85 75 80 85 74 91 L46 91 C40 85 35 75 35 60 Z" fill={hc} stroke={INK} strokeWidth="1" />}

      {/* shoulders: coat or scrubs */}
      <path d="M16 124 C18 98 37 86 60 86 C83 86 102 98 104 124 Z" fill={body} stroke={INK} strokeWidth="1.1" />
      {wear === 'coat' ? (
        <>
          <path d="M49 87 L60 106 L71 87 Z" fill={wc} stroke={INK} strokeWidth="0.9" />
          <path d="M47 87 L57 112 L50 124" fill="none" stroke={INK} strokeWidth="0.9" />
          <path d="M73 87 L63 112 L70 124" fill="none" stroke={INK} strokeWidth="0.9" />
          <path d="M57 112 L60 124 M63 112 L60 124" stroke={shade(coat, 0.12)} strokeWidth="0.8" />
        </>
      ) : (
        <>
          <path d="M50 86 L60 99 L70 86" fill={skinShade} stroke={INK} strokeWidth="0.9" />
          <path d="M33 104 L33 124 M87 104 L87 124" stroke={shade(wc, 0.18)} strokeWidth="0.9" />
        </>
      )}
      {covered && <path d="M41 84 C47 97 73 97 79 84 L86 104 C78 110 42 110 34 104 Z" fill={shade(hc, 0.1)} stroke={INK} strokeWidth="0.9" />}

      {/* neck and head */}
      {!covered && <rect x="53" y="70" width="14" height="18" rx="6" fill={skinShade} />}
      {!covered && (
        <>
          <circle cx="43" cy="58" r="3.6" fill={skin} stroke={INK} strokeWidth="0.8" />
          <circle cx="77" cy="58" r="3.6" fill={skin} stroke={INK} strokeWidth="0.8" />
        </>
      )}
      <ellipse cx="60" cy="56" rx={covered ? 15 : 17} ry={covered ? 17.5 : 19} fill={skin} stroke={INK} strokeWidth="1" />

      {/* face */}
      <circle cx="53.5" cy="57" r="1.5" fill={INK} />
      <circle cx="66.5" cy="57" r="1.5" fill={INK} />
      <path d="M50.5 52.5 Q53.5 51 56.5 52.5 M63.5 52.5 Q66.5 51 69.5 52.5" fill="none" stroke={INK} strokeWidth="0.9" strokeLinecap="round" />
      <path d="M59.5 58 Q58.6 62.5 60.6 63" fill="none" stroke={shade(skin, 0.3)} strokeWidth="0.9" strokeLinecap="round" />
      <path d="M55.5 66.5 Q60 69.5 64.5 66.5" fill="none" stroke={INK} strokeWidth="1" strokeLinecap="round" />
      <circle cx="50" cy="63" r="3" fill="#d9766f" opacity="0.22" />
      <circle cx="70" cy="63" r="3" fill="#d9766f" opacity="0.22" />

      {look.beard && <path d="M43.5 57 C44 74 52 79.5 60 79.5 C68 79.5 76 74 76.5 57 C74.5 66 68 70.5 60 70 C52 70.5 45.5 66 43.5 57 Z M55 67 Q60 69.5 65 67" fill={hc} stroke={INK} strokeWidth="0.8" />}

      {/* hair, head coverings and caps on top */}
      {(hair === 'short' || hair === 'bun' || hair === 'grey') && (
        <path d={hair === 'grey' ? 'M42.5 54 C42 40 50 35 60 35 C70 35 78 40 77.5 54 C75 47 70 44.5 63 45 L58 42 C52 43 46 47 42.5 54 Z' : 'M42 55 C41 38 50 33 60 33 C71 33 79 39 78 55 C74 46 68 43 60 43 C52 43 46 46 42 55 Z'} fill={hc} stroke={INK} strokeWidth="1" />
      )}
      {hair === 'bun' && <circle cx="60" cy="31" r="8" fill={hc} stroke={INK} strokeWidth="1" />}
      {(hair === 'long' || hair === 'bob' || hair === 'braids') && <path d="M42 54 C41 37 50 32 60 32 C71 32 79 37 78 54 C72 44 64 41 55 43 C50 45 45 48 42 54 Z" fill={hc} stroke={INK} strokeWidth="1" />}
      {hair === 'curly' &&
        [
          [44, 46, 7],
          [50, 38, 7.5],
          [60, 35, 8],
          [70, 38, 7.5],
          [76, 46, 7],
          [41, 54, 5],
          [79, 54, 5],
        ].map(([x, y, r]) => <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill={hc} stroke={INK} strokeWidth="0.9" />)}
      {hair === 'cap' && (
        <>
          <path d="M41 53 C40 35 50 29 60 29 C70 29 80 35 79 53 C72 48 66 46.5 60 46.5 C54 46.5 48 48 41 53 Z" fill={hc} stroke={INK} strokeWidth="1" />
          <path d="M42 51 C50 46.5 70 46.5 78 51" fill="none" stroke={shade(hc, 0.25)} strokeWidth="1.4" />
          {look.pattern &&
            [
              [50, 38],
              [60, 35],
              [70, 38],
              [55, 43],
              [65, 43],
            ].map(([x, y]) => (
              <g key={`${x}-${y}`}>
                <circle cx={x} cy={y} r="1.6" fill="#f2d3c9" />
                <circle cx={x + 1.6} cy={y + 1.2} r="0.9" fill="#a7b98f" />
              </g>
            ))}
        </>
      )}

      {/* the small clinical detail */}
      {extras.includes('glasses') && (
        <g fill="none" stroke={INK} strokeWidth="1.1">
          <circle cx="53.5" cy="57" r="4.6" />
          <circle cx="66.5" cy="57" r="4.6" />
          <path d="M58.1 56.6 Q60 55.4 61.9 56.6" />
        </g>
      )}
      {extras.includes('mirror') && (
        <g>
          <path d="M42 47 C50 41 70 41 78 47" fill="none" stroke="#5a4636" strokeWidth="2.4" />
          <circle cx="60" cy="40" r="7" fill={`url(#${uid}-mirror)`} stroke={INK} strokeWidth="1" />
          <circle cx="60" cy="40" r="1.6" fill="#5a4636" />
        </g>
      )}
      {extras.includes('stethoscope') && (
        <g fill="none" stroke="#2f3a44" strokeWidth="2" strokeLinecap="round">
          <path d="M50 88 C46 98 48 108 56 112" />
          <path d="M70 88 C74 98 72 106 66 110" />
          <circle cx="66" cy="113" r="3.6" fill="#c9cdd0" strokeWidth="1.4" />
        </g>
      )}
      {extras.includes('pen') && (
        <g>
          <rect x="76" y="100" width="10" height="9" rx="1.5" fill="none" stroke={INK} strokeWidth="0.8" />
          <rect x="79" y="94" width="2.2" height="10" rx="1" fill="#7d2e35" />
        </g>
      )}
      {extras.includes('bowtie') && <path d="M53 89 L60 92 L67 89 L67 96 L60 93 L53 96 Z" fill="#7d2e35" stroke={INK} strokeWidth="0.8" />}
    </g>
  );
}

/** The original header figure, kept as the picture for anyone who hasn't chosen one. */
function DefaultFigure() {
  return (
    <g transform="scale(3)">
      <path d="M8 36 Q10 26 20 26 Q30 26 32 36 Z" fill="#6f1d1b" />
      <path d="M16 26 L20 31 L24 26" fill="#f4e8d0" />
      <circle cx="20" cy="17" r="7.5" fill="#d7a77e" />
      <path d="M12.4 16 Q12 8 20 8 Q28 8 27.6 16 Q25 12 20 12.6 Q15 12 12.4 16 Z" fill="#3b2416" />
    </g>
  );
}

/** One of the illustrated portraits, or the default figure. */
export const AvatarArt = memo(function AvatarArt({ id, size = 40, title }: { id?: string | null; size?: number; title?: string }) {
  const look = AVATARS.find((a) => a.id === id);
  const uid = `av${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <defs>
        <clipPath id={`${uid}-clip`}>
          <circle cx="60" cy="60" r="60" />
        </clipPath>
        <radialGradient id={`${uid}-mirror`} cx="0.35" cy="0.35" r="0.8">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.6" stopColor="#cfd3d6" />
          <stop offset="1" stopColor="#8d9398" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="60" r="60" fill={look?.bg ?? '#e9d6b4'} />
      <g clipPath={`url(#${uid}-clip)`}>{look ? <Portrait look={look} uid={uid} /> : <DefaultFigure />}</g>
      <circle cx="60" cy="60" r="57.5" fill="none" stroke={INK} strokeOpacity="0.18" strokeWidth="1.5" />
    </svg>
  );
});
