---
Title: RVP Albums - Keymaster Context (AI Agent Instructions)
Version: SaaS Authentication Beta | AutoLayout AST Edition v4.0
Last Updated: April 2026
---

# 🧬 RVP Albums - Keymaster Context (AI Agent Instructions)

**TO ANY FUTURE AI AGENT**: You are reading the absolute source-of-truth regarding the entire architectural DNA of **RVP Albums**. This project is highly non-standard. It behaves like a native desktop app running inside the browser. DO NOT alter the core philosophy outlined below. Read this carefully before modifying state, components, or layout logic.

## 1. Core Architecture & Philosophy
**Tech Stack**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS, Zustand (State Management), Konva.js / React-Konva (Canvas Engine), IndexedDB (idb-keyval), Firebase Authentication (v9 Modular).

**Paradigms**:
- **100% Local-First / Serverless**: The app DOES NOT upload heavy image assets to any cloud server (except lightweight user meta-data via Firebase in recent SaaS scopes). 
- **IndexedDB Storage**: High-res photos (Raw files, JPEGs) are stored directly inside the user's browser via IndexedDB using Blob references.
- **Zustand Persistence**: Project layouts and metadata are strictly tracked via an aggressive Zustand store (`useEditorStore`) which binds to IndexedDB.
- **PWA**: Native Service Worker installed via `@serwist/next` to allow offline installability.

## 2. Authentication Gateway (SaaS Phase 1.5)
- **Strategy**: Firebase Auth is structurally wrapped over the core layout.
- **Mechanism**: Routes are intercepted via Next-Intl and Next Router. If `useAuth()` returns `!user`, the user is hard-redirected to `/login`.
- **Integrations**: Includes native Email/Password logic + `GoogleAuthProvider` (Pop-Up Mode with custom tracking parameters to bypass ad-blockers) + `sendPasswordResetEmail` Forgot Password UI Flow.
- **Database**: No Firestore connected yet. Purely Firebase Auth user management.

## 3. The Canvas Engine (`react-konva`)
**Framework**: The core builder (`EditorWorkspace.tsx` -> `SpreadCanvas.tsx`) mounts a WebGL-accelerated `<Stage>` and `<Layer>`.

**Coordinates & Math**:
- The internal engine speaks ONLY **Millimeters (mm)** natively to guarantee exact print accuracy.
- Conversion scaling (`zoom` / `scale`) maps physical `mm` to standard pixels.
- `project.size.w_mm` and `project.size.h_mm` control bounds.

**Experimental Fundy AST Engine (`fundyMasonryEngine.ts`)**:
- The AutoLayout system computes algorithmic grid mappings via a **Low-Count AST Physics Layer**.
- For 1-6 photos, it recursively generates permutations using geometric Algebraic Area maximization to force full spread utilization without any aspect-ratio distortion or standard row-based center grouping. Fallback occurs for larger counts over to greedy rows.

**Ruler & Guides**: `RulerGuides.tsx` maps a global grid mapping inches (subdivisions .25, .50, .75) and cm dynamically overlaying the canvas view. Guides live in the global `project.globalGuides[]`.

## 4. The Export Pipeline (Crucial Intelligence)
**Mechanics**: Because images might exceed 30MB per spread, exporting utilizes a hidden detached DOM iframe or off-screen renderer.
- **Tool**: `html2canvas` translates the raw component architecture via deep cloning recursively.
- **Safeguards**: When exporting, components listen to a `isExportMode=true` flag. This hides all toolbars, blue boundary lines, borders, selection boxes, and overlays intentionally so they don't bleed into the final render (`SpreadCanvas.tsx`).
- **Packaging**: JSZip loops through every page and compresses high-res Blobs into a `.zip` or downloads individual `.jpg`.

## 5. Critical Database Models (`src/types/editor.ts`)
- **EditorProject**: The absolute parent wrapper. Contains `id`, `size`, `labPresetId`, global typography rules, and an array of `spreads`.
- **Spread**: A 2-page panorama (Left page + Right page). Holds CSS `bg_color` and an array of `elements`.
- **SpreadElement**: The absolute primitive. Can be `type='image' | 'text' | 'decoration'`. Contains x, y, w, h, rotation, locked status, dropshadow payload, blendModes, filters/LUTs, border radius, etc.

## 6. Real-Time Interaction Handling (Contextual UI)
- **Asset Tray Multi-Selection**: High-performance multi-selection using `Set` iteration, surfacing dynamic sequence badges natively over thumbnails without Hover-state dependencies.
- **Geometrical Swap Logic**: The system enforces mathematical position swapping globally via properties intersection (`swapStagedElements()`) intersecting `x,y,w,h,rotation` when exactly 2 nodes are selected on either the live canvas or layout preview, powered by dynamic Inspector menus.

## 7. How To Make Edits
1. **Never alter IDB logic casually**: `useEditorStore` relies on highly specific delta updates to commit rapid save intervals without memory-leak crashing the browser.
2. **Respect the Canvas Scale**: When mapping HTML `<div>` over Konva `<Group>`, the CSS coordinates must inherit `(value * scale)` strictly to map correctly over the responsive zoom factors.
3. **PWA Restarts**: If you change Service Worker scopes (`sw.js`), direct the user to hard-reload.
