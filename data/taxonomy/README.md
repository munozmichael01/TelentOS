# TalentOS taxonomy dataset

Generated from the official ESCO API (`v1.2.0`) with TalentOS sector curation.

## Contents

- `taxonomy.json`: reviewed static dataset consumed by `scripts/seed-taxonomy.mjs`.
- `sector-review.md`: low-ICP-fit title review queue for Pista A; no titles were dropped or reassigned.
- `lightcast-crosswalk.json`: skill-level ESCO to Lightcast mapping placeholder generated from official-access research.

## Current counts

- Job titles: 350
- Skills: 1,766
- Job title relations: 600
- Skill relations: 800
- Fabricated autocomplete synonyms removed: 267
- Skills checked for missing Spanish labels: 42
- Skills filled from ESCO Spanish labels: 6
- Skills left with `translations.es: null` because ESCO did not provide a distinct Spanish label: 36
- Skills without ESCO altLabels after fabricated synonym cleanup: 40

## Lightcast crosswalk

Coverage: 0 / 1,766 skills mapped (0%).

Lightcast research findings:

- Lightcast Skills API access requires OAuth client credentials and a Bearer token. Tokens are requested through `https://auth.emsicloud.com/connect/token` and expire after 3,600 seconds.
- The skills list endpoint is documented as `GET https://api.lightcast.io/skills/versions/{version}/skills`, with filters such as `q`, `typeIds`, `fields`, and `limit`.
- Public-good/free access is subject to approval, uses the limited `lightcast_open_free` scope, includes the skills taxonomy and limited extraction, and is not intended for production-scale workloads.
- Commercial/product use requires a commercial license.
- No public official ESCO-to-Lightcast crosswalk file or endpoint was found in the accessible Lightcast documentation. Because the task requires official crosswalk mapping, `lightcast-crosswalk.json` marks every skill as `match: "none"` instead of inventing fuzzy IDs.

Sources reviewed:

- https://docs.lightcast.io/lightcast-api/docs/api-access
- https://docs.lightcast.io/lightcast-api/docs/authentication-guide
- https://docs.lightcast.io/lightcast-api/reference/skills_get_all_skills
- https://lightcast.io/open-skills/access
- https://lightcast.io/open-skills/faqs

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
- `npm test`: PASS, 12 files / 99 tests

## Honest notes

- ESCO is the authoritative base for labels, translations, synonyms and occupation-skill relations.
- Sector assignment is TalentOS curation from search groups and relevance filters. It is useful for an initial global taxonomy, but spot-checks should be reviewed by pista A before production seeding.
- Skill synonyms now prefer real ESCO `alternativeLabel` values. Skills with no ESCO altLabels are intentionally left with an empty synonym list rather than synthetic autocomplete terms.
- No schema or production database changes are included here.
