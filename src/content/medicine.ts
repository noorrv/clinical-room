import type { SpecialtyContent } from './types';

/*
  Medicine — content to be added.
  Fill in the description, doctors, topics and questions. See README.md in this folder for
  every field and a worked example. Nothing here is invented: empty means "not provided yet".
*/
const content: SpecialtyContent = {
  id: 'medicine',
  description: '',
  // moved from the Surgery list, as provided
  doctors: [
    { id: 'ali-al-sultani', name: 'د. علي السلطاني' },
    { id: 'khalid-al-qazwini', name: 'د. خالد القزويني' },
    { id: 'mustafa', name: 'د. مصطفى' },
    { id: 'haider-al-saffar', name: 'د. حيدر الصفار' },
    { id: 'ahmed-turki', name: 'د. أحمد تركي' },
    { id: 'mushtaq', name: 'د. مشتاق' },
  ],
  topics: [],
  questions: [],
};

export default content;
