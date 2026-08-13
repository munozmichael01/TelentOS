-- Región administrativa de la oferta. Faltaba la tercera pieza del eje geográfico: `jobs` tenía
-- `city` y `country_code`, pero no región, y el gazetteer (Photon/OpenStreetMap) ya la devuelve.
--
-- Contexto de por qué esto importaba: NINGUNA oferta creada dentro del producto tenía país. El
-- autocompletado de ubicación ya resolvía ciudad, región y país desde hace tiempo, pero el
-- formulario solo guardaba la CADENA montada en `location` y tiraba los tres campos. Con el país
-- nulo, el orden local-first del board no puede colocar esas ofertas.
alter table jobs add column if not exists region text;

-- El board filtra y ordena por país; el índice evita el escaneo con 3.000+ ofertas activas.
create index if not exists jobs_country_code_idx on jobs (country_code) where status = 'active';
