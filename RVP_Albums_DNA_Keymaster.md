# 🧬 RVP Albums - Keymaster Context (AI Agent Instructions)

> **TO ANY FUTURE AI AGENT:**
> You are reading the absolute source-of-truth regarding the entire architectural DNA of `RVP Albums`. This project is highly non-standard. It behaves like a native desktop app running inside the browser. DO NOT alter the core philosophy outlined below. Read this carefully before modifying state, components, or layout logic.

---

## 1. Core Architecture & Philosophy
* **Tech Stack:** Next.js 14 (App Router), React, TypeScript, Tailwind CSS, Zustand (State Management), Konva.js / React-Konva (Canvas Engine), IndexedDB (`idb-keyval`), Firebase Authentication (v9 Modular).
* **Paradigms:**
  * **100% Local-First / Serverless:** The app DOES NOT upload heavy image assets to any cloud server (except lightweight user meta-data via Firebase in recent SaaS scopes).
  * **IndexedDB Storage:** High-res photos (Raw files, JPEGs) are stored directly inside the user's browser via IndexedDB using Blob references.
  * **Zustand Persistence:** Project layouts and metadata are strictly tracked via an aggressive Zustand store (`useEditorStore`) which binds to IndexedDB.
  * **PWA:** Native Service Worker installed via `@serwist/next` to allow offline installability.

---

## 2. Authentication Gateway (SaaS Phase 1)
* **Strategy:** Firebase Auth is structurally wrapped over the core layout.
* **Mechanism:** Routes are intercepted. If `useAuth()` returns `!user`, the user is hard-redirected via Next router to `/login`.
* **Database:** No Firestore connected yet. Purely Firebase Auth email/passwords.

---

## 3. The Canvas Engine (`react-konva`)
* **Framework:** The core builder (`EditorWorkspace.tsx` -> `SpreadCanvas.tsx`) mounts a WebGL-accelerated `<Stage>` and `<Layer>`.
* **Coordinates & Math:** 
  * The internal engine speaks ONLY **Millimeters (mm)** natively to guarantee exact print accuracy.
  * Conversion scaling (`zoom / scale`) maps physical mm to standard pixels.
  * **`project.size.w_mm`** and **`project.size.h_mm`** control bounds.
* **Auto-Layout:** The project contains an experimental Fundy-like masonry engine (`autoLayoutEngine.ts`). It computes algorithmic grid mappings for node arrays.
* **Ruler & Guides:** `RulerGuides.tsx` maps a global grid mapping inches (subdivisions .25, .50, .75) and cm dynamically overlaying the canvas view. Guides live in the global `project.globalGuides[]`.

---

## 4. The Export Pipeline (Crucial Intelligence)
* **Mechanics:** Because images might exceed 30MB per spread, exporting utilizes a hidden detached DOM iframe or off-screen renderer.
* **Tool:** `html2canvas` translates the raw component architecture via deep cloning recursively.
* **Safeguards:** When exporting, components listen to a `isExportMode=true` flag. This hides all toolbars, blue boundary lines, borders, selection boxes, and overlays intentionally so they don't bleed into the final render (`SpreadCanvas.tsx`).
* **Packaging:** `JSZip` loops through every page and compresses high-res Blobs into a `.zip` or downloads individual `.jpg`.

---

## 5. Critical Database Models (`src/types/editor.ts`)
* **`EditorProject`**: The absolute parent wrapper. Contains `id`, `size`, `labPresetId`, global typography rules, and an array of `spreads`.
* **`Spread`**: A 2-page panorama (Left page + Right page). Holds CSS `bg_color` and an array of `elements`.
* **`SpreadElement`**: The absolute primitive. Can be `type='image' | 'text'`. Contains `x, y, w, h`, rotation, locked status, dropshadow payload, border radius, etc.

---

## 6. How To Make Edits
1. **Never alter IDB logic casually:** `useEditorStore` relies on highly specific delta updates to commit rapid save intervals without memory-leak crashing the browser.
2. **Respect the Canvas Scale:** When mapping HTML `<div>` over Konva `<Group>`, the CSS coordinates must inherit `(value * scale)` strictly to map correctly over the responsive zoom factors.
3. **PWA Restarts:** If you change Service Worker scopes (`sw.js`), direct the user to hard-reload.

**Version Build:** SaaS Authentication Alpha | Engine v3.1
