import type { SpecialtyContent } from './types';

/*
  Surgery — content to be added.
  Fill in the description, doctors, topics and questions. See README.md in this folder for
  every field and a worked example. Nothing here is invented: empty means "not provided yet".
*/
const content: SpecialtyContent = {
  id: 'surgery',
  description: '',
  // the complete examiners' list, as provided (ids are Latin so page links stay readable)
  doctors: [
    { id: 'walaa', name: 'د. ولاء' },
    { id: 'baher', name: 'د. باهر' },
    { id: 'hassanain', name: 'د. حسنين' },
    { id: 'ibrahim', name: 'د. إبراهيم' },
    { id: 'abdulrazzaq', name: 'د. عبد الرزاق' },
    { id: 'salah', name: 'د. صلاح' },
    { id: 'waddah', name: 'د. وضاح' },
    { id: 'alaa-al-alkawi', name: 'د. علاء العلكاوي' },
    { id: 'osama', name: 'د. أسامة' },
    { id: 'mohammed-ridha-joudi', name: 'د. محمد رضا جودي' },
    { id: 'adnan-al-tahhan', name: 'د. عدنان الطحان' },
    { id: 'noor', name: 'د. نور' },
    { id: 'ahmed-nawras', name: 'د. أحمد نورس' },
    { id: 'amani', name: 'د. أماني' },
    { id: 'amer', name: 'د. عامر' },
    { id: 'muhannad-al-sammak', name: 'د. مهند السماك' },
    { id: 'aysar', name: 'د. أيسر' },
    { id: 'qasim', name: 'د. قاسم' },
    { id: 'laith', name: 'د. ليث' },
    { id: 'alaa-baqir', name: 'د. علاء باقر' },
    { id: 'nasser', name: 'د. ناصر' },
    { id: 'ismail', name: 'د. إسماعيل' },
    { id: 'qais', name: 'د. قيس' },
    { id: 'maytham', name: 'د. ميثم' },
    { id: 'safaa', name: 'د. صفاء' },
    { id: 'zaid', name: 'د. زيد' },
    { id: 'haider-subaih', name: 'د. حيدر صبيح' },
    { id: 'abdullatif', name: 'د. عبد اللطيف' },
  ],
  topics: [],
  questions: [],
};

export default content;
