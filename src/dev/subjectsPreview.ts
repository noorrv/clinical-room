/*
  Development only: the subjects from supabase/seed/subjects.sql, so the subject boards can be
  previewed before that migration has run. Never used in a production build.
*/
export const PREVIEW_SUBJECTS: Record<string, Array<[string, string]>> = {
  medicine: [['cardiology', 'Cardiology'], ['respiratory', 'Respiratory medicine'], ['gastroenterology', 'Gastroenterology'], ['hepatology', 'Hepatology'], ['nephrology', 'Nephrology'], ['neurology', 'Neurology'], ['endocrinology', 'Endocrinology'], ['rheumatology', 'Rheumatology'], ['haematology', 'Haematology'], ['infectious-diseases', 'Infectious diseases']],
  surgery: [['principles', 'General surgical principles'], ['abdomen', 'Abdomen'], ['stomach', 'Stomach'], ['small-intestine', 'Small intestine'], ['large-intestine', 'Large intestine'], ['rectum-anal-canal', 'Rectum and anal canal'], ['appendix', 'Appendix'], ['intestinal-obstruction', 'Intestinal obstruction'], ['hernias', 'Hernias'], ['liver', 'Liver'], ['hepatobiliary', 'Hepatobiliary system'], ['pancreas', 'Pancreas'], ['spleen', 'Spleen'], ['peritonitis', 'Peritonitis'], ['abdominal-trauma', 'Abdominal trauma'], ['breast', 'Breast'], ['thyroid', 'Thyroid and parathyroid'], ['vascular', 'Vascular surgery'], ['urology', 'Urology']],
  obgyn: [['obstetrics', 'Obstetrics'], ['antenatal-care', 'Antenatal care'], ['labour-delivery', 'Labour and delivery'], ['obstetric-emergencies', 'Obstetric emergencies'], ['gynaecology', 'Gynaecology'], ['reproductive-medicine', 'Reproductive medicine'], ['infertility', 'Infertility']],
  paediatrics: [['neonatology', 'Neonatology'], ['growth-development', 'Growth and development'], ['respiratory', 'Respiratory'], ['cardiology', 'Cardiology'], ['gastroenterology', 'Gastroenterology'], ['neurology', 'Neurology'], ['infectious-diseases', 'Infectious diseases'], ['emergencies', 'Paediatric emergencies']],
};

export const PREVIEW_TOPIC_SUBJECT: Record<string, string> = {
  'gallbladder-biliary-tract': 'hepatobiliary',
  'spleen-examination': 'spleen',
  'splenic-injury': 'spleen',
  'hydatid-cyst-spleen': 'spleen',
  appendix: 'appendix',
  'intestinal-obstruction': 'intestinal-obstruction',
};
