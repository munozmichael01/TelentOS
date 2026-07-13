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

`[PROPUESTO]` reescribir `EmptyState` al patrón inline dominante y adoptarlo: tile de icono `r-lg` sobre `brand-soft`/`surface-2` → título `card-title` → descripción `body` soft → acción opcional. Ver §3.3 y Anexo A-6.

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

# 4 · Superficies de IA (resumen)

Principio: **la IA es una voz, no un lugar.** Cuatro superficies canónicas, misma voz visual (tinta invertida = el agente habla; papel claro = dato del usuario). Máximo **una** superficie de agente visible por pantalla en reposo. Detalle y anti-patrones en `handoff/…UX de agentes (sistema de superficies).md`; blueprints implementables en **Anexo B**.

| Superficie | Qué es | Base en código | Componente |
|---|---|---|---|
| **S1 · Acción** | El botón "verbo+objeto" en el punto de trabajo. Reposo→pensando→propuesta. | `cv-parser-panel` (soft+sparkle+spinner) | `AgentActionButton` (B-2) |
| **S2 · Propuesta** | Salida revisable. Narrativa=panel oscuro; datos=form claro + franja de procedencia. | `AgentPanel`, `cv-profile-fields` | `ProposalFrame` (B-3) |
| **S3 · Señal** | Bandeja proactiva. "Requiere tu atención" (claro, hechos) vs "Sugerencias del agente" (oscuro, juicios). | `dashboard-client`, `inbox-item` | `SignalCard` (promover) |
| **S4 · Asistente** | Drawer derecho ~400px, invocado por sparkle topbar / ⌘J / entradas contextuales con chip. | chasis del chat de canales | `AssistantDrawer` (B-4) |

**Procedencia siempre visible** — el desbloqueo transversal es `AgentBadge` (B-1): `IA` / `heurística` / `estimación`. Hoy el estado `fallback` se muestra de **tres formas distintas** (o se oculta) — la mayor incoherencia de las superficies de IA. Ver Anexo A-3.

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

Listos para que A/B los implementen literal. Código de referencia en TSX (stack real). Cada uno: anatomía · tokens · estados · código. Orden de construcción: **B-1 → B-2/B-3 → B-4** (el doc de superficies §2).

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

---

_Fin del documento. Cambios de `components/ui/**`, `tailwind.config.ts`, `app/globals.css` y las superficies de IA pasan por spec o visto bueno de la pista Diseño (brief §Propiedad)._
