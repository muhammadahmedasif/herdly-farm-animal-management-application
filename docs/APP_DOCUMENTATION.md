# Herdly — Livestock Management App · Full Documentation

> Purpose of this document: capture **everything** about the current app — architecture,
> data model, business logic, design system, every screen, and the existing UI patterns —
> so it can be **redesigned from scratch** with a much more polished UI while preserving
> feature parity.

---

## 1. Overview

**Herdly** is a livestock/herd management app for dairy farmers (target market appears to be
Pakistan — breeds like Sahiwal, Nili-Ravi; locale `en-GB`/`en-PK`). It lets a farmer:

- Register & manage animals (cows, buffaloes, goats, sheep) with identity, breeding status, age, lactation.
- Track the **reproductive cycle**: Insemination → 45-day pregnancy check → Expected calving → Calving → lactation increment.
- Record **Vaccinations** and **Deworming** with next-due dates.
- See a **home dashboard** with herd stats and alerts.

The app currently runs fully **offline/local** (AsyncStorage). Supabase JS is installed and
types were sketched for a cloud backend, but **no cloud wiring exists yet**.

---

## 2. Tech Stack

| Concern | Choice |
|---|---|
| Framework | Expo SDK 57 (`expo ~57.0.12`), Expo Router `~57.0.12` (file-based routing) |
| UI runtime | React Native `0.86.2`, React `19.2.3` |
| Language | TypeScript `~6.0.3`, `strict: true` |
| Icons | `lucide-react-native` |
| Pickers | `@react-native-picker/picker` (dropdowns), `@react-native-community/datetimepicker` (dates) |
| Toasts | `react-native-toast-message` |
| Persistence | `@react-native-async-storage/async-storage` (local, JSON) |
| Cloud (staged, unused) | `@supabase/supabase-js` (dependency present) |
| Platform support | iOS, Android, Web (`react-native-web`), Metro bundler |
| Image / camera | `expo-image-picker` configured (camera + photo permission), **feature not yet built** |
| Notifications | `expo-notifications` configured (permissions), **feature not yet built** |
| App config | `app.json` — scheme `herdly`, portrait, light mode only, adaptive icon bg `#123B63`, splash bg `#123B63` |
| Scripts | `npm start` / `android` / `ios` / `web` |

---

## 3. Project Structure

```
app/
  _layout.tsx                Root Stack + StoreProvider + Toast + splash
  +html.tsx                  Web-only root HTML (bg flicker guard)
  +not-found.tsx             404 screen
  (tabs)/
    _layout.tsx              Bottom tab bar (Home, Animals; Settings hidden)
    index.tsx                Home / Dashboard
    animals.tsx              Animals list (search + filter chips)
    settings.tsx             Settings (hidden from tabs, still routable)
  animals/
    register.tsx             Register new animal (multi-card form)
    edit.tsx                 Edit animal
    [id].tsx                 Animal detail
  health/
    insemination.tsx         Insemination records + form
    calving.tsx              Calving records + form
    vaccination.tsx          Vaccination records + form
    deworming.tsx            Deworming records + form
components/
  useClientOnlyValue.web.ts  SSR-safe hook (currently unused by screens)
constants/
  Colors.ts                  Design tokens (PARTIALLY used)
  livestock.ts               LEGACY — species/breeds/status constants (NOT imported)
store/
  StoreContext.tsx           Global state (context + reducer + AsyncStorage)
types/
  index.ts                   LIVE canonical types (Animal, Insemination, Calving, ...)
  animal.ts / health.ts / vaccination.ts / deworming.ts   LEGACY — unused
utils/
  date.ts                    LIVE date/age/gestation helpers (timezone-safe)
  useNow.ts                  LIVE ticking "now" hook (ages stay fresh)
  lactation.ts               LIVE effective-lactation + increment helpers
  dateCalculations.ts        LEGACY — date math engine (NOT imported)
  validation.ts              LEGACY — form validators (NOT imported)
  errorMessages.ts           LEGACY — friendly error strings (NOT imported)
```

> **Important:** `types/animal.ts`, `types/health.ts`, `types/vaccination.ts`,
> `types/deworming.ts`, `constants/livestock.ts`, `utils/dateCalculations.ts`,
> `utils/validation.ts`, `utils/errorMessages.ts` are **dead code** from an earlier
> architecture. They reference each other but **no screen imports them**. The live app
> uses `types/index.ts`, `utils/date.ts`, `utils/useNow.ts`, `utils/lactation.ts`,
> `constants/Colors.ts`. A redesign can either revive or delete the dead files.

---

## 4. Design System (Current)

### 4.1 Official tokens — `constants/Colors.ts`

```ts
primary:      '#123B63'   // deep navy (brand)
primaryLight: '#1A5491'
primaryDark:  '#0D2B48'

success: '#22C55E'  successLight: '#DCFCE7'
warning: '#F59E0B'  warningLight: '#FEF3C7'
danger:  '#EF4444'  dangerLight:  '#FEE2E2'
info:    '#3B82F6'  infoLight:    '#DBEAFE'

background:  '#F7F9FC'
card:        '#FFFFFF'
border:      '#E2E8F0'
borderLight: '#F1F5F9'

textPrimary:   '#17324D'
textSecondary: '#64748B'
textMuted:     '#94A3B8'
textWhite:     '#FFFFFF'

surfaceHover: '#F8FAFC'
overlay:      'rgba(0,0,0,0.5)'
tabActive:    '#123B63'   tabInactive: '#94A3B8'   tabBackground: '#FFFFFF'
```

**Problem for redesign:** the token file is only **partially** used. Screens mix hardcoded
Tailwind-style hex values throughout, so the palette is inconsistent (see 4.3).

### 4.2 De-facto design language (what the UI actually looks like)

- **Header treatment:** deep navy `#123B63` screen headers, white bold titles, rounded
  `24px` top corners on the content that sits below (Home, Animals, Settings use a
  `borderTopLeftRadius / borderTopRightRadius: 24` sheet look).
- **Cards:** white, radius `14–24`, soft shadows (`#6366F1` or `#000` at low opacity,
  `elevation 2–8`), generous padding `16–20`.
- **Forms:** grouped into titled "cards" with an icon chip header (`iconBg` 36×36 rounded-12
  square + section header). Inputs are rounded rectangles (`#F9FAFB`/`#F8FAFC` bg,
  `#E5E7EB`/`#E2E8F0` border, radius `12–16`, `14px` vertical padding, bold text).
- **Buttons:** primary = navy pill/rounded (`radius 16–20`, strong shadow, `#fff` text,
  weight 800/900); secondary = white with border; destructive = light red bg `#FEE2E2`
  with `#EF4444` text.
- **FAB:** floating circular navy button, `64–68px`, `+` icon, bottom-right.
- **Segmented toggle:** age entry uses a pill-segmented control (DoB vs Age).
- **Status badges/pills:** colored pill with matching tint bg + colored dot, e.g.
  Pregnant = emerald `#10B981`/`#D1FAE5`.
- **Auto-calc highlight cards:** light indigo `#E0E7FF` cards showing calculated DOB/age;
  green `#D1FAE5` cards for expected-calving previews.

### 4.3 Status color mapping (in `(tabs)/animals.tsx`)

| Status | Color | BG |
|---|---|---|
| Pregnant | `#10B981` | `#D1FAE5` |
| Inseminated | `#3B82F6` | `#DBEAFE` |
| Open | `#F59E0B` | `#FEF3C7` |
| Breeding | `#6366F1` | `#E0E7FF` |
| Non-Breeding | `#6B7280` | `#F3F4F6` |
| Dry | `#8B5CF6` | `#EDE9FE` |
| Calf | `#EC4899` | `#FCE7F3` |

Quick-action colors on Home: Insemination blue `#2563EB`, Calving green `#16A34A`,
Vaccination orange `#EA580C`, Deworming red `#DC2626`.

### 4.4 Inconsistencies a redesign should fix

1. **Multiple background grays:** `#F7F9FC` (token), `#F3F4F6`, `#F0F4F8` all used as screen bg.
2. **Hardcoded hex instead of tokens:** dozens of `#1F2937`, `#6B7280`, `#4B5563`,
   `#E5E7EB`, `#9CA3AF`, `#6366F1` shadows scattered across every file.
3. **Shadow color drift:** some cards shadow `#6366F1`, others `#000`, with varied radii/elevation.
4. **No shared component library** — the same card/input/button/FAB/date-field patterns are
   copy-pasted per screen (7+ near-identical StyleSheet blocks). No reusable `Card`,
   `Field`, `PrimaryButton`, `PickerField`, `DateField`, `StatusPill`, `SectionHeader`, `FAB`.
5. **Emoji icons** in Settings (`🔔📅🌐🛡️ℹ️🐄`) vs lucide SVG icons everywhere else.
6. **Two header styles:** native Stack headers (navy, used by detail/health screens) vs
   custom in-screen headers (Home/Animals/Settings). Visual language differs.
7. **Status colors duplicated** between files (animals.tsx, insemination.tsx) instead of a single map.
8. **Date inputs have 3+ platform renderings** (web `<input type=date>`, Android button+
   picker, iOS inline picker) duplicated inline everywhere — no single `DateField` abstraction.
9. **Home alerts are mock/static** — "You have N vaccination records" — not real due-date alerts.
10. **No images used anywhere** despite `image_url`, `expo-image-picker`, camera config.

---

## 5. Navigation Map

```
Root Stack (app/_layout.tsx)
├── (tabs)                          [header hidden]
│   ├── index      → Home            [tab]  icon: Home
│   ├── animals    → Animals list    [tab]  icon: Beef
│   └── settings   → Settings        (hidden from bar, href:null)
├── animals/register → Register Animal   [navy header "Register Animal"]
├── animals/[id]    → Animal Details     [navy header "Animal Details"]
├── animals/edit    → Edit Animal        [navy header "Edit Animal"]
├── health/insemination → Insemination  [navy header "Insemination"]
├── health/calving      → Calving        [navy header "Calving Register"]
├── health/vaccination  → Vaccination    [navy header "Vaccination"]
├── health/deworming    → Deworming      [navy header "Deworming"]
└── +not-found    → "This screen doesn't exist."
```

All secondary screens get a navy Stack header (`bg #123B63`, white text, weight 700, size 18).
Tab bar: white bg, `#123B63` active tint, height 68 (Android) / 88 (iOS).

---

## 6. Screens (Detailed)

### 6.1 Home / Dashboard — `app/(tabs)/index.tsx`

**Layout:** navy header with "Herdly / Livestock Management" + bell button (red notification
dot, **non-functional**); rounded sheet body (`borderTopLeftRadius/TopRightRadius: 24`).

- **Stats row** (3 cards, each with colored top-border, icon chip, big number, label):
  - Total Animals → `/animals`
  - Pregnant → `/animals?filter=Pregnant`
  - Alerts Due → `/animals` (currently `vaccinations.length + dewormings.length` — a misnomer)
- **"Register New Animal"** button → `/animals/register`.
- **Quick Actions** 2×2 grid of tinted cards:
  - Insemination → `/health/insemination`
  - Calving → `/health/calving`
  - Vaccination → `/health/vaccination`
  - Deworming → `/health/deworming`
- **Alerts** list: 3 static rows ("System" as animal, "You have N … records"), color-coded
  by urgency (`soon` = info blue). Tap → `/animals`.

**Notes for redesign:** stats are real; alerts are **not** — build real due-date alerts
(pregnancy checks due, vaccines/dewormings due/overdue, calving due) from the data.

### 6.2 Animals List — `app/(tabs)/animals.tsx`

- Navy header "Herdly Register".
- **Search bar** (rounded-20 white pill with Search icon) — filters by tag / name / species.
- **Filter chips** (horizontal, pill): `All, Pregnant, Inseminated, Open, Dry, Breeding,
  Non-Breeding, Calf`. Active chip = navy fill. Filter arrives via route param
  (`/animals?filter=...`), so it's URL-shareable.
- **List cards:** navy `cardHead` with "Cattle Name" label + name, and a translucent
  "Tag" pill with tag number; 2×2 info grid (Species+Breed, Sex, Age, DoB); footer status
  pill (tinted bg, colored dot + status + chevron). Tap → `/animals/[id]`.
- **FAB** → `/animals/register`.
- Age/DoB computed live via `formatAge` / `formatDob` + `useNow` (refreshes every 60s).

### 6.3 Animal Detail — `app/animals/[id].tsx`

- Header card: circular avatar placeholder (indigo bg, Tag icon), name, tag, status pill
  (always green — even for non-pregnant; **bug/oddity**).
- **Details card** (2-col rows): Species/Breed, Sex/Color, Current Age/DoB, and for females:
  Lactation (effective, see 6.8) + Last Insemination.
- **Actions:** "Edit Details" (navy) → `/animals/edit?id=...`; "Delete Animal" (light red)
  with confirm Alert.

**Missing (nice-to-have):** history of inseminations/calvings/vaccines for that animal,
photo, offspring/mother links.

### 6.4 Register Animal — `app/animals/register.tsx`

Two cards + save button:

1. **Basic Info** (Tag icon, navy header): Tag Number* (duplicate-checked), Name/Alias,
   Species (Cow/Buffalo/Goat/Sheep picker), Breed*.
2. **Physical Details** (green Info header):
   - Sex (Female/Male picker) — drives dynamic options.
   - **Lactation No.** (females only) with an "Effective lactation" green hint when
     Pregnant/Inseminated.
   - **Age toggle** ("Enter Age" / "Enter Date of Birth"):
     - Age mode: Years + Months inputs → live "Calculated Date of Birth" card.
     - DoB mode: date picker → live "Calculated Age" card.
   - **Status** picker — options depend on sex:
     - Female: `Open, Inseminated, Pregnant, Dry, Other`
     - Male: `Breeding, Non-Breeding, Not Applicable`
   - If **Pregnant / Inseminated**: "Date of Insemination" picker appears, plus a preview
     card: **Expected Calving Date** (green) or **Expected Pregnancy Confirmation** (blue).
   - If **Pregnant and the expected calving date has already passed**: an optional
     **"Register calf with mother"** toggle appears → Calf Name, Calf Tag* (auto-suggested
     from mother tag, e.g. `C-102` → `C-102A`), Calf Sex, and an auto-calc summary card
     (Mother, DoB, Species/Breed, Age-at-birth "0 mo"). Saving creates **two animals**
     (mother + calf).

Validation: tag + breed required, duplicate tag blocked, calf tag required when toggle on.

### 6.5 Edit Animal — `app/animals/edit.tsx`

Mirror of Register (Basic Info + Physical Details) but pre-filled from the record,
age toggle default based on `dob_is_estimated`, duplicate-tag check excludes self,
plus **"Delete Animal"** button. No calf sub-form. Save → `updateAnimal` → back.

### 6.6 Settings — `app/(tabs)/settings.tsx`

- Navy header "Settings"; navy brand card (🐄 emoji, "Herdly", tagline, version badge).
- 5 static rows: Notification Alerts, Health Schedules, Language, Data & Privacy,
  About Herdly. **All non-functional** (no handlers, no routes).
- Hidden from the tab bar (`href: null`) but still routable — **only reachable via deep link**.

### 6.7 Insemination — `app/health/insemination.tsx`

**Form (FAB to open):**
- Select Female Animal (picker) — **duplicate-protected**: if the animal already has an
  active record (`Pending/Inseminated/Pregnant/Repeat`), selection is blocked with a toast.
- **Lactation No.** — read-only, **auto-filled** from the animal's *effective* lactation.
- Date of Insemination (max today).
- Bull ID/Name, Semen Company.
- **Status** picker: `Inseminated, Pregnant, Open, Dry`.
- When Pregnant: green **Expected Delivery Date** preview (AI date + species gestation).
- On save: `pregnancy_check_date` = AI date + **45 days** (`PREGNANCY_CHECK_DAYS`),
  `expected_calving_date` = AI date + gestation; animal `repro_status` synced to the status.

**List:** cards filtered to hide `Open`. Each shows name/tag, effective lactation,
status pill, days-since-insemination, insemination date, pregnancy-check-due date,
and (if Pregnant/Inseminated) expected delivery + pregnancy days. Tap → edit.

### 6.8 Calving — `app/health/calving.tsx`

**Form (FAB to open):**
- **Select Pregnant Mother** *(optional)* — dropdown of animals with `repro_status === 'Pregnant'`;
  empty-state hint if none.
- **Calving Date** *(optional)* — **auto-picked** from the mother's expected delivery date
  (matching Pregnant insemination → its `expected_calving_date`; else AI date + gestation;
  else `last_insemination_date` + gestation; else today). Suppressed while editing an existing record.
- Calf Sex, Calf Name, Calf Tag Number, Weight (kg), Complications, Notes — **all optional**.

**Save (new record):**
- Duplicate calf-tag check (if a tag was entered).
- If calf tag provided → **creates a Calf animal** (species/breed inherited from mother,
  DoB = calving date or today).
- Mother (if selected) → `repro_status: 'Newly Calved'`, `lactation_number` incremented.
- Links `insemination_id` to the matching Pregnant insemination, if any.

**List:** cards with Mother tag, calving date, calf (name/tag + sex), weight, complications.
Tap → edit; delete via destructive Alert.

### 6.9 Vaccination — `app/health/vaccination.tsx`

**Form (FAB):** Select Animal, Vaccine Name*, Date Given (default today), Next Due Date
(default +6 months, min = date given), Administered By, Notes. Save → list.

**List:** cards with animal tag + vaccine name, Given Date, Next Due (amber),
Administered By.

> Web date inputs were recently added (they were missing → dates "not available" on web).

### 6.10 Deworming — `app/health/deworming.tsx`

**Form (FAB):** Select Animal, Product Name*, Dose, Date Given (default today),
Next Due Date (default +3 months, min = date given), Notes. Save → list.

**List:** cards with animal tag + product name, Given Date, Dose, Next Due (red).

---

## 7. Data Model — `types/index.ts` (Live)

```ts
type Species = 'Cow' | 'Buffalo' | 'Goat' | 'Sheep';
type Sex = 'Male' | 'Female';
type ReproStatus = 'Open' | 'Inseminated' | 'Pregnant' | 'Dry' | 'Newly Calved'
                 | 'Breeding' | 'Non-Breeding' | 'Not Applicable' | 'Calf';

interface Animal {
  id; tag_number; name;
  species: Species; breed; sex: Sex;
  date_of_birth: string;            // YYYY-MM-DD (local)
  dob_is_estimated?: boolean;
  color; repro_status: ReproStatus;
  lactation_number?: string;
  last_insemination_date?: string;  // YYYY-MM-DD
  image_url; notes; created_at;
}

interface Insemination {
  id; animal_id; lactation_number;
  ai_date;                          // YYYY-MM-DD
  semen_company; bull_name;
  pregnancy_check_date;             // ai_date + 45d
  pregnancy_status: 'Pending'|'Pregnant'|'Open'|'Repeat'|'Inseminated'|'Dry';
  expected_calving_date;            // ai_date + gestation
  notes; created_at;
}

interface Calving {
  id; animal_id?; insemination_id?;
  calving_date?;                    // YYYY-MM-DD (optional)
  calf_tag?; calf_name?; calf_sex?: Sex; calf_weight_kg?: number;
  complications; notes; created_at;
}

interface Vaccination { id; animal_id; vaccine_name; date_given; next_due_date;
                        administered_by; notes; created_at; }
interface Deworming   { id; animal_id; product_name; date_given; next_due_date;
                        dose_ml; notes; created_at; }
```

**Species gestation days** (`utils/date.ts`): Cow 283 · Buffalo 310 · Goat 150 · Sheep 147.
**Pregnancy check window:** 45 days after AI.

### 7.1 Effective lactation rule (`utils/lactation.ts`)

- `lactation_number` on the animal is the **committed base**.
- While `repro_status === 'Pregnant'` the **effective lactation = base + 1**
  (a future lactation is carried).
- Reverting to Open/Dry automatically drops the extra (derived, nothing to store).
- At calving, the base is **committed permanently** (`incrementLactation` → base + 1)
  and status becomes `Newly Calved`.

---

## 8. State Management — `store/StoreContext.tsx`

- React Context + `useReducer`; persisted to AsyncStorage under keys
  `@herdly/animals | inseminations | calvings | vaccinations | dewormings`.
- **Actions:** LOAD, DONE_LOADING, ADD/UPDATE/DELETE per entity (animals have delete;
  calving has delete; insemination/vaccination/deworming are add+update only).
- On any mutation, the full next array is re-saved to AsyncStorage (simple, fine at this scale).
- Exposes: `animals, inseminations, calvings, vaccinations, dewormings, loading` +
  `addAnimal, updateAnimal, deleteAnimal, addInsemination, updateInsemination,
  addCalving, updateCalving, deleteCalving, addVaccination, addDeworming`.
- **File-local IDs** (`Math.random().toString(36).substring(7)`) — a Supabase migration
  would need ID handling.

> The comments in the file say Supabase swap = "only this file changes"; that's the
> intended seam, but it's not implemented.

---

## 9. Utilities (Live)

- **`utils/date.ts`**
  - `toDateString(d)` / `parseDate(str)` — **local** `YYYY-MM-DD` conversion (never
    `toISOString()`, which shifts a day on UTC+ offset devices — this was a real bug fixed).
  - `addDays(dateStr, n)`, `calculateAge(dob, now)`, `formatAge`, `formatDob`,
    `getGestationDays(species)`, `dateFromAge(years, months, from)` (month-overflow clamped).
- **`utils/useNow.ts`** — returns `Date` and re-renders every 60s so ages/days stay fresh.
- **`utils/lactation.ts`** — `getEffectiveLactation(animal)`, `incrementLactation(current)`,
  `PREGNANCY_CHECK_DAYS = 45`.

---

## 10. Business Logic Flows (source of truth)

1. **Register female** → status `Open`, optional lactation base.
2. **Inseminate** → Insemination record, status `Inseminated`, check-date = +45d,
   expected calving = +gestation; animal `repro_status = Inseminated`.
3. **Confirm pregnant** (via edit status → `Pregnant`) → animal `Pregnant`;
   effective lactation = base + 1 (auto-derived).
4. **Reject / revert** to `Open`/`Dry` → effective lactation returns to base.
5. **Calving** → Calving record (+ optional Calf animal), mother → `Newly Calved`,
   lactation **committed** to base + 1.
6. **Duplicate guards:** unique animal tag; unique calf tag; one active insemination
   per animal.

---

## 11. Validation & UX Messages

Validation is done **inline in each screen** (toast-based), not via the legacy
`utils/validation.ts`:
- Register/Edit: tag + breed required; duplicate tag blocked.
- Insemination: animal + lactation required; duplicate-active-insemination blocked.
- Calving: (mother/date/calf all optional) duplicate calf tag blocked.
- Vaccination/Deworming: animal + name/product required.
- Toasts: `react-native-toast-message` (`success`/`error`/`info`).

---

## 12. Observations for the Redesign

### 12.1 Should keep (strengths)
- Cohesive **navy brand + rounded sheets** with big rounded top corners — modern and friendly.
- **Live computed values** (ages, effective lactation, expected dates) — reduces data entry.
- **Reproductive workflow is genuinely smart**: auto dates (45-day check, gestation,
  expected calving), auto-lactation, optional instant calf registration.
- Deep-linkable filter state (`/animals?filter=Pregnant`) on the list.
- FAB pattern on list screens; segmented age toggle; tinted status pills.

### 12.2 Should fix / reconsider
- **Unify the design tokens and enforce them** — stop hardcoding `#1F2937` etc.; adopt a
  strict token layer (colors/spacing/radius/typography/shadows) + a small reusable component kit.
- **One background gray, one shadow style**, consistent radii.
- **Real alerts on Home** (due pregnancy checks, overdue vaccines/dewormings, expected
  calvings) with urgency + tap-through to the exact animal.
- **Make Settings functional** (or remove from the hidden tab) — notifications,
  schedules, language, data export.
- **Status pill on Animal Detail is always green** regardless of status — fix.
- **Add per-animal health/reproduction history** to the detail screen (linked records).
- **Photos**: `image_url`, image-picker, and camera are configured but unused — either
  implement or remove the config/permissions.
- **Empty states** exist but are plain text — upgrade with illustration + CTA.
- **Accessibility**: ensure tap targets ≥44px, contrast, font scaling; label pickers clearly.
- **Form UX**: many long single-column forms — consider staged/stepped sections, section
  auto-advance, and clearer required markers.
- **Typed routes** are enabled (`experiments.typedRoutes`); keep using typed route helpers
  instead of `as any`.
- **Dead code cleanup**: remove or revive legacy types/utils (see §3). Keeping both `types/`
  index + per-entity files risks drift.

### 12.3 Suggested design direction
- Adopt a **token-driven system**: `spacing`, `radius`, `typography`, `color`, `shadow`
  tokens; light-only or add dark mode (today it's light-only).
- Build reusable primitives: `Card`, `ScreenHeader`, `Field`, `TextField`, `PickerField`,
  `DateField`, `PrimaryButton`, `SecondaryButton`, `DangerButton`, `StatusPill`, `Chip`,
  `FAB`, `EmptyState`, `SectionHeader`, `InfoStrip`, `SegmentedControl`, `SwitchRow`.
- Prefer a **consistent neutral gray** (e.g. `#F7F9FC`) and one shadow recipe.
- Consider a **bottom-sheet or stepped flow** for register/insemination forms.
- Use **species emoji/illustration** consistently (they exist in `constants/livestock.ts`).
- Keep the smart auto-calculations — they're the product's differentiator.

---

## 13. Quick File Reference

| File | Role |
|---|---|
| `app/_layout.tsx` | Root stack, provider, splash, toast |
| `app/(tabs)/_layout.tsx` | Tab bar |
| `app/(tabs)/index.tsx` | Home dashboard |
| `app/(tabs)/animals.tsx` | Animal list + search + filters |
| `app/(tabs)/settings.tsx` | Settings (hidden) |
| `app/animals/register.tsx` | Register animal (+ calf) |
| `app/animals/edit.tsx` | Edit animal |
| `app/animals/[id].tsx` | Animal detail |
| `app/health/insemination.tsx` | Insemination records |
| `app/health/calving.tsx` | Calving records |
| `app/health/vaccination.tsx` | Vaccination records |
| `app/health/deworming.tsx` | Deworming records |
| `constants/Colors.ts` | Design tokens |
| `store/StoreContext.tsx` | Global state + persistence |
| `types/index.ts` | Canonical data types |
| `utils/date.ts` | Date/age/gestation math |
| `utils/lactation.ts` | Lactation rules |
| `utils/useNow.ts` | Live clock hook |
