/*
  How a case describes its patient. The figure itself is painted into the ward picture; these
  fields say which clinical signs to lay over it (WardScene), and will choose between patient
  pictures once there is more than one.
*/

export interface PatientLook {
  sex: 'male' | 'female';
  skin: string;
  hair: { color: string; style: 'short-wavy' | 'long' | 'bald' };
  beard?: string;
  gown: { base: string; dots: string };
  expression: 'neutral' | 'tired' | 'distressed';
  signs: {
    /** 0–1: how yellow the skin is. */
    jaundice?: number;
    pallor?: number;
    flushed?: number;
    sweating?: boolean;
    scratchMarks?: boolean;
  };
}
