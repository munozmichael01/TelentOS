/**
 * Una oferta PUBLICADA tiene que ser localizable.
 *
 * El board es geográfico: el orden pone primero las del país elegido y los hubs de SEO se
 * construyen por ciudad. Una oferta sin país no existe para nada de eso — y así nacían TODAS las
 * creadas dentro del producto, porque el formulario guardaba solo el texto de la ubicación y
 * tiraba los campos que el gazetteer ya resolvía.
 *
 * La regla se impone en el SERVIDOR, no en el formulario: el formulario ayuda, pero la API es la
 * que tiene que negarse. Solo aplica al publicar; un borrador puede estar a medias.
 *
 * Remoto es la excepción de ciudad, no de país: una oferta remota se ancla a un país —el país
 * desde el que se puede trabajar, no la dirección de la empresa, que vive en su ficha— y aparece
 * en todo ese país.
 */
export function locationErrorForPublish(job: {
  status?: string | null;
  country_code?: string | null;
  city?: string | null;
  modality?: string | null;
}): string | null {
  if (job.status !== "active") return null;
  if (!job.country_code) {
    return "Elige la ubicación en el desplegable para publicar: hace falta el país.";
  }
  const isRemote = (job.modality ?? "").toLowerCase().startsWith("remot");
  if (!isRemote && !job.city) {
    return "Elige la ubicación en el desplegable para publicar: hace falta la ciudad, o marca la oferta como remota.";
  }
  return null;
}
