-- Un SINÓNIMO no puede usurpar el nombre de OTRO cargo.
--
-- Al subir el cap de sinónimos de 8 a 30 en el `--enrich`, entraron etiquetas de ESCO
-- demasiado generales: "cocinero" quedó como sinónimo de `grill cook`, `chef` y `fish cook`,
-- cuando "cocinero" es el nombre del cargo `cook`. Efecto medido en el buscador: la query
-- "cocinero" resolvía a 292 ofertas de esos tres cargos y **el cocinero genérico se quedaba
-- fuera**, porque el matcher de nivel 1 solo casa formas EXACTAS.
--
-- Regla: si un término es el nombre canónico o traducido de un cargo, ese cargo es su dueño y
-- ningún otro puede tenerlo como sinónimo. Es la misma regla anti-redundancia de 0066 aplicada
-- a los sinónimos: un concepto, un dueño.
--
-- La comparación parte las formas de género ("cocinero / cocinera" → "cocinero" y "cocinera"),
-- porque es como las escribe ESCO y como las busca el usuario.
with canon as (
  select x.tid, btrim(part) as nm
  from (select job_title_id as tid, lower(name) as full from job_title_translations
        union select id, lower(canonical_name) from job_titles) x,
       unnest(string_to_array(x.full, '/')) as part
  where length(btrim(part)) >= 4
)
delete from job_title_synonyms s
using canon c
where c.nm = lower(btrim(s.synonym)) and c.tid <> s.job_title_id;
