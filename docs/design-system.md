# TalentOS — Sistema de Diseño

> **Documento canónico del DS.** Fuente única de verdad del sistema visual de TalentOS.
> **Pista:** Diseño (solo lectura) · **Fecha:** 2026-07-12 · **Estado:** v1 — para revisión de Michael.
> **Destino:** `handoff/` → la pista A lo promueve a `docs/design-system.md` cuando se apruebe.

## Cómo leer este documento

Cada regla está marcada como una de dos cosas:

- **Sin marca = _esto ES así_.** Consolidado literal del código (`tailwind.config.ts`, `app/globals.css`, `components/**`). Es el contrato vigente; documentarlo no lo cambia.
- **`[PROPUESTO]` = _esto propongo que sea así_.** Estandarización mía sobre un hueco o una divergencia, basada en el patrón mayoritario observado. No es vinculante hasta que lo apruebes. Las que requieren tu decisión de dirección están recogidas en **§9 Decisiones pendientes**; el resto son estandarizaciones que puedo defender y que las pistas A/B pueden implementar en cuanto des el visto bueno.

Convención de referencia al código: `archivo:línea`. Todo hallazgo de divergencia está catalogado en **Anexo A** (backlog de migración). Los 4 componentes de superficie de IA tienen blueprint completo en **Anexo B**.

Fuentes consolidadas: `CLAUDE.md` §Sistema de diseño · `handoff/Sistema de Diseño.dc.html` (brief visual) · `tailwind.config.ts` · `app/globals.css` · los 63 componentes de `components/**`. Deuda de referencia: Auditoría técnica §H5 (2.156 `style={{}}`), §M6 (a11y), §L5 (radios/tamaños).

---

# 1 · Fundamentos

## 1.1 Color — tokens

La paleta existe **dos veces** en el código y ambas son fuente de verdad de contextos distintos:

1. **Tokens directos** (`app/globals.css:31-49`) — CSS vars `--ink`, `--line`… pensadas para valores inline/arbitrary. Espejadas en `tailwind.config.ts:26-40` como utilidades (`bg-surface`, `text-soft`, `border-line`).
2. **Tokens semánticos shadcn** (`app/globals.css:9-30`) — `--background`, `--primary`… en HSL, que alimentan los primitivos shadcn (Button, Input, Dialog…). Son un **mapeo** de la paleta TalentOS, no una segunda paleta.

**Regla:** el color se nombra por token, nunca por hex literal en código nuevo. La migración barata (Auditoría §H5) es sustituir hex → `var(--token)` primero, clases Tailwind después.

### Núcleo (papel + tinta + marca)

| Token | Hex | `--var` / Tailwind | Uso |
|---|---|---|---|
| `bg` | `#F4F0E8` | `--bg` / `bg-paper` | Fondo de la app (papel cálido). |
| `surface` | `#FCFAF6` | `--surface` / `bg-surface` | Fondo de cards, tablas, paneles claros. |
| `surface-2` | `#F8F4EB` | `--surface-2` / `bg-surface-2` | Superficie secundaria: hover de fila, inputs anidados. |
| `ink` | `#1A1A17` | `--ink` / `text-ink` | Texto principal · bordes de CTA · **voz del agente (fondo)**. |
| `soft` | `#79746B` | `--soft` / `text-soft` | Texto secundario, labels, hints, iconos en reposo. |
| `line` | `#E7E1D4` | `--line` / `border-line` | Hairlines: bordes de card, separadores, inputs. |
| `line-strong` | `#D4CCBA` | — | Borde de hover de card (`card-hover`, `globals.css:112`). `[PROPUESTO]` nombrarlo como token; hoy es hex suelto. |
| `brand` | `#0E5C4A` | `--brand` / `bg-brand` | Verde primario: nav activo, confirmaciones, acentos de marca. |
| `brand-soft` | `#DCEFE4` | `--brand-soft` / `bg-brand/soft` | Fondo suave de marca: badges, chips activos, tiles. |
| `lime` | `#C6F24E` | `--lime` | Acento de alto voltaje: logo, `::selection`, acento sobre paneles oscuros. |
| `lime-soft` | `#EAF7C4` | `--lime-soft` | Fondo lima suave (badge `lime`). |
| `accent` (coral) | `#F1543F` | `--accent-color` | CTA primario (fondo), contadores de atención. |
| `accent-ink` | `#C7402E` | `--accent-ink` | Coral oscuro para texto sobre fondo claro. |

### Estados semánticos

Cada estado es un par **texto + fondo**. Consolidado de `tailwind.config.ts:36-39` y `globals.css:44-47`.

| Estado | Texto | Fondo | Uso |
|---|---|---|---|
| `success` | `#1B6B4F` | `#DCEFE3` | Confirmado, activo, fit alto (≥75). |
| `warning` | `#946312` | `#F8E7C4` | Requiere atención, medio día, fit medio (50–74), **heurística**. |
| `danger` | `#BD4332` | `#F6D9D2` | Error, límite excedido, fit bajo (<50). |
| `info` | `#2B5E8A` | `#D6E4F2` | Neutro informativo (ausente hoy, etiquetas). |

> **Divergencia detectada:** `role-badge.tsx:3-6` inventa dos verdes fuera de la escala (`#E6F1EC`/`#2C7A5E` para hr_admin, `#FAE3DE`/`#C7402E` para recruiter). Ver Anexo A-1.

### Escala de superficies oscuras (voz del agente)

Los paneles de IA son tinta invertida. Estos valores **existen dispersos** en las superficies de agente y se consolidan aquí como escala oficial `[PROPUESTO]` (hoy cada panel los rehace a mano — `candidate-analyzer-panel.tsx`, `dashboard-client.tsx`, `channel-planner.tsx`):

| Token `[PROPUESTO]` | Hex | Uso |
|---|---|---|
| `agent-bg` | `#1A1A17` | Fondo del panel de agente (= `ink`). |
| `agent-surface` | `#26241F` | Card anidada dentro del panel oscuro. |
| `agent-line` | `#38352E` | Borde/hairline dentro del panel oscuro. |
| `agent-text` | `#E4E0D7` | Texto principal invertido. |
| `agent-soft` | `#8C877E` | Texto secundario invertido. |
| `agent-accent` | `#C6F24E` (lime) | Acento del agente (iconos, CTA lima, barras de score). |

> **Decidido (D1):** sin violeta. La voz del agente es **lima sobre tinta**; la procedencia se codifica con **`brand` / `warning` / `secondary`** (Anexo B-1). El "violeta/brand" del doc de superficies queda **enmendado** aquí — prima la coherencia con el producto real.

---

## 1.2 Tipografía

Tres familias, cargadas en `globals.css:1` (Google Fonts) y declaradas en `tailwind.config.ts:41-45`:

- **Archivo** (`font-display`) — pesos 800/900. Headings, valores KPI, labels de botón, títulos. Casi siempre **900** para títulos, **800** para subtítulos y botones.
- **Space Mono** (`font-mono`) — 400/700. Eyebrows, labels de campo, números tabulares, metadatos, chips uppercase. Es la "voz de sistema" del producto.
- **Hanken Grotesk** (`font-sans`, body por defecto) — 400/500/600/700. Texto corrido, descripciones, contenido de formulario.

**Regla:** nunca declarar `fontFamily` inline. La Auditoría §H5 contó **254** `fontFamily:'Archivo'` y **252** `'Space Mono'` inline — todos migrables a `font-display`/`font-mono`.

### Escala tipográfica

Consolidada del código; donde había divergencia propongo un valor único `[PROPUESTO]`.

| Rol | Familia / peso | Tamaño | Tracking / line-height | Estado |
|---|---|---|---|---|
| `display-xl` | Archivo 900 | 30px | -1px | Hero de página (saludo dashboard, `dashboard-client.tsx:196`). |
| `display-lg` | Archivo 900 | 28px | -0.6px / 1.05 | **Título de página canónico** (`PageHeader`, `page-header.tsx:27`). |
| `stat` | Archivo 900 | 25px | -0.8px / 1, `tabular-nums` | Valor de KPI (`stat-card.tsx:28`). |
| `title` | Archivo 900/800 | 19px | -0.5px | Encabezado de sección (`h2`, `dashboard-client.tsx:296`). |
| `card-title` `[PROPUESTO]` | Archivo 800 | **15px** | -0.2px | Título de card/panel. **Unifica el rango 13–16px** hoy divergente (Auditoría §L5). |
| `body` | Hanken 400/500 | 14px | 1.5 | Texto corrido, descripciones, inputs. |
| `body-sm` | Hanken 500/600 | 13px | 1.5 | Texto denso, celdas, subtítulos. |
| `label` | Space Mono 700 | 11px | 1.5px, UPPERCASE | Eyebrow, legend de grupo de campos. |
| `meta` | Space Mono 400/700 | 10.5px | — | Hints, timestamps, metadatos. |
| `micro` | Space Mono 400 | 9.5px | 1px, UPPERCASE | **Piso duro.** Cabeceras de tabla (`hairline-table.tsx:33`). No bajar de aquí. |

> **Divergencias:** título de página aparece como 28px (canónico) **y** 30px (dashboard). Valores de card-title entre 13 y 16px. `micro` a 9–9.5px roza el mínimo legible y choca con a11y (§M6). Ver Anexo A-4. `[PROPUESTO]`: `display-xl` (30) queda **reservado al hero del dashboard**; toda otra página usa `display-lg` (28) vía `PageHeader`.

---

## 1.3 Espaciado `[PROPUESTO]`

Hoy el espaciado es ad-hoc: conviven `6/7/9/10/11/12/13/14/16/18/20/22/24/28`px inline sin doctrina. Propongo una **escala base-4 con tres micro-pasos heredados** que cubre lo observado sin obligar a reflow masivo:

| Token | px | Uso típico |
|---|---|---|
| `space-0.5` | 4 | Gap de icono+label, padding de chip. |
| `space-1` | 8 | Gap corto, padding vertical de badge. |
| `space-1.5` | 12 | Gap de grilla de campos, padding de celda. |
| `space-2` | 16 | Padding de card estándar, gap entre cards. |
| `space-2.5` | 20 | Padding de panel. |
| `space-3` | 24 | Separación de secciones. |
| `space-4` | 32 | Padding de contenido de página (`app-content` usa 28 → migrar a 32 o documentar 28 como excepción). |
| _micro heredados_ | 6 · 11 · 18 | Alineados a la escala de radios (§1.4). Permitidos, a extinguir hacia `space-*` cuando se toque el archivo. |

**Regla:** usar `gap` de flex/grid, no márgenes por elemento, para separar hermanos (ya es el patrón dominante en el código). Padding de card **16–20px**; nunca <12 ni >24 salvo empty-state (§3.3).

---

## 1.4 Radios

Escala canónica definida en `tailwind.config.ts:50-53`:

| Token | px | Uso |
|---|---|---|
| `r-sm` | 8 | Chips pequeños, tiles de icono, inputs compactos. |
| `r-md` | 11 | **Botones, inputs, badges rectangulares.** El radio "de control". |
| `r-lg` | 14 | **Cards.** (`Card` default, `stat-card`, `hairline-table`). |
| `r-xl` | 18 | Paneles principales, contenedor de app, modales. |
| _pill_ | 999 | Badges redondos, chips de estado, avatares-pill. |

**Regla:** todo radio sale de esta escala. `Card` = 14 (`panel` = 16, ver nota). Botón/input = 11. Panel/modal = 18.

> **Divergencia grave (Auditoría §L5):** en `style={{}}` conviven `10/12/13/15/16`px fuera de escala. `Card panel` usa **16** (`card.tsx:16`) que no está en la escala 8/11/14/18 → `[PROPUESTO]` **absorber `panel` en `r-xl` (18)** o formalizar 16 como `r-lg+`. Recomendación: paneles a **18**, cerrar el hueco. Ver Anexo A-2.

---

## 1.5 Sombras

Definidas en `tailwind.config.ts:55-58`. Sistema de **sombra dura** (offset sólido, sin blur) para lo accionable + sombra suave para elevación.

| Token | Valor | Uso |
|---|---|---|
| `shadow-hard` | `3px 3px 0 #1A1A17` | **CTAs y controles accionables.** Único lugar donde hay `transform` en hover/active. |
| `shadow-card` | `0 2px 8px -2px rgba(26,26,23,.12)` | Elevación suave de card (poco usada — el default es hairline sin sombra). |
| `shadow-pop` | `0 24px 50px -28px rgba(26,26,23,.4)` | Popovers, contenedor de app, dropdowns. |
| _card-hover_ | `0 6px 16px -10px rgba(26,26,23,.4)` + `border-color` | Hover de card interactiva (`globals.css:110-115`). |

### Reglas de movimiento (invariantes del DS)

1. **`transform` SOLO en CTAs/controles.** Hover `translate(-1px,-1px)` + sombra a `5px`; active `translate(2px,2px)` + sombra a `1px` (`globals.css:83-84`, `button.tsx`).
2. **NUNCA `translateY` en cards ni StatCards.** El hover de card es solo `border-color` + `box-shadow` (`CLAUDE.md`, `globals.css:110`). Regla dura.
3. Escala de offset de sombra dura observada: `2px` (chips/tiles internos), `3px` (CTAs), `4px` (paneles destacados como Personalización). Consistente — mantener.

---

## 1.6 Bordes y hairlines

- Borde estándar: **`1px solid var(--line)`** (`#E7E1D4`). Cards, tablas, separadores.
- Borde de input: **`1.5px solid var(--line)`** (`input.tsx`, `textarea.tsx`, `native-select.tsx`). El medio-punto extra distingue el campo editable.
- Borde de control accionable (CTA/CTA-secundario): **`2px solid var(--ink)`** + sombra dura.
- `::selection` = fondo `lime` / texto `ink` (`globals.css:52-55`). Scrollbar cálida `#DAD3C5` (`globals.css:64`).

---

## 1.7 Estados de interacción `[PROPUESTO]`

Hoy los estados están implementados por control, sin sistema. Los primitivos de formulario **ya traen focus-visible correcto** (`input.tsx`: `focus-visible:border-brand focus-visible:ring-[3px] ring-brand-soft`) — se eleva ese patrón a **regla universal**:

| Estado | Especificación |
|---|---|
| **Hover — CTA/control** | `translate(-1px,-1px)`, sombra dura a `5px`. Ya es así. |
| **Hover — card** | `border-color: line-strong` + `shadow` suave. Sin transform. Ya es así. |
| **Hover — fila de tabla** | `background: surface-2` (`.row-hover`, `globals.css:106`). Ya es así. |
| **Hover — nav item** | `background: #EFEBE1` (`globals.css:122`). `[PROPUESTO]` tokenizar como `--nav-hover`. |
| **Focus** | **`focus-visible` obligatorio** en todo control: `outline: none` + `border: brand` + `ring: 3px brand-soft`. Hoy solo lo tienen Input/Textarea/Select — **extender a Button y a todo elemento clicable** (§M6). |
| **Disabled** | `opacity: 0.5`, `cursor: not-allowed`, sin sombra dura. Ya es el patrón (`button.tsx`, inline). Estandarizar el **0.5** (hoy hay 0.5/0.6/0.62/0.7). |
| **Loading** | El control muta a spinner + label ("Guardando…", "Analizando…"); **la pantalla nunca se bloquea**. Ya es el patrón en superficies de IA (§4). Spinner canónico: `IconSpinner` de `cv-parser-panel.tsx:21`. |

**Regla de teclado (§M6):** todo `onMouseEnter` que cambie estado debe tener equivalente `onFocus`. Hay 7 hovers manuales sin foco de teclado hoy.

---

## 1.8 Iconografía

**Regla dura (CLAUDE.md):** cero emojis genéricos en el chrome (nav, cards, headers, badges, botones). Iconos SVG de línea propios:

- `viewBox="0 0 24 24"`, `fill="none"`.
- `stroke="currentColor"`, `stroke-width` **2** (2.2 en glifos densos), `stroke-linecap="round"`, `stroke-linejoin="round"`.
- Tamaño de render: **17px** en nav, **16–18px** en topbar/botones, **13–16px** inline. El icono hereda color vía `currentColor`.
- **Banderas de país:** SVG propias simplificadas (`ui/pack-icons.tsx`), nunca el emoji de bandera.

**Excepción única:** contenido generado por el usuario donde el emoji ES la función (picker del career site: `emoji-picker.tsx`, `career-site-editor.tsx`). No es chrome nuestro.

### Inventario de iconos `[PROPUESTO consolidar]`

El set vive disperso en 3 sitios: `app-shell.tsx` (17 iconos de nav/topbar, definidos como componentes locales), `ui/pack-icons.tsx` (6 banderas + globo), y redefiniciones inline en features. **Propongo `components/ui/icons.tsx` como módulo único** que exporte el set, y retirar las redefiniciones. Inventario actual:

- **Nav:** Dashboard, Briefcase, Candidates, Employee, Org, Vacaciones, Calendar, Horas, Compensación, Payroll, PayRuns, PayProfiles, Settings, Channels, Globe. (`app-shell.tsx:12-108`)
- **Topbar/chrome:** Bell, Help, Panel, Search, Hamburger, Close, Chevron, LogoMark.
- **Acción/estado:** Sparkle, Spinner, Plus, Close (`cv-parser-panel.tsx`, `cv-profile-fields.tsx`).
- **Packs:** FlagVE/BR/ES/CO/MX, IconGeneric (globo). (`ui/pack-icons.tsx`)

> **Divergencia:** hay **dos "iconos de IA"** en circulación — un sparkle de 4 puntas (`cv-parser-panel.tsx:16`, `M12 2l2.4 7.2…`) y una **varita mágica** (`M5 19l1-4 9-9…`) usada en `candidate-analyzer`, `dashboard`, `job-form`, `onboarding`. **Canónico = el sparkle de 4 puntas; la varita se retira (D1).** Ver Anexo A-3.

---

## 1.9 Responsive y breakpoints `[PROPUESTO parcial]`

Único breakpoint real hoy: **`max-width: 767px`** (`globals.css:145`), donde el sidebar pasa a drawer fijo, se colapsan grids 2-col a 1-col y se ocultan búsqueda/links. Tailwind trae `2xl: 1400px` (container). No hay doctrina intermedia (tablet).

**Decidido (D4): desktop-first.** TalentOS es un HRIS de escritorio; se mantiene **solo el corte móvil** ya implementado y **no** se abre doctrina tablet por ahora:
- **`< 768` (móvil):** sidebar-drawer, una columna, hit targets ≥44px. Ya implementado — único breakpoint canónico.
- **`≥ 768`:** layout completo; sidebar colapsable (234/64px); contenido cap a `max-width: 1320px` (`app-shell.tsx`).

La franja tablet (768–1279) hereda el layout desktop; se revisará solo si aparece demanda real.

---

## 1.10 Dark mode `[PROPUESTO]`

`tailwind.config.ts:4` declara `darkMode: ["class"]` pero **no hay tema oscuro definido** — es un placeholder. El obstáculo real no es diseñar la paleta: es que hoy ~1.500 hex están hardcodeados y no leen tokens (Auditoría §H5), así que un tema oscuro es "intocable".

**Precondición:** tokenizar (§1.1) es el desbloqueo. Una vez el DS lee `var(--token)`, dark mode = un segundo bloque `:root.dark { --bg: …; --surface: …; }`. **No especifico paleta oscura de contenido ahora** (sería humo sobre una base no tokenizada); sí dejo la voz del agente (§1.1 escala oscura) como el ancla cromática desde la que derivarla. **Decidido (D5): dark mode es el _premio_ de la tokenización (objetivo post-Fase 3), no trabajo paralelo.**

---

# 2 · Componentes canónicos

Contrato = props + anatomía + qué NO hacer. El modelo de contrato es `PageHeader` (ya documentado en CLAUDE.md).

## 2.1 PageHeader — _consolidado, modelo de contrato_

`components/page-header.tsx`. Cabecera de toda página del dashboard.

```tsx
<PageHeader
  eyebrow="Reclutamiento"   // SOLO nombre de sección. Nunca un count, nunca una frase.
  title="Ofertas"           // Nombre de página — Archivo 900, 28px.
  description="Frase explicativa en sentence-case con punto final."
>
  {/* opcional: acciones a la derecha (botones) */}
</PageHeader>
```

Mapa de eyebrows por sección (CLAUDE.md). **Decidido (D3): regla simple — si no es Reclutamiento, Payroll ni Ajustes, el eyebrow es `"Personas"`.** Es decir Empleados, Organigrama, Ausencias, Calendario, Horas y Banco de horas → `"Personas"`.

**Deuda propia:** el componente hardcodea `#79746B`/`#1A1A17` inline (`page-header.tsx:22-31`) en vez de tokens — es de los primeros a tokenizar (§H5, Fase 3).

## 2.2 Card / CardShell — _consolidado_

`components/ui/card.tsx`.

```tsx
<Card />                 // borde line, fondo surface, radius 14px
<Card interactive />     // + card-hover (border + shadow, SIN transform)
<Card panel />           // radius 16px → [PROPUESTO] alinear a r-xl 18 (§1.4)
```

- Anatomía: `border 1px line` · `bg surface` · `radius 14` · sin sombra por defecto (la elevación es el hairline).
- Sub-partes shadcn disponibles: `CardHeader/Title/Description/Content/Footer` (padding 24px). Poco usadas — la mayoría de features componen el interior a mano.
- **NUNCA `translateY`.** Hover = solo border+shadow.

`[PROPUESTO]` `<CardShell>` (Auditoría Fase 3): un único primitivo que absorba el patrón `background:surface; border:1px line; border-radius:14; padding:16-20` que hoy se reescribe inline **cientos de veces** (ver Anexo A-2). Props: `radius` (`card|panel`), `interactive`, `pad`.

## 2.3 StatCard — _consolidado_

`components/stat-card.tsx`. Tile de KPI. **Nunca interactivo.**

```tsx
<StatCard label="Pipeline activo" value={128} hint="+12 esta semana" hintColor="#79746B" valueColor="#1A1A17" />
```

Anatomía: label `micro` Space Mono uppercase soft → value `stat` Archivo 900 25px tabular → hint `meta` Space Mono. Radius 14, padding `16px 18px`. **Deuda:** hardcodea hex (`stat-card.tsx:17-31`) — tokenizar (§H5).

## 2.4 HairlineTable — _consolidado_

`components/hairline-table.tsx` (`HairlineTable` + `HairlineRow`). Tabla de rejilla con hairlines.

```tsx
<HairlineTable cols="2fr 1fr 1fr 80px" headers={["Nombre","Rol","Estado","Fit"]} align={["left","left","left","right"]}>
  <HairlineRow align={["left","left","left","right"]}>…celdas…</HairlineRow>
</HairlineTable>
```

- Cabecera: `micro` Space Mono uppercase 9.5px, `align="right"` para números/fechas/importes.
- Fila: `.row-hover` (fondo `surface-2`), padding `12px 18px`, borde inferior hairline.
- Reemplazó a `ui/table.tsx` (muerto — Auditoría §L1, borrar).

## 2.5 Button — _consolidado, con deuda de proliferación_

`components/ui/button.tsx` (cva, 9 variantes) es el **único botón canónico**.

| Variante | Aspecto | Uso |
|---|---|---|
| `default` | Coral, borde ink 2px, sombra dura | CTA primario. |
| `brand` | Verde brand, borde ink, sombra dura | Confirmaciones ("Confirmar y guardar"). |
| `outline` / `secondary` | Surface, borde ink, sombra dura | Acción secundaria (son alias). |
| `soft` | Fondo brand-soft, sin sombra | Confirmación suave, disparador de agente. |
| `destructive` | Danger, borde ink, sombra dura | Borrado/rechazo. |
| `ghost` | Transparente, hover `#EFEBE1` | Acción terciaria, iconos. |
| `link` | Texto brand subrayado | Enlace inline. |

Tamaños: `sm` (h-8) · `default` (h-9) · `lg` (h-10) · `icon` (9×9). Texto Archivo 800 13px.

> **Divergencia grave — tres sistemas de botón conviven:**
> 1. El componente `Button` (canónico, 46 usos).
> 2. Las clases CSS `.btn-primary`/`.btn-secondary` (`globals.css:77-94`) — **muertas**, ningún `.tsx` las usa. `[PROPUESTO]` **borrarlas**.
> 3. **188 `<button>` crudos** con estilos inline en 35 archivos (Auditoría §M6), cada uno rehaciendo la sombra dura a mano.
>
> `[PROPUESTO]`: el `Button` cva es el destino; migrar los inline; borrar las clases CSS. **Decidido (D2): `default`→40px, `sm`→36px** (solo desktop, nunca en fila táctil) + un `size="xs"` acotado para toolbars densas — cierra la deuda a11y §M6. Ver Anexo A-5.

## 2.6 Badge / Pill — _consolidado + unificación pendiente_

`components/ui/badge.tsx` (cva, radius 999, 9 variantes: default/outline/secondary/success/warning/destructive/info/lime/brand). Es la píldora canónica.

> **Divergencia — cuatro píldoras divergentes** para el mismo concepto (Auditoría Fase 3):
> - `Badge` (canónica, cva).
> - `role-badge.tsx` — píldora propia con **colores fuera de escala**.
> - `fit-badge.tsx` — píldora propia con semáforo (23px alto, 11.5px).
> - Chips inline en `inbox-item.tsx:145`, `dashboard-client.tsx` (filter chips).
>
> `[PROPUESTO]` `<Pill>` unificado (Auditoría Fase 3): una API que cubra estado semántico, rol y score, con `variant` + `size`. `RoleBadge` y `FitBadge` pasan a ser presets de `<Pill>`. Ver Anexo A-1.

## 2.7 Formularios — _consolidado_

Primitivos en `components/ui/`: `Input`, `Textarea`, `NativeSelect`, `Label`, `Select` (radix), `date-field`, `time-field`, `date-range-field`.

- Campo: `h-10` (compacto `h-8`), `radius 11`, `border 1.5px line`, `bg paper`, texto 14px (compacto `text-xs`).
- **Focus canónico:** `border brand` + `ring 3px brand-soft`. Ya correcto.
- **Label:** SIEMPRE `htmlFor` ↔ `id`. `cv-profile-fields.tsx` es el **modelo de referencia** de formulario accesible (Label+htmlFor, `<fieldset>`+`<legend>`, `disabled` en cascada). El resto de la app tiene **0 `htmlFor`** (§M6) — replicar este patrón.
- Grupo de campos: `<fieldset>` con `<legend>` en `label` (Space Mono uppercase, `sectionLegend`).

`[PROPUESTO]` **patrón de validación** (hoy inexistente como sistema): error de campo = borde `danger` + texto `danger` 13px bajo el campo + `aria-invalid` + `aria-describedby`. Error de formulario = franja `danger-bg` sobre el submit. Ver §3.1.

## 2.8 EmptyState — _consolidado, a rehacer_

`components/empty-state.tsx` existe **pero está fuera del lenguaje visual**: usa clases shadcn genéricas (`rounded-xl border-dashed text-muted-foreground`) mientras las features rehacen su propio empty-state inline (tile de icono + borde dashed 2px + padding 48–60px: `absence-panel.tsx:569`, `pay-profile.tsx:403`, `interview-panel.tsx:302`, `channels-view.tsx:348`).

`[PROPUESTO]` reescribir `EmptyState` al patrón inline dominante y adoptarlo. Blueprint canónico (cierra el ad-hoc de hoy):

**Anatomía:** contenedor centrado con borde `dashed line` `r-lg` y padding 40–56px → **tile de icono** `r-lg` 48px sobre `brand-soft` (icono de línea `stroke brand`, nunca emoji) → **título** `card-title` (Archivo 800, 15px) → **cuerpo** `body` soft, ≤ ~44ch, `text-wrap:pretty` → **CTA opcional** (`Button`, la acción que resuelve el vacío). Nada de sombra dura en el contenedor: el vacío no es accionable, el CTA sí.

```tsx
import { Button } from "@/components/ui/button";

export function EmptyState({
  icon, title, description, action,
}: {
  icon: React.ReactNode;                 // icono de línea 22px, hereda stroke
  title: string;
  description?: string;
  action?: React.ReactNode;              // <Button> que resuelve el vacío
}) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
      border: "1.5px dashed var(--line)", borderRadius: "14px", padding: "48px 32px", gap: "6px",
    }}>
      <span style={{
        width: "48px", height: "48px", borderRadius: "14px", background: "var(--brand-soft)",
        color: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "8px",
      }}>
        {icon}
      </span>
      <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "15px", color: "var(--ink)" }}>{title}</div>
      {description && (
        <p style={{ fontSize: "14px", lineHeight: 1.5, color: "var(--soft)", maxWidth: "44ch", margin: 0, textWrap: "pretty" }}>
          {description}
        </p>
      )}
      {action && <div style={{ marginTop: "14px" }}>{action}</div>}
    </div>
  );
}
// <EmptyState icon={<IconInbox/>} title="Sin candidaturas todavía"
//   description="Llegan desde el career site y los canales activos."
//   action={<Button asChild><Link href="/career-site">Configurar career site</Link></Button>} />
```
> Sustituye el `empty-state.tsx` shadcn actual y absorbe los inline de `absence-panel.tsx:569`, `pay-profile.tsx:403`, `interview-panel.tsx:302`, `channels-view.tsx:348`, `compensation-panel.tsx:472` (Anexo A-6). El icono es **prop** (cada vacío el suyo, del set `ui/icons`). Un solo CTA como máximo: el que desbloquea el estado. Ver §3.3.

## 2.9 AgentPanel — _consolidado_ (voz narrativa del agente)

`components/agent-hint.tsx`. Superficie oscura para todo lo que "dice" un agente.

```tsx
<AgentPanel>…contenido invertido…</AgentPanel>   // bg ink, text paper, radius 16, padding 18/20
```

Es la base de la superficie **S2-narrativa** y **S3-sugerencias** (§4). `[PROPUESTO]` añadir slot de badge de procedencia (AgentBadge, Anexo B-1) y **consolidar el radius** — hoy los paneles de agente usan 14/16/18 según archivo. `AgentHint` (mismo archivo) está **muerto** (§L1) — borrar.

## 2.10 AppShell — _consolidado (referencia)_

`components/app-shell.tsx`. Chrome global: sidebar (234px / 64px colapsado / drawer móvil) + topbar (62px) + área de contenido scrolleable. Contenedor de app `r-xl` 18 con `shadow-pop`. Nav con roles (`NAV_ROLES`), secciones Space Mono, item activo = `bg brand` + sombra dura.

> **Deuda a11y (§M6):** hit targets del nav ~30px (`padding 6px 10px`, sub-items). Objetivo **≥40px**. La topbar (Bell/Help/avatar) son botones **sin `aria-label`** y sin destino. Ver Anexo A-7.

## 2.11 A promover a `components/ui/` `[PROPUESTO]`

Patrones nacidos en features que ya se repiten y deberían ser primitivos:

- **`<Avatar>`** — `AVATAR_PALETTES`+`avatarPalette` está **copiado 6 veces** e `initials()` **4 veces** (Auditoría §M4). Un `<Avatar name email size>` los mata. Alto ROI.
- **`<SignalCard>` / `<InboxItem>`** — `inbox-item.tsx` es la tarjeta de señal (borde-izquierdo de color por tipo). El doc de superficies pide **moverla a `ui/`** para reusar en módulos (§4·S3).
- **`<FilterChip>`** — definido inline en `dashboard-client.tsx:436`; se repetirá.

---

# 3 · Patrones

## 3.1 Formularios y validación `[PROPUESTO]`

- Estructura: `<fieldset>` + `<legend>` por grupo; `<Label htmlFor>` por campo; grilla `grid grid-cols-2 gap-2` para campos cortos emparejados (patrón `cv-profile-fields.tsx`).
- Validación (§2.7): borde+texto `danger`, `aria-invalid`, `aria-describedby`, franja de error sobre el submit. El submit muta a estado loading (§1.7), nunca bloquea la página.
- **Mutaciones:** usar `apiFetch()` (`lib/api-client.ts`, ya existe y `dashboard-client.tsx` lo usa) que comprueba `res.ok` y togglea toast de error. **~20 llamadas fire-and-forget** siguen sin migrar (Auditoría §H6) — no es DS puro pero afecta a todo submit.

## 3.2 Tablas y listas

- Datos tabulares → `HairlineTable` (§2.4). Números/fechas/importes a la derecha, Space Mono tabular.
- Listas de entidad con acción (bandeja, candidatos) → fila-card con borde-izquierdo de color por tipo (`inbox-item.tsx`), no tabla.
- Hover de fila = `surface-2`. Fila entera clicable → la acción primaria en botón detiene la propagación (`e.stopPropagation()`).

## 3.3 Empty states

Patrón canónico `[PROPUESTO]` (del dominante inline): contenedor `surface`/dashed `line`, centrado, padding 40–60px → tile de icono `r-lg` 48–56px sobre `brand-soft` → título `card-title` → descripción `body` soft (max ~40ch) → acción opcional (`Button`). Sustituye al `EmptyState` shadcn actual.

## 3.4 Toasts — _consolidado_

`components/ui/toaster.tsx` + `lib/toast-bus.ts`. Sistema de éxito/error existente. **Toda confirmación de agente y toda mutación** cierra con toast (éxito) o toast de error (vía `apiFetch`). No reinventar notificaciones por acción (§4·S3 anti-patrón).

## 3.5 Modales y diálogos — _consolidado_

`components/ui/dialog.tsx` (radix). Contenido `r-xl`, borde `1.5px ink`, sombra dura grande (`10px 10px 0 rgba(...)` en `new-run-dialog.tsx`, `pay-run-detail.tsx`). Cabecera con `DialogTitle`+`DialogDescription`. Confirmar/cancelar con **igual peso visual** (nada de dark patterns — invariante de IA §4). Modal bloquea solo cuando `submitting`.

---

# 4 · Superficies de IA — doctrina

Principio: **la IA es una voz, no un lugar.** Misma voz visual en todo el producto: **tinta invertida = el agente habla; papel claro = tú actúas.** Máximo **una** superficie de agente visible por pantalla en reposo. Anti-patrones en `handoff/…UX de agentes (sistema de superficies).md`; blueprints en **Anexo B**.

## 4.1 Regla anti-redundancia — _la más importante, valídala primero_

> **La IA nunca repite lo que la pantalla ya muestra. Añade lo que la pantalla no puede.**

Lo que una superficie de datos (tabla, ficha, checklist, contador) ya hace visible **no vuelve a decirse** en tinta. El agente aporta **solo** lo que la pantalla estructuralmente no puede dar:

- **Comparación temporal** — "vs el mes anterior", tendencias, variaciones. La tabla muestra el ahora; el agente, el cambio.
- **Cruce de módulos** — un dato de nómina leído contra el organigrama, un canal contra el pipeline.
- **Síntesis** — 2 líneas que ordenan 40 filas ("empieza por X"), no la relista.
- **Extracción** — sacar estructura de un blob (CV → campos).

**Corolario operativo:** si un aviso del agente **ya es un flag visible** en la pantalla (un icono de alerta en la fila, un contador de incidencias, una sección de "sin datos"), el agente **lo enlaza, no lo repite**: una línea "3 incidencias marcadas en la tabla ↓" que hace scroll/filtro, en vez de tres bullets que duplican los iconos.

_Origen: el copilot de payroll v1 (`pay-run-detail.tsx`) relistaba en tinta los `bank_issue`/`salary_change`/`no_profile` que la tabla de Empleados ya marca con `AlertIcon` y ya cuenta en "Incidencias" → denso, no accionable, redundante (feedback de Michael, confirmado). La regla es la enmienda estructural, no un ajuste cosmético._ **Validada y adoptada.**

## 4.2 Taxonomía — 4 ejes

Toda superficie de IA se clasifica por cuatro ejes. Los ejes **determinan la piel** (claro vs oscuro, efímero vs persistente):

1. **Quién inicia** — `invocada` (el usuario pulsa/pregunta) · `proactiva` (el sistema/cron rellena; el usuario nunca "recarga la IA").
2. **Alcance** — `entidad` (una ficha/línea/oferta) · `módulo` (una vista completa: una corrida, un canal) · `cross-módulo` (el asistente).
3. **Naturaleza** — `hecho` (determinista, reproducible, sin LLM) · `juicio` (opinión/lectura del LLM) · `generación` (redacta contenido nuevo) · `extracción` (estructura un blob).
4. **Ciclo de vida** — `efímera` (se confirma o se descarta y desaparece) · `persistente-triage` (vive hasta que la marcas hecho/ignorar) · `conversacional` (hilo).

**Regla de piel derivada de los ejes:**
- Naturaleza `hecho` → **superficie clara, filas accionables** (tú actúas sobre hechos).
- Naturaleza `juicio`/`generación` → **tinta oscura, texto corto** (el agente habla; nunca un muro de texto).
- Naturaleza `extracción` → **formulario claro** pre-rellenado (el dato es tuyo en cuanto lo tocas).
- Ciclo `efímera` → confirmar/descartar con **igual peso** (nunca auto-aplicar — invariante + AI Act).

## 4.3 Los 6 patrones vivos

Los seis patrones que existen hoy en el producto, clasificados y con su componente canónico. **No se crean patrones nuevos fuera de esta lista sin spec de esta pista.**

| # | Patrón | Ejes (inicia / alcance / naturaleza / ciclo) | Piel | Componente |
|---|---|---|---|---|
| P1 | **Bandeja de hechos** | proactiva · módulo · hecho · persistente-triage | Claro, filas accionables (borde-izq de color por tipo) | `SignalCard`/`InboxItem` (promover) |
| P2 | **Panel de juicios con triage** | proactiva · módulo · juicio · persistente-triage | **Tinta**, texto corto + acción/triage | `AgentPanel` + `InsightCard` |
| P3 | **Bloque generador** | invocada · entidad · generación · efímera | Tinta (borrador/rationale) → salida a campos claros | `GeneratorBlock` (B-6) |
| P4 | **Propuesta por campos** | invocada · entidad · extracción/generación · efímera | Claro, formulario + franja de procedencia | `ProposalFrame` (B-3) + `FieldProposal` (B-7) |
| P5 | **Panel de análisis** | invocada · entidad · juicio + hecho · efímera/persistida | **Tinta**, síntesis + desglose determinista | `AgentPanel` + `FitBreakdown` (§4.5b) |
| P6 | **Copilot de revisión** | invocada · módulo · hecho comparativo + síntesis · efímera | **Tinta**, resumen 2 líneas + solo lo comparativo | `FindingGroup`/`FindingRow` (B-5) |
| — | **Asistente (drawer)** | invocada · cross-módulo · todo · conversacional | Drawer derecho (Ola 2) | `AssistantDrawer` (B-4) |

Las cuatro superficies canónicas del doc de origen (S1 Acción, S2 Propuesta, S3 Señal, S4 Asistente) siguen vigentes como **momentos**; los 6 patrones son su **encarnación concreta** en pantalla (S1→P3/P4, S2→P4/P5, S3→P1/P2, S4→drawer, y P6 es el copilot = S1-acción "Anotar" → S2-narrativa filtrada por la regla anti-redundancia).

## 4.4 Procedencia — siempre visible

`AgentBadge` (B-1) en toda superficie: `IA` (hubo LLM) · `Heurística` (fallback) · `Estimación` (mock). El `Heurística` **nunca se oculta** (anti-patrón #7). Ola 1 ya lo cableó — ver §6.

## 4.5 Resolución de los 3 conflictos

**(a) Colisión de nombre "Sugerencias del agente".** Aparecía en el dashboard (juicios proactivos) **y** en ofertas (generador). Se separan los nombres user-facing definitivos, uno por patrón:

| Patrón | Nombre user-facing definitivo | Dónde |
|---|---|---|
| P1 Bandeja | **"Requiere tu atención"** | Dashboard (claro) |
| P2 Juicios | **"Sugerencias del agente"** | Dashboard (oscuro) — **dueño único del nombre** |
| P3 Generador | **"Redacción asistida"** (título del bloque) + botón "Redactar con IA" / "Mejorar la oferta" | Nueva oferta, checklist onboarding |
| P4 Propuesta | franja **"Extraído por IA — revisa y confirma"** / **"Redactado por IA…"** | CV, oferta |
| P5 Análisis | **"Análisis del agente"** | Ficha de candidato |
| P6 Copilot | **"Revisión de la corrida"** | Pay-run |
| Drawer | **"Asistente"** | Global (Ola 2) |

Regla: **"Sugerencias del agente" queda reservado a P2** (el riel proactivo del dashboard). Ningún otro patrón usa esa etiqueta.

**(b) Desglose de fit — canoniza el determinista, retira las barras 0–10.** El panel de análisis (`candidate-analyzer-panel.tsx`) pinta hoy tres barras **subjetivas 0–10** (Skills / Experiencia / **Liderazgo**) inventadas por el LLM — "Liderazgo" no existe en el scoring y el número que ordena el pipeline **no** debe depender de un LLM. Se **retiran**. El desglose canónico es el **determinista de `lib/fit-score.ts`**: **60% skills · 25% experiencia · 15% ubicación**, con **matched/missing** explícitos. Componente `FitBreakdown` `[PROPUESTO]`:

- Barra por eje con su **peso** rotulado (60/25/15) y su aporte real.
- Skills como **chips**: `matched` (fondo `success-bg`) vs `missing` (fondo `danger-bg`, tachado o con "falta").
- El LLM sigue aportando la **lectura cualitativa** (summary, gaps, preguntas) en tinta — pero el **número y su desglose son deterministas y explicables**. La franja del panel lleva `AgentBadge` para la parte de juicio; el desglose no necesita badge (es hecho).

**(c) B-5 reencuadrado — el copilot solo muestra lo comparativo-temporal.** El copilot de payroll (P6) muestra **exclusivamente**:
1. **Resumen de 2 líneas** (`fallbackSummary` o el redactor LLM) — la síntesis que ordena.
2. **Findings comparativo-temporales**: `variation` (bruto vs mes anterior), `new_in_run` (alta), `missing_from_run` (baja). Eso es lo que la tabla **no puede** mostrar.
3. Los flags **ya visibles en la tabla** (`bank_issue`, `salary_change`, `no_profile` → `AlertIcon` + contador "Incidencias" + sección "sin línea") se colapsan en **una línea de enlace**: "N incidencias marcadas en la tabla ↓" que hace scroll/filtra la tabla. **No se relistan.**

Esto requiere una nota mínima a pista A (dato, no diseño): `computeRunFindings` ya distingue los `kind`; el corte es **de presentación** — B-5 filtra por `kind ∈ {variation, new_in_run, missing_from_run}` para bullets, y agrega el resto en el contador de enlace.

## 4.6 Ciclo de vida de un panel invocado — colapsar, no cerrar (ratificada)

Pista A implementó el ciclo de vida de las superficies invocadas (P3, P5, P6) y **lo ratifico como regla del DS**. Un panel de agente que el usuario invocó no se **descarta**: se **colapsa**, y sus datos **persisten**.

**Contrato:**
1. **Toggle único.** Un solo control «Ver menos / Ver más» (no un botón cerrar + un botón reabrir). El agente no tiene un estado «cerrado» — tiene expandido y colapsado.
2. **Colapsado = barra fina.** Al colapsar, el panel deja una **barra de una línea** con: icono sparkle + **título** (el nombre user-facing del patrón, §4.5a) + **`AgentBadge`** de procedencia + **conteo** de lo que contiene («3 variaciones», «Fit 82», «6 campos»). La barra es la promesa de que el trabajo sigue ahí, sin ocupar la pantalla.
3. **Persistencia hasta salir de página.** El contenido generado **sobrevive** a colapsar/expandir mientras el usuario siga en la vista. No se recomputa al re-expandir: expandir es gratis e instantáneo.
4. **Re-invocar = datos frescos.** Volver a pulsar el disparador (`AgentActionButton`) **sí** relanza el especialista y **reemplaza** el contenido. Distinción dura: **expandir ≠ re-invocar.** El toggle nunca golpea la API; el disparador siempre sí.
5. **Al salir de la página, se descarta.** No hay persistencia entre navegaciones (un análisis es del momento). Al volver, el panel arranca en reposo — el disparador, sin contenido.

Por qué importa: separa «guardar sitio» (barato, local) de «pedir a la IA» (caro, con procedencia). El usuario nunca pierde una propuesta por plegar la UI, y nunca dispara el modelo sin querer.

**¿Aplica a P5 (panel de análisis del candidato)?** — **Sí, decisión tomada.** Hoy P5 está **siempre expandido** en la ficha; se alinea al mismo ciclo. Colapsado, su barra fina muestra `sparkle · "Análisis del agente" · AgentBadge · "Fit 82"`. Justificación: el análisis compite por espacio con el resto de la ficha (historial, notas, pipeline), y el `FitBreakdown` determinista ya deja el número visible en la tabla de candidatos — el panel es profundidad opcional, no permanente. Excepción: si el análisis **aún no se ha invocado**, no hay barra — solo el disparador (mismo reposo que P3/P6). La barra fina existe únicamente cuando hay contenido que preservar.

---

# 5 · Accesibilidad — mínimos `[PROPUESTO]`

La app tiene hoy **0 `aria-*` y 0 `htmlFor`** (Auditoría §M6). Mínimos para código nuevo y para la migración de la Fase 3:

1. **Labels:** todo input con `<Label htmlFor>` o `aria-label`. Modelo: `cv-profile-fields.tsx`.
2. **Botones de icono:** `aria-label` obligatorio (Bell, Help, kebabs, cierres).
3. **Focus visible:** `focus-visible` en todo elemento clicable (§1.7), no solo inputs.
4. **Hit targets ≥ 44px** en móvil, **≥ 40px** en desktop (nav, botones `sm`, sub-items del sidebar hoy incumplen).
5. **Teclado:** todo `onMouseEnter` con estado ↔ `onFocus`. Diálogos con focus-trap (radix ya lo da).
6. **Contraste:** `soft #79746B` sobre `surface` pasa AA para texto ≥ `body`; **no** usar `soft` para texto `micro` crítico. Revisar `agent-soft #8C877E` sobre `agent-bg` (roza AA).
7. **Piso tipográfico:** `micro` 9.5px solo para etiquetas no esenciales; nada accionable por debajo de `meta` 10.5.

Objetivo de referencia: EN 301 549 si se vende en Europa. La mayoría se resuelve "casi gratis" al pasar inline → componentes (§M6).

---

# 9 · Decisiones — resueltas (2026-07-12)

Lote cerrado por Michael. Ya incorporadas al cuerpo del documento.

**D1 · Procedencia e icono de IA → sin violeta.** La voz del agente es **lima sobre tinta**; procedencia con **`brand` (IA) · `warning` (heurística) · `secondary` (estimación)** e **icono único = sparkle de 4 puntas** (la varita se retira). El "violeta/brand" del doc de superficies queda **enmendado** por coherencia con el producto real. → §1.1, §1.8, Anexo B-1.

**D2 · Hit target → 40px.** `Button` `default`→40px, `sm`→36px (solo desktop), `xs` acotado para toolbars densas. Cierra deuda a11y §M6. → §2.5, §5.

**D3 · Eyebrow → regla simple.** Si no es Reclutamiento, Payroll ni Ajustes, el eyebrow es `"Personas"`. Empleados, Organigrama, Ausencias, Calendario, Horas y Banco de horas → `"Personas"`. → §2.1.

**D4 · Responsive → desktop-first.** Se mantiene solo el corte móvil (`<768`); no se abre doctrina tablet por ahora. → §1.9.

**D5 · Dark mode → premio de la tokenización.** No en paralelo; objetivo post-Fase 3, cuando el DS lea `var(--token)`. → §1.10.

---

# 6 · Revisión de la Ola 1 implementada

Revisados los 4 componentes (`agent-badge`, `agent-action-button`, `proposal-frame` + `icons`) y la primera superficie nueva (copilot de payroll). **Veredicto: los 3 primitivos aprueban tal cual; el copilot necesita reencuadre — no es fallo del primitivo, es aplicación de patrón.**

## 6.1 Primitivos — ✅ fieles al blueprint

- **`AgentBadge`** (`ui/agent-badge.tsx`) — correcto: D1 aplicado (`ia`=brand, sin violeta), variantes light/dark, `heuristica` nunca oculta. Nota menor: documenta el comentario `#7` como está. Sin cambios.
- **`AgentActionButton`** (`ui/agent-action-button.tsx`) — correcto: `Button variant="soft"`, sparkle único importado de `ui/icons`, `aria-busy`, gerundio en `busyLabel`. ✅ El sparkle de 4 puntas es ya el único (la varita salió). Sin cambios.
- **`ProposalFrame`** (`ui/proposal-frame.tsx`) — correcto: franja de procedencia + confirmar/descartar con igual peso, `rationale` con borde-izq, `aria-label` en el cierre. Sin cambios. _Añadir a futuro (no bloqueante): soportar `provenance="estimacion"` para propuestas sobre datos mock._

## 6.2 Copilot de payroll (P6) — ⚠ reencuadrar por la regla anti-redundancia

El disparador (`AgentActionButton "Anotar corrida"`) y la piel oscura (`AgentPanel` + `AgentBadge onDark`) son correctos. El problema es **qué se lista dentro**: hoy `pay-run-detail.tsx:733-751` mapea **todos** los `review.findings` como bullets — incluidos `bank_issue`, `salary_change` y `no_profile`, que la tabla de Empleados **ya** marca con `AlertIcon` (`:820-828`), ya cuenta en la tira "Incidencias" (`:625`) y ya lista en la sección "sin línea". Eso es exactamente la redundancia que generó el feedback.

**Correcciones (aplicar B-5, §4.5c):**
1. Filtrar los bullets a `kind ∈ {variation, new_in_run, missing_from_run}` — lo único comparativo-temporal que la tabla no puede mostrar.
2. Colapsar el resto (`bank_issue`/`salary_change`/`no_profile`) en **una línea de enlace** "N incidencias marcadas en la tabla ↓" que hace scroll/filtra la tabla Empleados. No relistar.
3. Mantener el resumen de 2 líneas arriba (ya está — `review.summary`).
4. Encabezar el panel como **"Revisión de la corrida"** (nombre definitivo §4.5a), no "anotaciones".
5. Regla de reposo: el panel **solo aparece tras invocar** "Anotar corrida" — ✅ ya es así (`review && …`). Mantener; nunca permanente.

Resultado esperado: de ~10 bullets densos (mitad duplicados) a **resumen + 2-3 variaciones + 1 enlace** — corto, no redundante, accionable. Es el caso de prueba de la doctrina §4.1.

## 6.3 Deuda transversal detectada en la Ola 1

- `candidate-analyzer-panel.tsx` **aún no migrado**: sigue con las barras 0–10 (Skills/Experiencia/**Liderazgo**) y su propia pill "heurístico" inline. Migrar a `AgentBadge` + `FitBreakdown` determinista (conflicto b, §4.5b). Es la siguiente pieza de la ola.
- Confirmar que la varita (`M5 19l1-4…`) se retiró de `job-form.tsx`, `onboarding-panel.tsx`, `dashboard-client.tsx` — el grep de A-3 seguía encontrándola en el snapshot auditado.

---

# 7 · Revisión de implementaciones nuevas — gate (2026-07-13)

Revisadas 4 piezas que pistas A/B implementaron desde blueprints. **Veredicto global: las 4 pasan el gate.** Ninguna requiere corrección bloqueante; anoto 3 notas menores, todas no-bloqueantes.

## 7.1 `generator-block.tsx` (B-6, pista B) — ✅ pasa

Fiel al blueprint: panel de tinta, sparkle lima, título "Redacción asistida", `AgentBadge onDark`, `idle/busyLabel` configurables para las dos voces ("Redactar con IA" / "Mejorar la oferta"), `children` para los controles de intención. El disparador usa `AgentActionButton variant="brand"` (no `soft`).
- **Nota (no bloqueante):** el disparador **no** pasa `onDark`, y es correcto — `onDark` en `AgentActionButton` solo re-estiliza cuando `variant="soft"`; con `brand` es un no-op y el teal con borde ya lee bien sobre tinta. La decisión está documentada en el propio comentario del archivo. Sin cambios.

## 7.2 `field-proposal.tsx` (B-7 base, pista B) — ✅ pasa

Réplica exacta del blueprint base: `differs`/«usar sugerencia», `Input` DS, `rationale`, `disabled` en cascada. Correcto.
- **Nota:** cubre solo el caso escalar. El rail de ofertas necesita además **`FieldProposalRange`** (banda salarial) y **`FieldProposalMulti`** (requisitos) — entregados hoy en **B-7b/B-7c**. No es un defecto de esta pieza; es la ampliación que faltaba.

## 7.3 `fit-breakdown.tsx` (§4.5b, pista B) — ✅ pasa, ejemplar

La mejor de las cuatro. Determinista de punta a punta: consume `FitExplanation` de una capa `lib/fit-explain.ts` (pista A añadió el `explain` sobre `fit-score.ts` — exactamente el desacople correcto), **sin `AgentBadge`** (es hecho, no juicio), pesos 60/25/15 rotulados, chips `matched` (verde) / `missing` (coral, tachado). Va más allá del blueprint con acierto: veredicto de ubicación legible, detalle de años de experiencia, y manejo de los modos `sin-requisitos`/`texto`. Las barras subjetivas 0–10 quedan retiradas. Sin cambios.
- **Nota (no bloqueante):** vive en `#26241F` (agent-surface) dentro del panel; cuando se envuelva en `AgentPanelShell` (B-5b) para el ciclo de vida §4.6, el `count` colapsado será `"Fit " + score`.

## 7.4 `agent-action-button.tsx` — addendum B-2 (pista A) — ✅ pasa

Los 5 fit-gaps del addendum están todos, fieles: `disabled` separado de `busy` (`isDisabled = busy || disabled`), `gatedReason` como `title` accesible (solo cuando disabled y no busy — correcto), `tone="minimal"` (botón-texto Space Mono, sin píldora), `onDark` (acento lima), `size="xs"`. La afordancia gated y el spinner/gerundio funcionan.
- **Nota (no bloqueante):** en `tone="solid"`, `onDark` re-estiliza vía `className` **solo** si `variant="soft"`; con `variant="brand"` + `onDark` no hay tratamiento especial (innecesario — brand lee sobre tinta). Comportamiento aceptable y coherente con 7.1. Si algún día se quiere un brand más luminoso sobre tinta, sería una variante nueva, no un fix.

**Cierre del gate:** las 4 quedan **aprobadas para uso**. Lo único pendiente de la familia es migrar `candidate-analyzer-panel.tsx` para que **consuma** `FitBreakdown` (hoy sigue con las barras viejas — §6.3), y envolver P3/P5/P6 en `AgentPanelShell` (B-5b) para el ciclo de vida §4.6.

---

# Anexo A · Inventario de inconsistencias (backlog de migración)

Ordenado por gravedad. `archivo:línea` para grep directo. Alimenta H5/M6/L5 de la Auditoría.

**A-1 · Píldoras / badges divergentes (4 sistemas).**
- `components/ui/badge.tsx` — canónico.
- `components/role-badge.tsx:3-6` — colores **fuera de escala** (`#E6F1EC`,`#2C7A5E`,`#FAE3DE`,`#C7402E`).
- `components/fit-badge.tsx:6-7` — semáforo propio.
- `components/features/inbox-item.tsx:145` · `dashboard-client.tsx:436` — chips inline.
→ Unificar en `<Pill>` (§2.6).

**A-2 · Radios fuera de escala + card reescrita inline.** (escala válida: 8/11/14/18)
- `Card panel` = 16 fuera de escala: `components/ui/card.tsx:16`.
- Radios inline `10/12/13/15/16`: `interview-panel.tsx:218,421,496`, `career-site-editor.tsx:288,338`, `channels-view.tsx:273,331`, `pay-run-detail.tsx:230,371`, `compensation-panel.tsx:439`, `absence-settings-panel.tsx:1135`, y decenas más (grep `borderRadius: "1[0235]px"`).
- Patrón card `surface+1px line+radius14+pad` reescrito inline en ~15 features (`pay-run-detail`, `pay-profile`, `channel-planner`, `interview-panel`, `notes-panel`, `job-form`, `onboarding-panel`…).
→ `<CardShell>` (§2.2), radios a escala.

**A-3 · Superficies de IA — procedencia e icono incoherentes.**
- Heurística mostrada de 3 formas: `cv-parser-panel.tsx:128-130` (`<Badge secondary>`), `candidate-analyzer-panel.tsx:103-106` (pill amber inline), `channel-planner.tsx:457-458` (pill amber inline distinto). **Oculta** en `cv-validation-modal.tsx:40` (solo muestra badge si `ok`).
- Dos iconos de IA: sparkle `cv-parser-panel.tsx:16` vs varita `candidate-analyzer-panel.tsx:99`, `dashboard-client.tsx:354`, `job-form.tsx:196`, `onboarding-panel.tsx:80`.
- Radius de panel de agente divergente: `agent-hint.tsx` 16 · `candidate-analyzer-panel.tsx:90` 18 · `channel-planner.tsx:469` 14 · `job-form.tsx:192` 16.
→ `AgentBadge` (B-1) + sparkle único + `AgentPanel` con radius fijo.

**A-4 · Tipografía divergente.**
- Título de página 28 (`page-header.tsx:27`) vs 30 (`dashboard-client.tsx:196`).
- Card-title 13–16 según pantalla (Auditoría §L5).
- `fontFamily` inline ×506 (254 Archivo + 252 Space Mono, §H5).
→ Escala §1.2, clases `font-display/mono`.

**A-5 · Tres sistemas de botón.**
- `.btn-primary`/`.btn-secondary` **muertos** en `globals.css:77-94` → borrar.
- 188 `<button>` inline en 35 archivos (§M6) rehaciendo sombra dura.
→ `Button` cva único (§2.5).

**A-6 · EmptyState fuera de lenguaje.**
- `components/empty-state.tsx` usa clases shadcn genéricas; features rehacen inline: `absence-panel.tsx:569`, `pay-profile.tsx:403`, `interview-panel.tsx:302`, `channels-view.tsx:348`, `compensation-panel.tsx:472`.
→ Reescribir al patrón dominante (§3.3).

**A-7 · Objetos-token locales duplicados (≥10) + a11y de shell.**
- Cada feature redefine su propio `const T/S/MT = { ink:"#1A1A17"… }`: `dashboard-client.tsx:14`, `pay-run-detail.tsx:12`, `pay-profile.tsx:13`, `payroll-dashboard.tsx:12`, `compensation-panel.tsx:16`, `compliance-settings-panel.tsx:12`, `time-tracking-panel.tsx:21`, `new-run-dialog.tsx:9`, `career-site-editor.tsx:21,186`, `employee-multi-select.tsx:6`.
- Nav hit targets ~30px y botones de topbar sin `aria-label`: `app-shell.tsx` (nav item `globals.css:127`, sub-items `:365`, topbar botones Bell/Help).
→ Importar tokens del DS; §5 a11y.

**A-8 · Duplicación de helpers (contexto DS).**
- `AVATAR_PALETTES`/`avatarPalette` ×6, `initials()` ×4 (§M4). → `<Avatar>` (§2.11).

**A-9 · Componentes muertos.**
- `components/ui/table.tsx`, `components/ui/progress.tsx` (0 imports), `AgentHint` (`agent-hint.tsx`) → borrar (§L1).

---

# Anexo B · Blueprints — componentes de superficie de IA

Listos para que A/B los implementen literal. Código de referencia en TSX (stack real). Cada uno: anatomía · tokens · estados · código.

**Estado:** B-1/B-2/B-3 ✅ implementados en Ola 1 (revisión §6). **B-5** (FindingGroup) es el fix inmediato del copilot; **B-6** (GeneratorBlock) y **B-7** (FieldProposal) canonizan lo que ya funciona en Nueva oferta; **B-4** (AssistantDrawer) es Ola 2. Orden sugerido: **B-5 (fix copilot) → B-6/B-7 + migrar candidate-analyzer con FitBreakdown → B-4**.

| | Blueprint | Patrón | Estado |
|---|---|---|---|
| B-1 | AgentBadge | procedencia (transversal) | ✅ Ola 1 |
| B-2 | AgentActionButton | S1 · Acción | ✅ Ola 1 |
| B-3 | ProposalFrame | P4 · Propuesta | ✅ Ola 1 |
| B-4 | AssistantDrawer | drawer · Ola 2 | pendiente |
| B-5 | FindingGroup/FindingRow | P6 · Copilot | **fix ahora** |
| B-6 | GeneratorBlock | P3 · Generador | nuevo |
| B-7 | FieldProposal | P4 · Propuesta granular | nuevo |
| B-8 | ModuleAssistantEntry | entrada de módulo → drawer | nuevo (Ola 2) |

## B-1 · AgentBadge — procedencia

**Qué es:** la píldora de honestidad. Declara de dónde viene un resultado: `IA` (hubo LLM), `heurística` (fallback determinista), `estimación` (dato mock). Desbloquea la coherencia de todas las superficies. Vive donde vive el resultado (cabecera de panel, junto al título de propuesta).

**Anatomía:** píldora `r-full`, Space Mono 700, 10.5px, uppercase, `padding 3px 10px`, con punto/sparkle de 6px a la izquierda opcional.

**Tokens/variantes:**
| kind | fondo | texto | sobre panel oscuro |
|---|---|---|---|
| `ia` | `brand-soft #DCEFE4` | `brand #0E5C4A` | fondo `rgba(198,242,78,.12)`, texto `lime`, borde `rgba(198,242,78,.3)` |
| `heuristica` | `warning-bg #F8E7C4` | `warning #946312` | fondo `rgba(224,162,60,.12)`, texto `#E0A23C`, borde `rgba(224,162,60,.3)` |
| `estimacion` | `surface-2 #F8F4EB` | `soft #79746B` | fondo `rgba(255,255,255,.06)`, texto `agent-soft` |

**Estado clave:** `heuristica` **nunca se oculta** (invariante anti-patrón #7). Si no hubo LLM, se dice.

```tsx
type AgentProvenance = "ia" | "heuristica" | "estimacion";

const LABEL: Record<AgentProvenance, string> = {
  ia: "IA", heuristica: "Heurística", estimacion: "Estimación",
};
// on = sobre panel oscuro (voz del agente); off = sobre papel
const STYLE: Record<AgentProvenance, { light: React.CSSProperties; dark: React.CSSProperties }> = {
  ia:         { light: { background: "#DCEFE4", color: "#0E5C4A" },
                dark:  { background: "rgba(198,242,78,.12)", color: "#C6F24E", border: "1px solid rgba(198,242,78,.3)" } },
  heuristica: { light: { background: "#F8E7C4", color: "#946312" },
                dark:  { background: "rgba(224,162,60,.12)", color: "#E0A23C", border: "1px solid rgba(224,162,60,.3)" } },
  estimacion: { light: { background: "#F8F4EB", color: "#79746B" },
                dark:  { background: "rgba(255,255,255,.06)", color: "#8C877E" } },
};

export function AgentBadge({ kind, onDark = false }: { kind: AgentProvenance; onDark?: boolean }) {
  return (
    <span
      style={{
        fontFamily: "'Space Mono', monospace", fontSize: "10.5px", fontWeight: 700,
        textTransform: "uppercase", letterSpacing: ".5px", borderRadius: "999px",
        padding: "3px 10px", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: "5px",
        ...(onDark ? STYLE[kind].dark : STYLE[kind].light),
      }}
    >
      {LABEL[kind]}
    </span>
  );
}
```
> Migra: `cv-parser-panel.tsx:128`, `candidate-analyzer-panel.tsx:103`, `channel-planner.tsx:457`, `cv-validation-modal.tsx:40`. **D1 resuelto: `ia` = `brand` (sin violeta).**

## B-2 · AgentActionButton — S1 Acción

**Qué es:** el disparador de un especialista, en el punto de trabajo. Label = **verbo + objeto** (nunca "IA"/"Agente" — el sparkle ya lo dice). Estados: `reposo → pensando`. La pantalla nunca se bloquea; si tarda >2s, aparece skeleton del resultado en su sitio.

**Anatomía:** basado en `Button variant="soft"` + sparkle a la izquierda. En `pensando`, el sparkle muta a `IconSpinner` y el label a gerundio ("Analizando…"); `disabled`.

```tsx
function IconSparkle() { // sparkle canónico de 4 puntas (único icono de IA)
  return (<svg viewBox="0 0 24 24" fill="none" className="size-4" aria-hidden>
    <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z"
      stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>);
}
function IconSpinner() {
  return (<svg viewBox="0 0 24 24" fill="none" className="size-4 animate-spin" aria-hidden>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeDasharray="28 14" strokeLinecap="round" /></svg>);
}

export function AgentActionButton({
  idleLabel, busyLabel, busy, onClick, variant = "soft",
}: { idleLabel: string; busyLabel: string; busy: boolean; onClick: () => void; variant?: "soft" | "brand" }) {
  return (
    <Button variant={variant} size="sm" onClick={onClick} disabled={busy} aria-busy={busy}>
      {busy ? <IconSpinner /> : <IconSparkle />}
      {busy ? busyLabel : idleLabel}
    </Button>
  );
}
```
Uso: `<AgentActionButton idleLabel="Extraer del CV" busyLabel="Analizando CV…" busy={phase==="loading"} onClick={extract} />`.
> Unifica los 5 disparadores actuales (cv-parser, candidate-analyzer, channel-planner, job-writer, onboarding-builder). Regla: vive junto a la acción manual, nunca flotante.

### B-2 · Addendum — fit-gaps de pista B (resueltos)

Tres huecos reales al implementar. Se enmienda el contrato:

**1 · `disabled` separado de `busy` → SÍ (coincido con pista B).** Son dos estados distintos: `busy` = _pensando_ (spinner + gerundio); `disabled`/**gated** = _no puedes invocar aún_ (label en reposo, no interactivo, con motivo). Se añade `disabled?: boolean` + `gatedReason?: string`. Ambos bloquean el click; solo `busy` muta a spinner. Cuando está gated con motivo, el motivo se expone como `title`/tooltip (nunca un botón muerto y mudo — anti-patrón de "por qué no puedo pulsar esto").

**2 · Variante compacta/gated para "Actualizar insights" → SÍ, `size="xs"` + tono `minimal`.** El refresh del riel de sugerencias (`dashboard-client.tsx`) no es un CTA primario: es una acción terciaria dentro de un panel, gated hasta que el usuario triaje las sugerencias abiertas (`canRefresh`). Necesita un tratamiento **compacto** (texto pequeño, sin relleno de botón) y **gated con motivo**. Se añade `size?: "sm" | "xs"` y `tone?: "solid" | "minimal"`. `xs+minimal` = el botón-texto de 10–11px con sparkle/refresh pequeño.

**3 · `onDark` explícito → SÍ; el `soft` actual NO vale sobre tinta.** `variant="soft"` es `brand-soft` sobre papel — dentro de un `AgentPanel` (tinta) se ve mal (bajo contraste, rompe la voz). Se añade `onDark?: boolean` que conmuta al tratamiento oscuro (lima sobre tinta translúcida, como los chips de agente existentes). Regla: **cualquier disparador que viva dentro de un panel oscuro pasa `onDark`**; el `soft`/`brand` claros solo sobre papel.

**Contrato revisado:**
```tsx
export function AgentActionButton({
  idleLabel, busyLabel, busy,
  disabled = false, gatedReason,          // gap 1
  onClick, variant = "soft",
  size = "sm", tone = "solid",            // gap 2
  onDark = false,                         // gap 3
  className,
}: {
  idleLabel: string; busyLabel: string; busy: boolean;
  disabled?: boolean; gatedReason?: string;
  onClick: () => void; variant?: "soft" | "brand";
  size?: "sm" | "xs"; tone?: "solid" | "minimal"; onDark?: boolean; className?: string;
}) {
  const blocked = busy || disabled;

  // tono minimal (acción terciaria dentro de panel): botón-texto, sin relleno
  if (tone === "minimal") {
    return (
      <button
        onClick={onClick} disabled={blocked} aria-busy={busy}
        title={disabled && !busy ? gatedReason : undefined}
        className={className}
        style={{
          display: "inline-flex", alignItems: "center", gap: "5px", background: "none", border: "none",
          padding: 0, cursor: blocked ? "not-allowed" : "pointer", opacity: busy ? 0.6 : 1,
          fontFamily: "'Space Mono',monospace", fontSize: size === "xs" ? "10px" : "11px",
          color: onDark ? (blocked ? "#5A574F" : "#C6F24E") : (blocked ? "#B7C0AE" : "#0E5C4A"),
        }}
      >
        {busy ? <IconSpinner /> : <IconSparkle />}
        {busy ? busyLabel : idleLabel}
      </button>
    );
  }

  // tono solid: el Button del DS. onDark => tratamiento lima-sobre-tinta.
  const darkStyle = onDark
    ? { background: "rgba(198,242,78,.14)", color: "#C6F24E", border: "1px solid rgba(198,242,78,.3)", boxShadow: "none" }
    : undefined;
  return (
    <Button
      variant={variant} size={size === "xs" ? "sm" : size}
      onClick={onClick} disabled={blocked} aria-busy={busy}
      title={disabled && !busy ? gatedReason : undefined}
      style={darkStyle} className={className}
    >
      {busy ? <IconSpinner /> : <IconSparkle />}
      {busy ? busyLabel : idleLabel}
    </Button>
  );
}
```
> Migra el refresh de `dashboard-client.tsx` a `tone="minimal" size="xs" onDark disabled={!canRefresh} gatedReason="Triaje las sugerencias abiertas antes de pedir un análisis nuevo."` — sustituye el botón-texto inline + el tooltip manual (`showUpdateTip`) por el contrato. `size="xs"` remite a la decisión D2 (el `xs` acotado para densidad); no baja de 32px de área táctil real cuando es `solid`.

## B-3 · ProposalFrame — S2 Propuesta (datos editables)

**Qué es:** el marco de revisión de una propuesta con **datos editables** (perfil extraído, oferta, checklist). Form claro del DS pre-rellenado + **franja de procedencia** arriba + confirmar/descartar **con igual peso**. El dato es del usuario en cuanto lo toca → va en claro. (La variante **narrativa** — rationale/plan — usa `AgentPanel` oscuro, no este marco.)

**Anatomía:** `CardShell` claro → franja superior (`AgentBadge` + "Revisa y confirma" + cerrar) → `children` (el formulario, p. ej. `CvProfileFields`) → línea de rationale opcional → fila de acciones (`Confirmar` brand · `Descartar` ghost, mismo peso). Al confirmar → toast de éxito (sistema existente) + outcome capture.

```tsx
export function ProposalFrame({
  provenance, rationale, busy, onConfirm, onDiscard, confirmLabel = "Confirmar y guardar", children,
}: {
  provenance: AgentProvenance; rationale?: string; busy: boolean;
  onConfirm: () => void; onDiscard: () => void; confirmLabel?: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-[14px] border border-line bg-surface p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AgentBadge kind={provenance} />
          <span className="text-xs text-muted-foreground">Revisa y confirma</span>
        </div>
        <Button variant="ghost" size="icon" onClick={onDiscard} disabled={busy} aria-label="Descartar propuesta" className="h-7 w-7">
          <svg viewBox="0 0 24 24" fill="none" className="size-4" aria-hidden><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        </Button>
      </div>

      {children}

      {rationale && (
        <p className="text-xs text-muted-foreground leading-relaxed border-l-2 border-line pl-3">{rationale}</p>
      )}

      <div className="flex gap-2 pt-1">
        <Button variant="brand" onClick={onConfirm} disabled={busy} className="flex-1">
          {busy && <IconSpinner />}{busy ? "Guardando…" : confirmLabel}
        </Button>
        <Button variant="ghost" onClick={onDiscard} disabled={busy}>Descartar</Button>
      </div>
    </div>
  );
}
```
> Extrae el patrón que hoy es `cv-parser-panel.tsx:124-149`. `rationale` cubre la línea "por qué" ("banda salarial por percentil de tus 12 ofertas"). **Nunca** auto-aplicar con countdown/undo (invariante + AI Act): aquí se confirma antes, siempre.

## B-4 · AssistantDrawer — S4 Asistente (Ola 2)

**Qué es:** panel lateral derecho (~400px) — no burbuja, no página. Convive con la pantalla para preguntar *sobre lo que estás mirando*. Invocación: sparkle persistente en topbar · `⌘J` · entradas contextuales que abren el drawer con **chip de contexto** precargado. Motor y packs de tools = pista A; este blueprint es la **piel** (chasis del actual chat de canales, reutilizado).

**Anatomía:**
- **Cabecera:** título + `AgentBadge` global + botón cerrar. Debajo, **chip de contexto** descartable ("Contexto: Corrida Julio 2026") + 2–3 sugerencias del módulo.
- **Hilo:** burbujas — agente en **tinta oscura** (voz S2), usuario en **papel**. Respuestas con números **siempre** enlazan al dato ("ver en Pay Runs →"). **Streaming obligatorio.** `AgentBadge` de procedencia por respuesta.
- **Input** abajo: placeholder contextual, enviar con Enter, `⌘J`/Esc cierra.
- **RBAC visible:** si una tool está fuera de rol, el asistente lo dice ("eso requiere permisos de nómina") — nunca finge no saber.

```tsx
export function AssistantDrawer({
  open, context, onClose, onDismissContext, children /* el hilo */,
}: { open: boolean; context?: string; onClose: () => void; onDismissContext?: () => void; children: React.ReactNode }) {
  return (
    <>
      {open && <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(26,26,23,.35)", zIndex: 60 }} />}
      <aside
        role="dialog" aria-label="Asistente"
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0, width: "400px", maxWidth: "92vw", zIndex: 61,
          background: "#FCFAF6", borderLeft: "1px solid #E7E1D4", boxShadow: "-8px 0 32px rgba(26,26,23,.22)",
          transform: open ? "translateX(0)" : "translateX(100%)", transition: "transform .28s cubic-bezier(.4,0,.2,1)",
          display: "flex", flexDirection: "column",
        }}
      >
        <header style={{ padding: "16px 18px", borderBottom: "1px solid #E7E1D4", display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <IconSparkle />
            <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "15px" }}>Asistente</span>
            <button onClick={onClose} aria-label="Cerrar asistente" style={{ marginLeft: "auto", background: "none", border: "none", color: "#79746B", cursor: "pointer" }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            </button>
          </div>
          {context && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", alignSelf: "flex-start",
              fontFamily: "'Space Mono',monospace", fontSize: "10.5px", color: "#0E5C4A",
              background: "#DCEFE4", borderRadius: "999px", padding: "3px 10px" }}>
              Contexto: {context}
              {onDismissContext && <button onClick={onDismissContext} aria-label="Quitar contexto" style={{ background: "none", border: "none", color: "#0E5C4A", cursor: "pointer", display: "inline-flex" }}>
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>
              </button>}
            </span>
          )}
        </header>
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: "12px" }}>
          {children}
        </div>
        {/* input abajo: mismo estilo que ui/Input, enviar Enter, placeholder contextual */}
      </aside>
    </>
  );
}
```
Burbujas: agente = `background:#1A1A17; color:#F4F0E8; radius: 12px 12px 12px 4px`; usuario = `background:#F4F0E8; border:1px line; radius: 12px 12px 4px 12px`. Migración: al usar el chat de canales, abre este drawer con chip "Canales" precargado; el chat embebido se retira cuando el drawer esté estable (cero regresión).

## B-5 · FindingGroup / FindingRow — copilot de revisión (P6, reencuadrado)

**Qué es:** el cuerpo del copilot de módulo (payroll y futuros). **No** es una lista de todo lo que el detector encuentra: es la aplicación en componente de la **regla anti-redundancia** (§4.1). Vive dentro de `AgentPanel` (tinta), debajo del resumen de 2 líneas.

**Contrato de reparto (la regla, en código):**
- `FindingRow` (bullet en tinta) = **solo** lo comparativo-temporal que la pantalla no puede mostrar: `variation` · `new_in_run` · `missing_from_run`.
- `FindingGroup` = el resto (`bank_issue` · `salary_change` · `no_profile`) **no se relista**: se colapsa en **una línea de enlace** con el conteo, que hace scroll/filtro a la superficie de datos que ya los muestra.

**Anatomía:** resumen (`AgentPanel`, ya existe) → `FindingRow[]` (punto `warning`/`info` + texto 12.5px `agent-text`) → `<LinkedFlagsRow>` ("N incidencias marcadas en la tabla ↓"). Sin acciones dentro del panel salvo ese enlace — **el agente señala, tú actúas en la tabla clara**.

```tsx
import type { ReviewFinding } from "@/lib/payroll/copilot";

const COMPARATIVE = new Set(["variation", "new_in_run", "missing_from_run"]);

function FindingRow({ f }: { f: ReviewFinding }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", marginTop: 6, flexShrink: 0,
        background: f.severity === "warning" ? "#E0A23C" : "#8C877E" }} />
      <span style={{ fontSize: "12.5px", lineHeight: 1.5, color: "#D8D3C8" }}>{f.text}</span>
    </div>
  );
}

/** Aplica la regla anti-redundancia: bullets = comparativo-temporal; el resto → enlace. */
export function FindingGroup({ findings, onJumpToTable }: { findings: ReviewFinding[]; onJumpToTable: () => void }) {
  const bullets = findings.filter((f) => COMPARATIVE.has(f.kind));
  const linkedCount = findings.length - bullets.length; // ya visibles en la tabla

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
      {bullets.map((f, i) => <FindingRow key={i} f={f} />)}
      {linkedCount > 0 && (
        <button
          onClick={onJumpToTable}
          style={{ marginTop: "4px", alignSelf: "flex-start", background: "none", border: "none", cursor: "pointer",
            fontFamily: "'Space Mono',monospace", fontSize: "11px", color: "#C6F24E", display: "inline-flex", alignItems: "center", gap: "5px" }}
        >
          {linkedCount} incidencia{linkedCount !== 1 ? "s" : ""} marcada{linkedCount !== 1 ? "s" : ""} en la tabla ↓
        </button>
      )}
    </div>
  );
}
```
> Reemplaza el `review.findings.map(...)` de `pay-run-detail.tsx:734-751`. `onJumpToTable` fija `tab="empleados"` + resalta las filas con `AlertIcon` (o filtra por incidencia). **Nunca** renderizar los `kind` ya-visibles como bullets. Este es el fix de §6.2.

### B-5b · CollapsedAgentBar — barra fina (ciclo de vida §4.6)

El chasis colapsado de **cualquier** panel invocado (P3/P5/P6), no solo el copilot. Es lo que queda cuando el usuario pulsa «Ver menos». Un solo `<AgentPanelShell>` envuelve el contenido y gestiona el toggle; colapsado, renderiza esta barra.

```tsx
function IconChevron({ open }: { open: boolean }) {
  return (<svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden
    style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }}>
    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>);
}

/** Panel de agente con ciclo de vida §4.6: expandido ↔ barra fina. El contenido
 *  persiste (no se recomputa al expandir). Re-invocar es responsabilidad del
 *  disparador externo, NUNCA de este toggle. */
export function AgentPanelShell({
  title, provenance, count, defaultOpen = true, children,
}: { title: string; provenance: AgentProvenance; count: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div style={{ background: "#1A1A17", color: "#F4F0E8", borderRadius: "16px", overflow: "hidden" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: "9px", background: "none", border: "none",
          cursor: "pointer", color: "inherit", padding: open ? "16px 20px 10px" : "12px 18px", textAlign: "left" }}
      >
        <span style={{ color: "#C6F24E", display: "flex", flexShrink: 0 }}><IconSparkle className="size-4" /></span>
        <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "15px" }}>{title}</span>
        <AgentBadge kind={provenance} onDark />
        {/* el conteo solo se muestra colapsado: expandido, el contenido ya lo dice */}
        {!open && <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "11px", color: "#8C877E" }}>{count}</span>}
        <span style={{ marginLeft: "auto", color: "#8C877E", display: "inline-flex", alignItems: "center", gap: "6px",
          fontFamily: "'Space Mono',monospace", fontSize: "10.5px" }}>
          {open ? "Ver menos" : "Ver más"}<IconChevron open={open} />
        </span>
      </button>
      {open && <div style={{ padding: "0 20px 18px" }}>{children}</div>}
    </div>
  );
}
```
> Envuelve el cuerpo del copilot (`FindingGroup`), del generador (`GeneratorBlock`) y del análisis (`FitBreakdown` + lectura cualitativa). `count` es el resumen de una palabra por patrón: `"3 variaciones"` (P6) · `"Fit 82"` (P5) · `"6 campos"` (P3). Invariante §4.6: **el toggle no llama a la API**; re-invocar cuelga del `AgentActionButton` externo, que reemplaza `children`. Si el patrón aún no se invocó, no se monta este shell — solo el disparador en reposo.

## B-6 · GeneratorBlock — patrón "agente redactor" (P3)

**Qué es:** el patrón de generación de contenido nuevo (redactar/mejorar una oferta, generar un checklist de onboarding). Extraído de lo que ya funciona bien en **Nueva oferta** (`job-form.tsx`, panel oscuro). Dos zonas: el **agente habla en tinta** (rationale/borrador) y su salida **aterriza en campos claros** editables (donde se convierte en dato del usuario).

**Anatomía:** `AgentPanel` (tinta) con sparkle + título "Redacción asistida" (§4.5a) + `AgentBadge` → textarea/prompt corto de intención → `AgentActionButton` ("Redactar con IA" / "Mejorar la oferta") → al responder, el borrador se **inserta en los campos del formulario claro** de abajo (no se queda en tinta). Regenerar mantiene el borrador anterior hasta confirmar el nuevo.

```tsx
export function GeneratorBlock({
  title = "Redacción asistida", provenance, busy, hint, onGenerate, children,
}: {
  title?: string; provenance?: AgentProvenance; busy: boolean; hint?: string;
  onGenerate: () => void; children?: React.ReactNode; /* controles de intención (chips, textarea) */
}) {
  return (
    <div style={{ background: "#1A1A17", color: "#F4F0E8", borderRadius: "16px", padding: "18px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: hint ? "6px" : "12px" }}>
        <IconSparkle /> {/* lima sobre tinta vía color */}
        <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "15px" }}>{title}</span>
        {provenance && <span style={{ marginLeft: "auto" }}><AgentBadge kind={provenance} onDark /></span>}
      </div>
      {hint && <p style={{ fontSize: "13px", lineHeight: 1.55, color: "#8C877E", margin: "0 0 12px" }}>{hint}</p>}
      {children}
      <div style={{ marginTop: "12px" }}>
        <AgentActionButton idleLabel="Redactar con IA" busyLabel="Redactando…" busy={busy} onClick={onGenerate} variant="brand" />
      </div>
    </div>
  );
}
```
> Canoniza `job-form.tsx:192-224` y el bloque equivalente de `onboarding-panel.tsx`. **Regla clave (§4.1):** el resultado no vive en la tinta — se escribe en los campos claros del form, que el usuario edita y confirma. La tinta es el taller; el papel es el entregable. Icono = sparkle único (retira la varita de `job-form.tsx:196`).

## B-7 · FieldProposal — propuesta por campos (P4, granular)

**Qué es:** el refinamiento de `ProposalFrame` para propuestas **campo a campo** donde cada campo propuesto se **acepta o edita individualmente** (la oferta redactada de Nueva oferta: título, descripción, requisitos, banda salarial — cada uno con su "usar sugerencia"). Se apoya en `ProposalFrame` (franja + confirmar/descartar global) y añade la fila por campo.

**Anatomía (por campo):** label → valor propuesto (editable, campo DS) → si difiere del actual, micro-acción "usar" / "descartar" a la derecha + rationale de una línea opcional (`percentil`, `fuente`). El conjunto se envuelve en `ProposalFrame` que da la franja de procedencia y el confirmar global.

```tsx
export function FieldProposal({
  label, value, suggested, rationale, disabled, onUse, onChange,
}: {
  label: string; value: string; suggested?: string; rationale?: string;
  disabled?: boolean; onUse: () => void; onChange: (v: string) => void;
}) {
  const differs = suggested != null && suggested !== value;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs">{label}</Label>
        {differs && !disabled && (
          <button type="button" onClick={onUse}
            className="text-[11px] font-semibold text-[#0E5C4A] hover:underline">
            Usar sugerencia
          </button>
        )}
      </div>
      <Input value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
      {rationale && <p className="text-[11px] text-muted-foreground">{rationale}</p>}
    </div>
  );
}
// Uso: dentro de <ProposalFrame provenance="ia" …>  {campos.map(c => <FieldProposal … />)}  </ProposalFrame>
```
> Extrae el patrón de la oferta redactada (`job-form.tsx`). Regla: **cada campo es editable y su aceptación es explícita** — nada se auto-aplica; el `ProposalFrame` contenedor confirma todo junto (invariante + AI Act). `rationale` cubre "banda salarial por percentil de tus 12 ofertas previas".

### B-7b · FieldProposal.Range — banda de dos números (salario mín/máx)

**Qué es:** la variante para un campo que es un **rango de dos números** (banda salarial es el caso guía del rail de ofertas). Un solo `differs`/«usar sugerencia» gobierna **ambos** extremos a la vez — la sugerencia es la banda entera, no cada número por separado. Dos `Input` numéricos con un separador, dentro del mismo contrato de fila que la base.

```tsx
export function FieldProposalRange({
  label, value, suggested, unit = "€", rationale, disabled, onUse, onChange,
}: {
  label: string;
  value: [number | "", number | ""];         // [min, max]
  suggested?: [number, number];
  unit?: string;
  rationale?: string;
  disabled?: boolean;
  onUse: () => void;                          // aplica la banda sugerida completa
  onChange: (v: [number | "", number | ""]) => void;
}) {
  const [min, max] = value;
  const differs = suggested != null && (suggested[0] !== min || suggested[1] !== max);
  const set = (i: 0 | 1) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const n = e.target.value === "" ? "" : Number(e.target.value);
    onChange(i === 0 ? [n, max] : [min, n]);
  };
  const invalid = min !== "" && max !== "" && Number(max) < Number(min);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs">{label}</Label>
        {differs && !disabled && (
          <button type="button" onClick={onUse} className="text-[11px] font-semibold text-[#0E5C4A] hover:underline">
            Usar {unit}{suggested![0].toLocaleString()}–{unit}{suggested![1].toLocaleString()}
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Input type="number" inputMode="numeric" value={min} disabled={disabled} onChange={set(0)} aria-label={`${label} mínimo`} aria-invalid={invalid} />
        <span className="text-muted-foreground text-xs shrink-0">—</span>
        <Input type="number" inputMode="numeric" value={max} disabled={disabled} onChange={set(1)} aria-label={`${label} máximo`} aria-invalid={invalid} />
      </div>
      {invalid && <p className="text-[11px] text-[#BD4332]">El máximo no puede ser menor que el mínimo.</p>}
      {rationale && !invalid && <p className="text-[11px] text-muted-foreground">{rationale}</p>}
    </div>
  );
}
```
> La «sugerencia» es atómica: aceptar aplica ambos extremos. Validación `max ≥ min` con `aria-invalid` (patrón §2.7). El `rationale` es el sitio natural para "percentil de tus 12 ofertas".

### B-7c · FieldProposal.Multi — lista de chips añadibles/quitables (skills)

**Qué es:** la variante para un campo que es una **lista** (skills/requisitos de la oferta). El agente propone un set; el usuario **quita** los que no encajan (× en el chip) y **añade** los suyos (input + Enter). «Usar sugerencia» rellena la lista con la propuesta; a partir de ahí es edición libre. Los chips propuestos-y-aún-no-tocados pueden marcarse para que se vea qué vino del agente.

```tsx
export function FieldProposalMulti({
  label, value, suggested, rationale, disabled, onUse, onChange,
}: {
  label: string;
  value: string[];
  suggested?: string[];
  rationale?: string;
  disabled?: boolean;
  onUse: () => void;                          // value := suggested
  onChange: (v: string[]) => void;
}) {
  const [draft, setDraft] = React.useState("");
  const differs = suggested != null && suggested.join("\u0001") !== value.join("\u0001");
  const add = () => {
    const t = draft.trim();
    if (t && !value.includes(t)) onChange([...value, t]);
    setDraft("");
  };
  const remove = (s: string) => onChange(value.filter((x) => x !== s));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs">{label}</Label>
        {differs && !disabled && (
          <button type="button" onClick={onUse} className="text-[11px] font-semibold text-[#0E5C4A] hover:underline">
            Usar sugerencia ({suggested!.length})
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5 rounded-[11px] border-[1.5px] border-line bg-paper p-2 min-h-9">
        {value.map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5 text-xs font-semibold bg-brand-soft text-brand rounded-full pl-2.5 pr-1.5 py-1">
            {s}
            {!disabled && (
              <button type="button" onClick={() => remove(s)} aria-label={`Quitar ${s}`} className="text-brand/60 hover:text-brand flex items-center">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>
              </button>
            )}
          </span>
        ))}
        {!disabled && (
          <input
            value={draft} onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
            onBlur={add}
            placeholder={value.length ? "Añadir…" : "Añade una skill y pulsa Enter"}
            aria-label={`Añadir a ${label}`}
            className="flex-1 min-w-[120px] bg-transparent text-sm outline-none px-1"
          />
        )}
      </div>
      {rationale && <p className="text-[11px] text-muted-foreground">{rationale}</p>}
    </div>
  );
}
```
> Reusa el chip `brand-soft` del contrato (§2.6) y el patrón de skills de `cv-profile-fields.tsx:194`. Añadir por Enter **o** blur; sin duplicados. `onUse` es "acepta el set del agente"; a partir de ahí toda edición es del usuario. Para el rail de ofertas, `FieldProposalRange` (banda) y `FieldProposalMulti` (requisitos) conviven dentro del mismo `ProposalFrame` que ya da la franja de procedencia y el confirmar global.

## B-8 · ModuleAssistantEntry — entrada de módulo al asistente

**Qué es:** cómo queda una pestaña/módulo **cuando se retira su chat embebido** y la conversación se muda al `AssistantDrawer` (B-4). Caso guía: la pestaña **Canales**, que hoy tiene un chat propio (thread + burbujas + input ocupando el área) y pasa a mostrar su analítica a plena anchura + un **lanzador** que abre el drawer con el **chip "Canales" precargado**. El vertical es un **chip, no otro chat** (invariante S4). Reutilizable por cualquier módulo (payroll, candidatos…).

**Qué cambia en la pestaña:**
- **Se retira:** el panel de chat embebido (thread/burbujas/input) de `channels-view.tsx`. Su historial migra al hilo del drawer; el motor pasa a ser el asistente global con el **pack de tools de canales** (cero regresión: mismas preguntas, un solo cerebro).
- **Queda:** la analítica del módulo a plena anchura + un `ModuleAssistantEntry` — lanzador compacto, **no** un chat. La redirección muere: preguntar = abrir el drawer ya contextualizado.

**Anatomía del lanzador** (superficie clara — es una acción, no voz del agente): fila/tarjeta con sparkle + "Pregunta sobre tus canales" + 2–3 **chips de sugerencia** (prompts profundos del módulo). Click en el lanzador → drawer vacío con chip. Click en una sugerencia → drawer con chip **y** esa pregunta como primer turno (o sembrada en el input). El mismo componente alimenta el link "Preguntar al asistente" de las cabeceras de módulo (S4).

```tsx
// Abre el AssistantDrawer global (contexto + semilla opcional). El estado del
// drawer vive en un provider de app (pista A); aquí solo se dispara.
export function ModuleAssistantEntry({
  context,            // etiqueta del chip: "Canales", "Corrida Julio 2026"…
  prompt,             // placeholder del lanzador: "Pregunta sobre tus canales…"
  suggestions,        // 2-3 prompts profundos del módulo
  onOpen,             // (seed?: string) => void  → abre el drawer con chip=context
}: { context: string; prompt: string; suggestions: string[]; onOpen: (seed?: string) => void }) {
  return (
    <div style={{ background: "#FCFAF6", border: "1px solid #E7E1D4", borderRadius: "14px", padding: "16px 18px" }}>
      <button
        onClick={() => onOpen()}
        style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
      >
        <span style={{ width: "30px", height: "30px", flexShrink: 0, borderRadius: "9px", background: "#DCEFE4", color: "#0E5C4A", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <IconSparkle />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "14px", color: "#1A1A17" }}>Preguntar al asistente</span>
          <span style={{ display: "block", fontFamily: "'Space Mono',monospace", fontSize: "10.5px", color: "#79746B", marginTop: "2px" }}>
            Contexto: {context}
          </span>
        </span>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden><path d="M9 6l6 6-6 6" stroke="#79746B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {suggestions.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "7px", marginTop: "12px" }}>
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => onOpen(s)}
              style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 600, fontSize: "12px", color: "#3A3833",
                background: "#F4F0E8", border: "1px solid #E7E1D4", borderRadius: "999px", padding: "6px 12px", cursor: "pointer" }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```
Uso (Canales): `<ModuleAssistantEntry context="Canales" prompt="Pregunta sobre tus canales…" suggestions={["¿Qué canal trae mejor fit este trimestre?","Compara coste por canal","Canales con más abandono"]} onOpen={(seed) => openAssistant({ context: "Canales", seed })} />`.

> Retiro del chat de `channels-view.tsx`: hacerlo **solo cuando el drawer esté estable** (B-4, Ola 2). Los chips de sugerencia son los que hoy ya existen bajo el input del chat embebido (`thread.png`) — se conservan, cambian de destino. El chip de contexto es **descartable** en el drawer (el usuario ve qué sabe el asistente y puede soltarlo). Ningún módulo abre su propio chat: todos entran por aquí al drawer único.

---

_Fin del documento. Cambios de `components/ui/**`, `tailwind.config.ts`, `app/globals.css` y las superficies de IA pasan por spec o visto bueno de la pista Diseño (brief §Propiedad)._
