// Sample content for the homepage. Replace with Supabase queries later.

export type SpecialtyId = 'medicine' | 'surgery' | 'obgyn' | 'paediatrics';

export interface Specialty {
  id: SpecialtyId;
  title: string;
  /** Short name for the card's link, e.g. "Explore O&G". */
  shortName: string;
  points: string[];
  href: string;
}

export const specialties: Specialty[] = [
  {
    id: 'medicine',
    title: 'Medicine',
    shortName: 'Medicine',
    points: ['Long and short cases', 'OSCE stations', 'Examiner questions', 'Clinical approaches'],
    href: '/specialties/medicine',
  },
  {
    id: 'surgery',
    title: 'Surgery',
    shortName: 'Surgery',
    points: ['Surgical procedures', 'Clinical examinations', 'OSCE stations', 'Common questions'],
    href: '/specialties/surgery',
  },
  {
    id: 'obgyn',
    title: 'Obstetrics & Gynaecology',
    shortName: 'O&G',
    points: ['Obstetric and gynaecological cases', 'Clinical examinations', 'OSCE stations', 'Practical skills'],
    href: '/specialties/obstetrics-gynaecology',
  },
  {
    id: 'paediatrics',
    title: 'Paediatrics',
    shortName: 'Paediatrics',
    points: ['Neonatology', 'Common paediatric cases', 'Development and growth', 'OSCE stations'],
    href: '/specialties/paediatrics',
  },
];

export const progressByRange = {
  week: { label: 'This Week', done: 2.7, goal: 10 },
  month: { label: 'This Month', done: 24.5, goal: 40 },
} as const;

export type ProgressRange = keyof typeof progressByRange;

export const streakDays = 5;

export const continueStudying = {
  title: 'Heart Failure',
  meta: ['Medicine', 'Cardiology'],
  done: 3,
  total: 6,
  href: '#heart-failure',
};

export const recentlyAdded = [
  { title: 'Dr. Hassan — Common OSCE Questions', href: '#dr-hassan', isNew: true },
  { title: 'Shoulder Dystocia — Stepwise Approach', href: '#shoulder-dystocia', isNew: false },
  { title: 'Neonatal Sepsis — OSCE Station', href: '#neonatal-sepsis', isNew: false },
];

export const upcomingExams = [
  { title: 'Medicine Midterm', days: 3, tone: 'burgundy' as const },
  { title: 'Paediatrics OSCE', days: 10, tone: 'teal' as const },
  { title: 'Surgery Final', days: 24, tone: 'burgundy' as const },
];

export const navLinks = [
  { label: 'Home', href: '/', current: true },
  { label: 'Specialties', href: '/#specialties', hasMenu: true },
  { label: 'Doctors', href: '#doctors' },
  { label: 'Study Tracker', href: '#study-tracker' },
  { label: 'Library', href: '#library' },
];

/**
 * Telegram handle shown on the label in the bottom band, without the "@" (e.g. 'clinicalroom').
 * Leave it empty until it's ready: the label then shows "@username" and isn't a link.
 */
export const telegramHandle = '';
