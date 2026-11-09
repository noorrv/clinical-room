-- The Clinical Room · starting content: the four specialties and the examiners list
-- (moved out of the website code so it is only served to approved accounts).

insert into public.specialties (id) values ('medicine'), ('surgery'), ('obgyn'), ('paediatrics')
on conflict (id) do nothing;

insert into public.doctors (specialty_id, id, name, sort) values
  ('medicine', 'ali-al-sultani', 'د. علي السلطاني', 0),
  ('medicine', 'khalid-al-qazwini', 'د. خالد القزويني', 1),
  ('medicine', 'mustafa', 'د. مصطفى', 2),
  ('medicine', 'haider-al-saffar', 'د. حيدر الصفار', 3),
  ('medicine', 'ahmed-turki', 'د. أحمد تركي', 4),
  ('medicine', 'mushtaq', 'د. مشتاق', 5),
  ('surgery', 'walaa', 'د. ولاء', 0),
  ('surgery', 'baher', 'د. باهر', 1),
  ('surgery', 'hassanain', 'د. حسنين', 2),
  ('surgery', 'ibrahim', 'د. إبراهيم', 3),
  ('surgery', 'abdulrazzaq', 'د. عبد الرزاق', 4),
  ('surgery', 'salah', 'د. صلاح', 5),
  ('surgery', 'waddah', 'د. وضاح', 6),
  ('surgery', 'alaa-al-alkawi', 'د. علاء العلكاوي', 7),
  ('surgery', 'osama', 'د. أسامة', 8),
  ('surgery', 'mohammed-ridha-joudi', 'د. محمد رضا جودي', 9),
  ('surgery', 'adnan-al-tahhan', 'د. عدنان الطحان', 10),
  ('surgery', 'noor', 'د. نور', 11),
  ('surgery', 'ahmed-nawras', 'د. أحمد نورس', 12),
  ('surgery', 'amani', 'د. أماني', 13),
  ('surgery', 'amer', 'د. عامر', 14),
  ('surgery', 'muhannad-al-sammak', 'د. مهند السماك', 15),
  ('surgery', 'aysar', 'د. أيسر', 16),
  ('surgery', 'qasim', 'د. قاسم', 17),
  ('surgery', 'laith', 'د. ليث', 18),
  ('surgery', 'alaa-baqir', 'د. علاء باقر', 19),
  ('surgery', 'nasser', 'د. ناصر', 20),
  ('surgery', 'ismail', 'د. إسماعيل', 21),
  ('surgery', 'qais', 'د. قيس', 22),
  ('surgery', 'maytham', 'د. ميثم', 23),
  ('surgery', 'safaa', 'د. صفاء', 24),
  ('surgery', 'zaid', 'د. زيد', 25),
  ('surgery', 'haider-subaih', 'د. حيدر صبيح', 26),
  ('surgery', 'abdullatif', 'د. عبد اللطيف', 27)
on conflict (specialty_id, id) do nothing;
