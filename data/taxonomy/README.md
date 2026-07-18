# TalentOS taxonomy dataset

Generated from the official ESCO API (`v1.2.0`) with TalentOS sector curation.

## Contents

- `taxonomy.json`: reviewed static dataset consumed by `scripts/seed-taxonomy.mjs`.

## Current counts

- Job titles: 350
- Skills: 1,766
- Job title relations: 600
- Skill relations: 800

## Coverage by sector

| Sector | Titles |
|---|---:|
| tech_saas | 65 |
| retail_hospitality | 45 |
| industrial_energy | 60 |
| admin_office | 46 |
| sales_customer | 35 |
| marketing_growth | 35 |
| finance_accounting | 34 |
| people_hr | 30 |

## Validation

Local gate:

```bash
node scripts/validate-taxonomy.mjs
npx tsc --noEmit
npm test
```

Latest run:

- `node scripts/validate-taxonomy.mjs`: PASS
- `npx tsc --noEmit`: PASS
- `npm test`: PASS, 11 files / 93 tests

## Honest notes

- ESCO is the authoritative base for labels, translations, synonyms and occupation-skill relations.
- Sector assignment is TalentOS curation from search groups and relevance filters. It is useful for an initial global taxonomy, but spot-checks should be reviewed by pista A before production seeding.
- No schema or production database changes are included here.
