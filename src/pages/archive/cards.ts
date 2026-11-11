/*
  Anatomical illustrations for topic pages: the organ alone, lifted from the supplied vintage
  Christmas atlas cards (lettering, border and winter scene removed) as a transparent picture,
  so it sits on the topic's own title card. Each organ is used only for its own topic, never
  the same picture under another name. The spleen and thyroid illustrations are held back
  until corrected versions arrive; topics without one simply show no picture.
*/

const files = import.meta.glob<string>('./cards/*.png', { eager: true, import: 'default', query: '?url' });
const url = (name: string) => files[`./cards/${name}.png`];

export interface AtlasCard {
  src: string;
  /** What the plate shows, for screen readers. */
  alt: string;
}

const CARDS: Record<string, string> = {
  appendix: 'The caecum and vermiform appendix with its mesoappendix',
  gallbladder: 'The gallbladder beneath the liver, with the cystic and common bile ducts',
  stomach: 'The stomach with its blood supply and greater omentum',
  'small-intestine': 'The coils of the small intestine framed by the colon',
  'large-intestine': 'The large intestine from caecum to sigmoid colon',
  'rectum-anal-canal': 'A section through the rectum and anal canal with the sphincters',
  liver: 'The liver from the front, with the gallbladder and its vessels',
  pancreas: 'The pancreas in the duodenal C-loop with the mesenteric vessels',
  hernias: 'A section through an abdominal wall hernia',
  'intestinal-obstruction': 'Distended loops of obstructed bowel',
  peritonitis: 'The opened abdomen with inflamed peritoneum',
  'abdominal-trauma': 'A lacerated solid organ after abdominal trauma',
  breast: 'A sagittal section through the breast',
};

/** Which illustration each topic page shows: `${specialty}/topic/${id}`. Add a line when a topic gets its page. */
const WEARS: Record<string, string> = {
  'surgery/topic/appendix': 'appendix',
  'surgery/topic/gallbladder-biliary-tract': 'gallbladder',
  'surgery/topic/intestinal-obstruction': 'intestinal-obstruction',
};

export function cardFor(specialtyId: string, id: string): AtlasCard | null {
  const name = WEARS[`${specialtyId}/topic/${id}`];
  const src = name && url(name);
  return src ? { src, alt: `Atlas illustration: ${CARDS[name].charAt(0).toLowerCase()}${CARDS[name].slice(1)}` } : null;
}
