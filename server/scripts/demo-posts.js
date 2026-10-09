/**
 * Contenido de ejemplo para desarrollar el frontend con datos realistas.
 * Textos breves escritos para este proyecto; borralos desde el panel cuando quieras.
 */
const daysFromNow = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

export function demoPosts() {
  return [
    {
      title: 'Orilla',
      slug: 'orilla',
      category: 'poesia',
      author: 'Lucía Ferreyra',
      summary: 'Un poema sobre lo que queda cuando el agua se retira.',
      body: 'El agua se fue\ny dejó la forma de su ausencia\nen la arena mojada.\n\nYo también\naprendí a quedarme\ncon el dibujo de lo que se va.',
      status: 'published',
      publishedAt: daysFromNow(-2),
    },
    {
      title: 'Inventario de la casa vacía',
      slug: 'inventario-de-la-casa-vacia',
      category: 'poesia',
      author: 'Martina Sosa',
      summary: 'Un recuento de objetos que todavía guardan voces.',
      body: 'Una silla que mira la ventana.\nUn vaso con agua de hace tres días.\nLa radio, que nadie apaga,\nhablando sola del clima.',
      status: 'published',
      publishedAt: daysFromNow(-10),
    },
    {
      title: 'El último colectivo',
      slug: 'el-ultimo-colectivo',
      category: 'cuentos',
      author: 'Diego Albornoz',
      summary: 'Medianoche, una parada y alguien que no sabe si esperar.',
      body: 'La parada estaba iluminada por un solo farol, y el farol parpadeaba como si dudara.\n\nElena miró el reloj por cuarta vez. *El último pasa a las doce y diez*, le habían dicho. Eran las doce y veinte.\n\nSe quedó igual. A veces esperar es la única forma de no volver.',
      status: 'published',
      publishedAt: daysFromNow(-5),
    },
    {
      title: 'Taller de escritura autobiográfica',
      slug: 'taller-de-escritura-autobiografica',
      category: 'talleres',
      author: 'Equipo Borde',
      summary: 'Ocho encuentros virtuales para escribir desde la propia historia.',
      body: '## Modalidad\n\nVirtual, por videollamada, con materiales accesibles para lectores de pantalla.\n\n## Duración\n\nOcho encuentros semanales de dos horas.\n\n## Inscripción\n\nEscribinos y te enviamos los detalles.',
      status: 'published',
      publishedAt: daysFromNow(-3),
    },
    {
      title: 'Convocatoria: antología "Bordes"',
      slug: 'convocatoria-antologia-bordes',
      category: 'convocatorias',
      author: 'Equipo Borde',
      summary: 'Recibimos cuentos y poemas inéditos para nuestra primera antología.',
      body: 'Buscamos textos inéditos de hasta 2000 palabras.\n\nLeé las bases completas antes de enviar tu propuesta.',
      status: 'published',
      publishedAt: daysFromNow(-1),
      deadline: daysFromNow(45),
      basesUrl: 'https://example.com/bases-antologia-bordes',
    },
    {
      title: 'Convocatoria: concurso de microrrelatos 2025',
      slug: 'convocatoria-microrrelatos-2025',
      category: 'convocatorias',
      author: 'Equipo Borde',
      summary: 'Concurso ya cerrado, se conserva como archivo.',
      body: 'Gracias a todas las personas que participaron.',
      status: 'published',
      publishedAt: daysFromNow(-200),
      deadline: daysFromNow(-150),
    },
    {
      title: 'Borrador sin publicar',
      slug: 'borrador-sin-publicar',
      category: 'cuentos',
      author: 'Diego Albornoz',
      summary: 'Este texto no debería verse en el sitio público.',
      body: 'Todavía en proceso.',
      status: 'draft',
    },
  ];
}
