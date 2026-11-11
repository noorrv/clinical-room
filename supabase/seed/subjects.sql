-- ════════════════════════════════════════════════════════════════════════════════════════════
--  The Clinical Room · seed: subjects for every specialty, and the existing topics filed under them
--
--  Run in Supabase → SQL Editor after migration 20261112000008_subjects.sql.
--  Safe to run again: subjects are updated in place, never duplicated.
--  Questions and answers are not touched; only topics.subject_id is set.
-- ════════════════════════════════════════════════════════════════════════════════════════════

insert into public.subjects (specialty_id, id, name, sort) values
  -- Internal Medicine
  ('medicine', 'cardiology',          'Cardiology',                  1),
  ('medicine', 'respiratory',         'Respiratory medicine',        2),
  ('medicine', 'gastroenterology',    'Gastroenterology',            3),
  ('medicine', 'hepatology',          'Hepatology',                  4),
  ('medicine', 'nephrology',          'Nephrology',                  5),
  ('medicine', 'neurology',           'Neurology',                   6),
  ('medicine', 'endocrinology',       'Endocrinology',               7),
  ('medicine', 'rheumatology',        'Rheumatology',                8),
  ('medicine', 'haematology',         'Haematology',                 9),
  ('medicine', 'infectious-diseases', 'Infectious diseases',         10),
  -- General Surgery
  ('surgery', 'principles',             'General surgical principles', 1),
  ('surgery', 'abdomen',                'Abdomen',                     2),
  ('surgery', 'appendix',               'Appendix',                    3),
  ('surgery', 'intestinal-obstruction', 'Intestinal obstruction',      4),
  ('surgery', 'hernias',                'Hernias',                     5),
  ('surgery', 'hepatobiliary',          'Hepatobiliary system',        6),
  ('surgery', 'spleen',                 'Spleen',                      7),
  ('surgery', 'breast',                 'Breast',                      8),
  ('surgery', 'thyroid',                'Thyroid',                     9),
  ('surgery', 'vascular',               'Vascular surgery',            10),
  ('surgery', 'urology',                'Urology',                     11),
  -- Obstetrics & Gynaecology
  ('obgyn', 'obstetrics',             'Obstetrics',             1),
  ('obgyn', 'antenatal-care',         'Antenatal care',         2),
  ('obgyn', 'labour-delivery',        'Labour and delivery',    3),
  ('obgyn', 'obstetric-emergencies',  'Obstetric emergencies',  4),
  ('obgyn', 'gynaecology',            'Gynaecology',            5),
  ('obgyn', 'reproductive-medicine',  'Reproductive medicine',  6),
  ('obgyn', 'infertility',            'Infertility',            7),
  -- Paediatrics
  ('paediatrics', 'neonatology',          'Neonatology',            1),
  ('paediatrics', 'growth-development',   'Growth and development', 2),
  ('paediatrics', 'respiratory',          'Respiratory',            3),
  ('paediatrics', 'cardiology',           'Cardiology',             4),
  ('paediatrics', 'gastroenterology',     'Gastroenterology',       5),
  ('paediatrics', 'neurology',            'Neurology',              6),
  ('paediatrics', 'infectious-diseases',  'Infectious diseases',    7),
  ('paediatrics', 'emergencies',          'Paediatric emergencies', 8)
on conflict (specialty_id, id) do update set name = excluded.name, sort = excluded.sort;

-- the six existing Surgery topics, filed under their subjects
update public.topics set subject_id = 'hepatobiliary'          where specialty_id = 'surgery' and id = 'gallbladder-biliary-tract';
update public.topics set subject_id = 'spleen'                 where specialty_id = 'surgery' and id in ('spleen-examination', 'splenic-injury', 'hydatid-cyst-spleen');
update public.topics set subject_id = 'appendix'               where specialty_id = 'surgery' and id = 'appendix';
update public.topics set subject_id = 'intestinal-obstruction' where specialty_id = 'surgery' and id = 'intestinal-obstruction';

-- check: every Surgery topic should now name its subject
select id, name, subject_id from public.topics where specialty_id = 'surgery' order by sort, name;
