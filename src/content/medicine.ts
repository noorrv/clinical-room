import type { SpecialtyContent } from './types';

/*
  Medicine: the real content lives in Supabase (see README.md in this folder).
  Keep this file empty: anything in the website code can be downloaded by every visitor.
*/
const content: SpecialtyContent = {
  id: 'medicine',
  description: '',
  doctors: [], // in Supabase (table: doctors)
  topics: [],
  questions: [],
};

export default content;
