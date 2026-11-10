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

export const streakDays = 5;

export const navLinks = [
  { label: 'Home', href: '/', current: true },
  { label: 'Specialties', href: '/#specialties', hasMenu: true },
  { label: 'Doctors', href: '/archive/search' },
  { label: 'Study Tracker', href: '/#study-tracker' },
  { label: 'Library', href: '/#notices' },
];

/**
 * Telegram handle shown on the label in the bottom band, without the "@" (e.g. 'clinicalroom').
 * Leave it empty until it's ready: the Telegram label is then hidden entirely.
 */
export const telegramHandle = '';
