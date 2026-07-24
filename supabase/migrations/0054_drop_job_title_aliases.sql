-- Retira la tabla huérfana job_title_aliases (esquema paralelo de 0052, ya vacío y sin
-- referencias en código tras repuntar el asistente a job_title_synonyms/translations en el
-- esquema oficial de taxonomía). Los datos viven ahora en el pipeline ESCO oficial.
drop table if exists job_title_aliases;
