# Evaluación de coste — Agentes de TalentOS (actuales y futuros)

> **Fecha:** 2026-07-10 · **Moneda:** USD (facturación de las APIs).
> **Metodología:** tokens medidos sobre los archivos reales del repo (prompts de sistema y definiciones de tools, ratio ~3,6 caracteres/token para español+JSON), tamaños de tool-results estimados de las queries reales, y el flujo de completions que ejecuta `agents/core.ts` (cada turno del loop de tools reenvía todo el contexto). Precios verificados a julio 2026.

---

## 1. Precios vigentes (por millón de tokens)

### OpenAI (proveedor actual)

| Modelo | Input | Input cacheado | Output | Batch (in/out) |
|---|---|---|---|---|
| gpt-4o (usado en core + translate) | $2.50 | $1.25 | $10.00 | $1.25 / $5.00 |
| gpt-4o-mini (usado en insights) | $0.15 | $0.075 | $0.60 | $0.075 / $0.30 |

El caching de OpenAI es automático (descuento ~50% sobre prefijos repetidos ≥1.024 tokens); el Batch API da 50% con procesamiento asíncrono ≤24h.

### Anthropic (comparativa)

| Modelo | Input | Output | Notas |
|---|---|---|---|
| Claude Haiku 4.5 | $1.00 | $5.00 | Tier rápido/barato |
| Claude Sonnet 5 | $3.00 ($2.00 intro hasta 2026-08-31) | $15.00 ($10.00 intro) | Tier balanceado |
| Claude Opus 4.8 | $5.00 | $25.00 | Tier alto |

Caching de Anthropic: explícito (`cache_control`), lecturas a ~0,1× del precio de input y escrituras a 1,25× — más agresivo que el 50% de OpenAI cuando el prefijo se reutiliza mucho. Batch API: 50% de descuento, igual que OpenAI.

---

## 2. Tokens medidos por agente (del repo, no estimados)

| Agente | Prompt sistema | Defs. tools | Tool-result típico | Output típico |
|---|---:|---:|---:|---:|
| candidate-analyzer | 382 tok | 142 tok | 450–850 tok | ~600 tok |
| channel-analyst | 673 tok | 459 tok | 550–1.700 tok | ~280 tok |
| channel-optimizer | 594 tok | 428 tok | 3 tools ≈ 1.700 tok | ~700 tok |
| job-writer | 412 tok | 268 tok | 80–140 tok | ~800 tok |
| onboarding-builder | 342 tok | 134 tok | 140–250 tok | ~475 tok |
| dashboard-insights (redactor) | 216 tok | — | señales ~400 tok | ≤400 tok (cap) |

Nota estructural que multiplica el coste: `core.ts` ejecuta un loop de hasta 6 turnos y **cada turno reenvía el contexto completo**. El optimizer, con 3 tool-calls obligatorias secuenciales, paga el prompt ~4 veces.

---

## 3. Coste por invocación (gpt-4o, situación actual)

| Agente | Input total* | Output | Coste/invocación |
|---|---:|---:|---:|
| candidate-analyzer (2 completions) | ~1.850 tok | ~630 tok | **$0.011** |
| job-writer (2 completions) | ~1.950 tok | ~840 tok | **$0.013** |
| channel-optimizer (4 completions) | ~8.100 tok | ~700 tok | **$0.027** |
| channel-analyst (2 completions, con historial ~10 turnos) | ~5.000 tok | ~280 tok | **$0.015 / pregunta** |
| onboarding-builder (2 completions) | ~1.260 tok | ~475 tok | **$0.008** |
| dashboard-insights refresh (gpt-4o-mini) | ~620 tok | ~350 tok | **$0.0003** |
| career-site translate (gpt-4o, por idioma) | ~2.500 tok | ~2.500 tok | **~$0.031** |

\* Input acumulado a través de los turnos del loop (el reenvío de contexto está incluido).

### Coste mensual por empresa activa

| Escenario A — pyme activa | Volumen/mes | Coste |
|---|---:|---:|
| Análisis de candidatos | 60 | $0.66 |
| Preguntas al channel-analyst | 80 | $1.20 |
| Planes de distribución | 15 | $0.41 |
| Redacción de ofertas | 20 | $0.26 |
| Onboardings | 4 | $0.03 |
| Refresh de insights | 60 | $0.02 |
| Traducciones career site | 4 | $0.12 |
| **Total** | | **≈ $2.70/mes** |

**Escenario B — uso intensivo (×5):** ≈ $13–15/mes por empresa.

**Conclusión de la parte actual:** el coste de los agentes existentes es **trivial** — del orden de $3/mes por empresa activa. El riesgo de coste no está en lo que hay, sino en (a) los agentes futuros de alto volumen, (b) la ausencia total de guardrails (sin `max_tokens`, sin rate-limit, sin presupuesto por empresa), y (c) el asistente conversacional si se generaliza.

---

## 4. Coste de los agentes futuros (propuestos en el análisis funcional)

| Agente futuro | Tokens/uso (est.) | Volumen/mes (pyme) | gpt-4o | gpt-4o-mini | Haiku 4.5 |
|---|---|---:|---:|---:|---:|
| **P1 · CV parser** (extracción estructurada, 2-4 págs) | ~5.000 in / 300 out | 200–500 CVs | $3–8 | **$0.20–0.50** | $1.30–3.25 |
| **P2 · Insights ampliado + cron diario** (determinista + redactor) | ~1.000 in / 400 out | 30 crons | $0.16 | **$0.01** | $0.06 |
| **P3 · Payroll copilot** (anota ~50 líneas pre-calculadas) | ~2.000 in / 600 out | 1–2 runs | $0.02 | **$0.001** | $0.01 |
| **P4 · Asistente global** (chat multi-módulo, más tools) | ~7.000 in / 350 out por pregunta | 300 preguntas | **$6–9** | $0.40 | $2.60 |
| **P5 · Interview copilot** (brief + síntesis) | ~2.500 in / 500 out | 20 entrevistas | $0.23 | $0.01 | $0.10 |
| **P6 · Absence assistant** (determinista + redacción) | ~800 in / 150 out | 40 aprobaciones | $0.14 | $0.01 | $0.06 |

Lecturas clave:

1. **El CV parser y el asistente global concentran >90% del coste futuro.** Todo lo demás es ruido presupuestario.
2. **El CV parser es un trabajo de extracción, no de razonamiento** — en gpt-4o-mini o Haiku cuesta céntimos; en gpt-4o cuesta 15× más sin ganancia proporcional de calidad. Es el caso de libro para model tiering.
3. **El asistente global es el único con coste real** (~$6–9/mes/empresa en gpt-4o), y es exactamente donde el caching de prefijo rinde más: system + tools estables (~1.100–2.500 tok) repetidos en cada pregunta.
4. Con tiering correcto (extracción→mini, chat→4o con caching, redacción→mini), **el coste total futuro por empresa activa queda en ~$8–12/mes** — perfectamente absorbible en el pricing de un HRIS por asiento.

---

## 5. Riesgos de coste identificados en el código (no son teóricos)

| Riesgo | Dónde | Impacto |
|---|---|---|
| **Sin `max_tokens`** en las completions del core | `agents/core.ts:77-83` | Un output desbocado factura sin techo; gpt-4o cobra $10/M de output. Fix: cap explícito por agente (600–1.000 tok cubren todos los outputs actuales). |
| **Sin rate-limit ni presupuesto por empresa** | todos los endpoints `/api/agents/*` | Cualquier usuario autenticado puede invocar en bucle. 1.000 llamadas al optimizer = $27, repetible. Fix: contador diario por empresa (la tabla `agent_runs` ya existe para esto) + `requireApiRole`. |
| **`MAX_TOOL_TURNS = 6` con reenvío completo** | `core.ts:31,76` | Un loop patológico multiplica ×6 el input. Aceptable hoy; vigilar si crecen los contextos. |
| **`translate` fuera del framework** | `career-site/translate/route.ts` | Sin log, sin fallback, sin control — invisible en cualquier contabilidad de coste vía `agent_runs`. |
| **Historial del analyst sin poda semántica** | cap de 10 turnos ✅ pero cada turno arrastra ~150–300 tok | Correcto hoy; en el asistente global, cachear el prefijo y resumir historial >10 turnos. |
| **Auditoría rota = coste invisible** | `agent_runs` (RLS 0015) | Si los logs no se escriben, no hay forma de atribuir gasto por empresa/agente. Reparar la auditoría es prerequisito de cualquier control de coste. |

---

## 6. Recomendaciones de optimización (por impacto)

1. **Model tiering configurable por agente** (S). `MODEL` por env/config: extracción y redacción (CV parser, insights, payroll copilot, absence) → gpt-4o-mini o Haiku 4.5; razonamiento y chat (analyzer, optimizer, analyst) → tier alto. El motor de insights ya lo hace bien — generalizar esa decisión. Ahorro: ~90% en los agentes de alto volumen futuros.
2. **`max_tokens` explícito por agente** (S). Techo de facturación y de latencia. Gratis.
3. **Presupuesto/rate-limit por empresa** (M). N invocaciones/día por agente contra `agent_runs` (reparada); al superarlo, degradar al fallback heurístico — que ya existe y cuesta $0. Es la única defensa contra abuso y la base de un tier freemium.
4. **Caching de prefijo para el chat** (S hoy, M en el asistente global). Mantener system+tools como prefijo estable (ya es así) y el historial después. Con OpenAI es automático ≥1.024 tok (el analyst con sus ~1.130 tok de prefijo ya califica, descuento 50% del input repetido). Si se migrara a Anthropic, el caching explícito a 0,1× por lectura es más rentable aún para el asistente global.
5. **Cachear resultados, no solo prompts** (S). El analyzer ya cachea en `ai_analysis` ✅ — extender: plan del optimizer reutilizable <24h sin datos nuevos; traducciones del career site invalidadas solo si cambia el contenido.
6. **Fusionar tool-calls del optimizer** (S). `get_channels` + `get_channel_performance` no dependen entre sí — devolverlas en un solo tool-result ahorra 1-2 turnos de reenvío de contexto (~30% del input del agente más caro por invocación).
7. **Batch API para trabajos retroactivos** (M). El backfill de CV parsing sobre candidatos históricos a 50% de descuento (ambos proveedores) — no necesita ser síncrono.
8. **El fallback heurístico como feature de pricing** (producto). Modo $0 real: tier gratuito con heurísticas, tier de pago con IA. Ya está construido; solo falta exponerlo.

### ¿Cambiar de proveedor? (comparativa Anthropic)

Para los volúmenes de TalentOS, **la elección de proveedor importa menos que el tiering**: la brecha grande no es gpt-4o vs Sonnet (comparables: $2.50/$10 vs $2-3/$10-15), sino modelo-grande vs modelo-pequeño dentro de cualquier proveedor.

- **Extracción pura (CV parser):** gpt-4o-mini ($0.15/$0.60) es lo más barato del mercado; Haiku 4.5 ($1/$5) cuesta ~7× más pero con mayor capacidad de razonamiento — relevante si el parsing exige inferencias (títulos ambiguos, CVs mal estructurados).
- **Chat/razonamiento (asistente global):** Sonnet 5 a precio intro ($2/$10 hasta ago-2026) es igual o más barato que gpt-4o, y el caching a 0,1× por lectura supera el 50% de OpenAI en cargas de chat con prefijo estable — es el caso de uso donde Anthropic sale mejor en la cuenta.
- **Coste de cambio:** `core.ts` está acoplado al SDK de OpenAI (tool-calling + `response_format: json_object`). Migrar es viable (los conceptos mapean 1:1) pero no gratis; solo se justifica si (a) se busca calidad, no ahorro, o (b) el asistente global escala a volúmenes donde el caching agresivo mueve la aguja.

**Recomendación:** quedarse en OpenAI a corto plazo, implementar tiering + guardrails (puntos 1-3), y re-evaluar proveedor cuando el asistente global (P4) tenga volumen real — con la config de modelo por agente ya desacoplada, el switch será barato.

---

## 7. Síntesis

- **Hoy:** ~$2.70/mes por empresa activa. El coste no es un problema; la ausencia de techos sí.
- **Futuro (P1–P6 con tiering):** ~$8–12/mes por empresa activa. Sin tiering (todo en gpt-4o): $15–25/mes — evitable con un cambio de configuración.
- **Los 3 imprescindibles antes de escalar agentes:** `max_tokens` por agente, presupuesto por empresa con degradación al fallback, y reparar `agent_runs` para poder atribuir el gasto.

### Fuentes de precios

- OpenAI: [developers.openai.com/api/docs/pricing](https://developers.openai.com/api/docs/pricing) · [devtk.ai — gpt-4o-mini](https://devtk.ai/en/models/gpt-4o-mini/) · [pricepertoken.com — gpt-4o](https://pricepertoken.com/pricing-page/model/openai-gpt-4o)
- Anthropic: [platform.claude.com/docs/en/pricing](https://platform.claude.com/docs/en/pricing) (Haiku 4.5 $1/$5 · Sonnet 5 $3/$15, intro $2/$10 hasta 2026-08-31 · Opus 4.8 $5/$25; caching lecturas ~0,1× / escrituras 1,25×; batch 50%)
