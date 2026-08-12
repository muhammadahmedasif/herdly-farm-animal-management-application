# Herdly — App Architecture (End-to-End)

> **Storage update:** Herdly now uses a local **SQLite** database (`expo-sqlite`,
> `herdly.db`) via a repository layer under `database/`. The earlier AsyncStorage
> JSON store was replaced; legacy AsyncStorage data is migrated once into SQLite.
> See `database/` for the implementation.

A complete reference for how Herdly is structured, how data is stored, and how
the screens and business logic fit together.

---

## 1. What the app is

**Herdly** is a React Native / Expo livestock-management app for smallholder and
commercial farms. It tracks:

- **Animals** (cows, buffalo, goats, sheep) — identity, breed, sex, age, photos, reproductive status.
- **Reproductive events** — artificial insemination (AI), pregnancy, calving.
- **Health records** — vaccinations and deworming, with next-due dates.

Everything runs **100% on-device** today (no server required). The data layer is
designed so a backend (Supabase) can be dropped in later by changing a single file.

---

## 2. Tech stack

| Concern | Choice |
|---|---|
| Framework | Expo SDK 57 (`expo` ~57.0.12) |
| Runtime | React 19, React Native 0.86 |
| Routing | `expo-router` (file-based, typed routes) |
| Navigation | Stack + bottom Tabs |
| Local storage | `@react-native-async-storage/async-storage` |
| Date picker | `@react-native-community/datetimepicker` |
| Selectors | `@react-native-picker/picker` |
| Icons | `lucide-react-native` |
| Images | `expo-image-picker` (+ `expo-image-manipulator` available) |
| Toasts | `react-native-toast-message` |
| Animations | `react-native-reanimated` (splash) |
| Future backend | `@supabase/supabase-js` is installed but **not yet wired** |

> The store (`store/StoreContext.tsx`) explicitly documents that when Supabase is
> connected, only that one file changes — every screen keeps calling the same
> `useStore()` hooks.

---

## 3. Project structure

```
herdly/
├── app/                         # File-based routes (expo-router)
│   ├── _layout.tsx              # Root stack: registers StoreProvider, Toast, screen headers
│   ├── +html.tsx / +not-found.tsx
│   ├── (tabs)/                  # Bottom-tab group (no header bar)
│   │   ├── _layout.tsx          # Tabs: Home, Animals, Settings
│   │   ├── index.tsx            # Dashboard / Home
│   │   ├── animals.tsx          # Animal registry list
│   │   └── settings.tsx         # Settings
│   ├── animals/
│   │   ├── register.tsx         # Add animal (+ optional calf + photos)
│   │   ├── edit.tsx             # Edit existing animal
│   │   └── [id].tsx             # Animal detail screen
│   └── health/
│       ├── insemination.tsx     # AI / pregnancy records
│       ├── calving.tsx          # Calving events (creates a Calf animal + photo)
│       ├── vaccination.tsx      # Vaccination records
│       └── deworming.tsx        # Deworming records
├── components/
│   └── ui.tsx                   # Shared UI: GradientHeader, Card, AppBackground, FAB, etc.
├── constants/
│   ├── Colors.ts                # Design tokens (primary, teal, shadows, radius)
│   └── livestock.ts             # Species, breeds, emoji, status→color maps, gestation
├── store/
│   └── StoreContext.tsx         # Local data store (AsyncStorage + reducer)
├── types/                       # TypeScript domain models (mirror DB columns)
│   ├── index.ts                 # Re-exports + core enums
│   ├── animal.ts
│   ├── health.ts
│   ├── vaccination.ts
│   └── deworming.ts
├── utils/
│   ├── date.ts                  # toDateString / parseDate / age / gestation / dateFromAge
│   ├── dateCalculations.ts      # todayString / parseLocalDate (used by validation)
│   ├── lactation.ts             # Effective lactation + increment helpers
│   ├── validation.ts            # Form validators (animal, insemination, calving)
│   ├── errorMessages.ts         # Validation message strings
│   └── useNow.ts                # Live "now" clock for age calculations
└── assets/images/              # Icons, splash, and local dashboard photos (jpg)
```

---

## 4. Data model

All entities are plain TypeScript interfaces in `types/` and are stored as JSON
arrays in AsyncStorage. IDs are random strings (`Math.random().toString(36)`).

### `Animal` (the core entity)
| Field | Notes |
|---|---|
| `id` | Random string |
| `tag_number` | Herd tag (unique per animal; validated) |
| `name` | Alias (defaults to "Unknown") |
| `species` | `'Cow' \| 'Buffalo' \| 'Goat' \| 'Sheep'` |
| `breed` | Free text |
| `sex` | `'Male' \| 'Female'` |
| `date_of_birth` | `YYYY-MM-DD` |
| `dob_is_estimated` | True when user entered age instead of DOB |
| `color` | Free text |
| `repro_status` | `Open \| Inseminated \| Pregnant \| Dry \| Newly Calved \| Breeding \| Non-Breeding \| Not Applicable \| Calf` |
| `lactation_number` | Committed lactation count (string) |
| `last_insemination_date` | Set for females |
| `image_url` | **Local file URI** from `expo-image-picker` (no upload) |
| `notes`, `created_at` | Free text / ISO timestamp |

### `Insemination`
AI event for a female: `animal_id`, `lactation_number`, `ai_date`, `semen_company`,
`bull_name`, `pregnancy_check_date` (auto = `ai_date + 45d`), `pregnancy_status`,
`expected_calving_date` (auto = `ai_date + gestation`), `notes`.

### `Calving`
Records a birth: `animal_id` (mother), `insemination_id`, `calving_date`,
`calf_tag`, `calf_name`, `calf_sex`, `calf_weight_kg`, `complications`, `notes`.
On save it also **materializes the calf as a new `Animal`** with `repro_status: 'Calf'`.

### `Vaccination` / `Deworming`
Per-animal health events: `animal_id`, `vaccine_name`/`product_name`,
`date_given`, `next_due_date`, `administered_by`/`dose_ml`, `notes`.

### Relationships
```
Animal 1 ──< Insemination (animal_id)
Animal 1 ──< Calving      (animal_id = mother)
Animal 1 ──< Vaccination  (animal_id)
Animal 1 ──< Deworming    (animal_id)
Calving 1 ──> creates Animal (calf, repro_status 'Calf')
Calving ── Insemination (insemination_id, optional)
```

There are **no foreign-key constraints**; links are by `id`/`tag_number` strings
and resolved in-memory with `Array.find(...)`.

---

## 5. Data layer & persistence

`store/StoreContext.tsx` is the single source of truth.

- **State**: `{ animals, inseminations, calvings, vaccinations, dewormings, loading }`.
- **Persistence**: each collection is saved under its own AsyncStorage key
  (`@herdly/animals`, `@herdly/inseminations`, …) as a JSON array.
- **Load**: on mount, all five collections are read in parallel
  (`Promise.all`) and dispatched via `LOAD`.
- **Mutations**: `addAnimal`, `updateAnimal`, `deleteAnimal`, `addInsemination`,
  `updateInsemination`, `addCalving`, `updateCalving`, `deleteCalving`,
  `addVaccination`, `addDeworming`. Each does two things:
  1. `dispatch(...)` to update React state (UI re-renders immediately),
  2. `save(key, next)` to persist the new array to AsyncStorage.

A `useReducer` handles all transitions; the context exposes state + async CRUD
functions. Screens consume it via `const store = useStore();`.

### Swapping to Supabase later
Because screens only depend on `useStore()` (not on AsyncStorage directly),
migrating to Supabase means rewriting this file's `save`/`load`/CRUD to call
`supabase.from('animals').insert/update/...`. The reducer and all screens stay
untouched. The domain types already mirror intended table columns.

---

## 6. Routing & navigation

`expo-router` derives routes from the file tree (with `typedRoutes` enabled).

- **Root** `app/_layout.tsx`: wraps everything in `<StoreProvider>`, renders a
  `<Stack>` (headers hidden), mounts global `<Toast/>`, and hides the splash after
  500ms. Each route declares a navy header (`#1E3A5F`) with `headerShown: true`.
- **Tabs** `app/(tabs)/_layout.tsx`: bottom tab bar with Home, Animals, Settings.
  Settings is hidden from the bar (`href: null`) but still routable.
- **Stack screens** pushed on top of tabs:
  - `animals/register` → "Register Animal"
  - `animals/[id]` → "Animal Details" (dynamic route, reads `id` param)
  - `animals/edit` → "Edit Animal"
  - `health/insemination`, `health/calving`, `health/vaccination`, `health/deworming`

Navigation uses `useRouter().push(...)` / `router.back()`. The dashboard alert/quick-action
cards push to the relevant health or animal routes.

---

## 7. Data flow (typical screen)

```
User input
   │
   ▼
local component state (useState: tag, name, species, …)
   │  (live derived values via utils: calculateAge, formatAge, dateFromAge,
   │   getEffectiveLactation, getGestationDays)
   ▼
handleSave()
   ├─ validate (utils/validation.ts)
   ├─ build entity object (ids = random)
   ├─ store.addX(entity)   →  dispatch + AsyncStorage write
   └─ Toast.show(...) + router.back()
```

The animal **detail** and **list** screens are pure readers: they call `useStore()`
and derive everything (age, status color, counts) at render time. `useNow()`
provides a ticking clock so ages stay current while the screen is open.

---

## 8. Screens

### Tabs
- **Home (`(tabs)/index.tsx`)** — Gradient header, stat cards (Total Animals,
  Pregnant, Alerts Due), a prominent "Register New Animal" card, a 2-column grid of
  **Quick Action** photo tiles (Insemination / Calving / Vaccination / Deworming)
  using local `assets/images/*.jpg`, and a single-row **Alerts** grid (3 cards)
  that navigate to each health list.
- **Animals (`(tabs)/animals.tsx`)** — Searchable/filterable list. Each card shows a
  150px identifying photo header (or emoji placeholder), name, tag, status pill.
  FAB opens the register screen.
- **Settings (`(tabs)/settings.tsx`)** — Branded settings list (currently static).

### Animal flows
- **Register (`animals/register.tsx`)**
  - Hero banner → Basic Info (Tag, Name, **Species emoji cards**, **Animal Photo** upload,
    Breed, Color) → Physical Details (Sex/Color, Lactation, **Age⇄DOB toggle**, big
    calculated-value panel, **Status** picker on the same row) → optional **Register Calf**
    section (calf name/tag/sex, **Calf Photo**, weight…) → Save.
  - Saving creates the mother `Animal`; if "Register Calf" is on, also creates a
    `Calf` `Animal` linked by mother tag.
- **Edit (`animals/edit.tsx`)** — Same fields pre-filled; updates the existing `Animal`.
- **Detail (`animals/[id].tsx`)** — Side-by-side header: 120px `contain` photo on the
  left, name/tag/status on the right; then a Details card (species, breed, sex, color,
  age, DOB, lactation…), health summary, and Edit/Delete actions.

### Health flows
- **Insemination (`health/insemination.tsx`)** — Lists pregnant/lactating animals'
  AI records; form captures AI date, bull, semen company; auto-computes
  `pregnancy_check_date` and `expected_calving_date`. Updates the animal's
  `repro_status` to `Inseminated`/`Pregnant`.
- **Calving (`health/calving.tsx`)** — Lists calving records; form selects a pregnant
  mother (auto-fills expected calving date), calf sex/name/tag/weight, complications,
  **Calf Photo**. On save: creates the calf `Animal`, sets mother to `Newly Calved`,
  and increments her `lactation_number`.
- **Vaccination / Deworming** — CRUD lists with `next_due_date`; appear in dashboard alerts.

---

## 9. Business logic / domain computations (`utils/`)

- **Age** (`date.ts`): `calculateAge` → `{years, months}`; `formatAge` → "2 yr 3 mo".
  `dateFromAge` back-computes a DOB from an entered age (clamped to month ends).
- **Dates**: `toDateString` / `parseDate` deliberately use **local** time (not UTC)
  to avoid off-by-one-day bugs when serializing.
- **Gestation** (`getGestationDays`): Cow 283, Buffalo 310, Goat 150, Sheep 147. Used
  for `expected_calving_date = ai_date + gestation`.
- **Lactation** (`lactation.ts`): `getEffectiveLactation` returns `base + 1` while
  `Pregnant` (a future lactation), and `incrementLactation` commits it at calving.
- **Validation** (`validation.ts`): duplicate-tag check, required species/sex,
  no future DOB, insemination-after-birth, calving-after-insemination.

---

## 10. UI / design system

- **`constants/Colors.ts`** — `primary #1E3A5F`, teal accent `#006666`, plus
  `card`, `background`, `textPrimary/Secondary/Muted`, `success/warning/danger/info`
  and their tints, `Shadows`, `Radius` tokens.
- **`components/ui.tsx`** — Reusable primitives:
  - `GradientHeader` — navy header with a faux top sheen (no native gradient module needed).
  - `Card`, `SectionHeader`, `StatusPill`, `EmptyState`, `FAB`.
  - `AppBackground` — dependency-free soft glow background (overlapping colored blobs
    over a light base) used behind every screen.
- **Forms** — Consistent tokens across register/edit/calving: inputs & pickers use
  `1.5px #E2E8F0` borders, `16` radius, `56` height; labels `13px/800/#475569`.
- **Images** are rendered with `resizeMode="contain"` where the full picture must show
  (detail hero, upload previews) so nothing is cropped.

---

## 11. Image handling

- Photos are chosen with `expo-image-picker` (`launchImageLibraryAsync` with
  `allowsEditing`, `aspect: [1,1]`, `quality: 0.7`) → a **local file URI** stored
  directly in `Animal.image_url`.
- No upload/networking: the URI is just persisted in AsyncStorage and rendered by
  `<Image source={{ uri }} />`. Small edited JPEGs keep rendering fast (no lag).
- Upload points: animal photo (register + edit), calf photo (register "Register Calf"
  and the calving page). The detail/profile screen shows the full, uncontained image.

---

## 12. Extending the app

- **New field on an entity** → add to the interface in `types/`, to the form screen,
  and to the save payload. Persistence is automatic (whole-array JSON).
- **New list screen** → add a route under `app/health/` (or elsewhere), register it in
  `app/_layout.tsx` for a header, and read/write via `useStore()`.
- **Backend** → implement `supabase` reads/writes inside `store/StoreContext.tsx`;
  screens and types are unchanged.
- **Design tweaks** → tokens live in `constants/Colors.ts` and `components/ui.tsx`.

---

## 13. Running

```
npm install
npx expo start        # Expo dev server (scan QR with Expo Go / build a dev client)
```

Data persists locally between restarts via AsyncStorage. No backend or API keys are
required for the current local-only build.
