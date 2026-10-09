const base = {
  author: 'Lucía Ferreyra',
  summary: 'Un resumen breve.',
  status: 'published',
  publishedAt: '2026-10-07T15:00:00.000Z',
  image: null,
};

export const poem = {
  ...base,
  id: 'p1',
  title: 'Orilla',
  slug: 'orilla',
  category: 'poesia',
  bodyHtml: '<p>El agua se fue<br />y dejó la forma de su ausencia</p>',
};

export const story = { ...base, id: 'c1', title: 'El último colectivo', slug: 'el-ultimo-colectivo', category: 'cuentos' };

export const openCall = {
  ...base,
  id: 'v1',
  title: 'Convocatoria: antología',
  slug: 'convocatoria-antologia',
  category: 'convocatorias',
  author: 'Equipo Borde',
  deadline: '2026-11-30T02:59:59.999Z',
  callStatus: 'abierta',
  basesUrl: 'https://example.com/bases',
  bodyHtml: '<p>Buscamos textos inéditos.</p>',
  image: { url: 'https://example.com/tapa.jpg', alt: 'Tapa de la antología: un libro abierto sobre una mesa' },
};

export const latest = { poesia: [poem], cuentos: [story], talleres: [], convocatorias: [openCall] };
