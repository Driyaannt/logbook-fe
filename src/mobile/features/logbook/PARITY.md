# Logbook browser attachment parity

## Resolved in this scope

- Browser image crop with movable selection, four pointer handles, numeric keyboard-accessible crop controls, reset and quarter-turn rotation. Crop coordinates are normalized against the rotated **original** dimensions; final integer source bounds are clamped even for 1×1 originals and negative/non-finite inputs.
- Sequential multi-image review keeps separate crop/rotation drafts per occurrence. Back/Next and re-review preserve drafts; re-review always exports from the original File, not a previous lossy export. Nothing is added, replaced or uploaded until the whole batch is confirmed. Cancel/Escape leaves the prior form state untouched. A broken image can be explicitly skipped without dropping valid siblings/documents.
- Unchanged/reset images return the exact original File object/bytes. Confirmed PNG edits remain PNG; WebP edits export lossless PNG; JPEG edits export once at quality 1. Output filenames retain the original stem and use the actual encoded PNG/JPEG extension/MIME. Documents never pass through Canvas. No size-triggered resize/recompression or client upper-size cap was added; 25 MB remains advisory.
- Draft image thumbnails, zoom buttons, wheel zoom, touch pinch, pointer pan, keyboard pan/+/- and reset. Dialogs lock page scroll, make the background inert, contain keyboard focus, restore focus and close with Escape.
- Retained repeated attachment occurrences have separate stable display keys; removal targets one occurrence. Existing metadata Before/After positioning, mixed document/image cards, original-name display, unknown fallback and verification/identity policy remain in place.
- Dirty form navigation uses the browser's cancelable Navigation API before history changes, plus beforeunload and a normal-anchor fallback. Verified against real BrowserRouter Link/programmatic transitions and canceled browser Back in Chrome. No history monkey-patching, synthetic history entries, popstate rollback, unstable blocker or router internals.
- Authoritative grouped category counts use Mobile's existing `category_aggregates: true` / `bimbingan_categories` contract. When valid aggregates exist, the overview stops after page 1 instead of crawling all pages; category and presentation drilldowns use the existing `id_category`, `is_presentation`, `page` and `limit` fields and paginated Load more. Malformed/missing aggregates retain the older complete-page fallback rather than reporting partial counts as totals.

## Field-scoped drop and clipboard input (latest)

- Shared `AttachmentControl` is used by every metadata attachment field in both Create and Edit, not only Before/After. White dashed zones show a green drag/focus border, upload icon, short Indonesian instructions, `aria-describedby`, keyboard focus, and per-field live validation errors. Enter/Space opens the ordinary filepicker; Pilih file and Kamera remain available.
- Drop and focused-field Ctrl+V use the **same** `pick` validation and staged multi-image review as the filepicker. Documents bypass Canvas; mixed image/document batches keep their original order, duplicates get separate occurrence keys, and Cancel does not change the form. No immediate uploads, upper-size cap, deduplication by filename, relation/tenant IDs, or new upload route were added.
- Clipboard uses the user-gesture `paste` event, never `navigator.clipboard`, permissions, HTML parsing or remote URL fetching. Safe provider filenames are retained. Only nameless/extensionless files with a whitelisted image/PDF/Office MIME receive an extension; explicit unsupported extensions are not silently repaired. Unsupported/empty files produce the same picker validation while valid siblings survive.
- Paste is handled only inside the active zone and never from input, textarea or contenteditable descendants. Text/HTML/links are left alone. Drag counters prevent nested-child flicker and reset on exit/drop/dragend/window blur or disabled state. File drops are prevented only in the actual zone (including rejected/disabled drops to avoid browser navigation); outside drops are not intercepted. Window listeners only clean drag state.
- Disabled/read-only/uploading/review states prevent new picker/drop/paste additions. Directory entries and unreadable file-provider items produce visible errors rather than pretending to stage a folder; readable siblings are retained.

## Source trace (read only)

Reference root: `C:/Data/Driya/logbook`.

- `src/components/attachments/ImageEditor.tsx`, `cropGeometry.ts`, `imageTools.ts`: crop/reset/rotation, original pixels and filename provenance.
- `src/api/masterApi.ts`: `GetLogbookPagePayload`, `parseBimbinganCategoryAggregates`, `getLogbookPage`.
- `src/screens/home/HomeScreen.tsx` around lines 1280–1370: category aggregates and server-scoped drilldowns.
- `src/api/masterApi.bimbingan.test.ts`: independent aggregate totals and selected customer scope.

No Mobile/backend source, APK, shell/router owner files or package manifests were edited.

## Verification

From `C:/Data/code/logbook-fe`:

```bash
npm run lint
npm run build
node --test src/mobile/features/logbook/*.test.mjs
```

The node suite currently passes 31 tests, including actual Create/Edit/shared attachment renderers, trusted clipboard MIME/name mapping, file-transfer occurrence/folder/unreadable-item handling, existing grouped multipart ownership boundaries, geometry, aggregates and dirty-navigation regressions. RED was observed for the missing rendered zones and dropped-document handler before integration; an unreadable-provider sibling test also failed before its error handling fix.

Browser fixture (development only; not imported by the production app):

```bash
npm run dev -- --host 127.0.0.1 --port 5187 --strictPort
```

Install the browser test dependency outside the repository (no package manifest changes):

```bash
npm install --prefix "$LOCALAPPDATA/Temp/logbook-browser-checks" --no-save playwright
node src/mobile/features/logbook/image-browser.checks.mjs
node src/mobile/features/logbook/attachment-input.checks.mjs
node src/mobile/features/logbook/category-browser.checks.mjs
```

Override `PLAYWRIGHT_MODULE` / `CHROME_PATH` for another installation. `LOGBOOK_TEST_URL` can override the attachment fixture URL (the category fixture uses port 5187).

Executed with installed Chrome at 1280×900 and 390×844. Checks use real Canvas encoders/decoders, pixel values, PNG/JPEG signatures and File identity; real rendered dialogs, native browser filechooser/confirm events, actual mouse input, CDP touch drag/pinch, numeric controls, wheel and keyboard controls, cancellation, re-review, duplicate occurrence keys and document preservation. Category checks mount the actual workspace against intercepted read-only synthetic API fixtures: server total 61 is independent of one loaded row; drilldown pagination and presentation scope are verified. No clinical writes are issued. Screenshots are written to `%LOCALAPPDATA%/Temp/logbook-attachment-1280.png` and `logbook-attachment-390.png`.

`attachment-input.checks.mjs` additionally mounts the actual shared component at `image-browser.html?inputFixture`, with synthetic retained Edit occurrences and ordinary/Before/After metadata groups. At both phone/desktop sizes it verifies real DataTransfer/ClipboardEvent payloads (files/items fallback), Canvas-image drop/clipboard review and rotation, staged confirmation/cancel, document bypass, mixed invalid/valid siblings, duplicate names/keys, retained keys, text/HTML/URL and text-editor isolation, inactive-field rejection, nested drag depth/cleanup, zone-only drop prevention, Enter/Space/native filechooser and disabled/uploading/read-only guards. It aborts any API/non-GET/external request and observed zero such requests. Zone screenshots were inspected at `%LOCALAPPDATA%/Temp/logbook-dropzone-1280.png` and `logbook-dropzone-390.png`; attachment layout fits both widths.

These are **synthetic browser clipboard/drag events**, not physical OS Ctrl+V, an Explorer drag, installed clipboard providers or clipboard permissions proof. Directory rejection uses a `webkitGetAsEntry` seam with a real browser event, not a physical folder drag. Safari/Firefox and physical phone clipboard/camera behavior remain unverified; use Pilih file/Kamera where a browser does not expose clipboard Files. No live clinical API upload/Create/Edit persistence was exercised.

Build succeeds with existing Rollup annotation/chunk-size warnings; these are not attachment failures.

Latest attachment gate: lint/build, all 31 node tests, `image-browser.checks.mjs` and `attachment-input.checks.mjs` passed. The separately rerun, unchanged `category-browser.checks.mjs` timed out waiting for its synthetic category card: its route allows every localhost URL through before matching API endpoints, so it does not intercept the current same-origin `/mobile-api/` configuration. This unrelated fixture is not evidence of a passing current category browser gate and was left outside the attachment change. Do not run that old fixture against a proxy without first isolating its API routing.

## Remaining / parent integration boundaries

1. **Browsers without the Navigation API:** ordinary anchors, reload/close and workspace-owned Leave buttons are protected, but reliably canceling arbitrary shell programmatic navigation or browser-history traversal needs parent router integration. Do not add unsafe history patch/rollback or assume `useBlocker` works under the existing plain BrowserRouter. Also confirm before shell logout side effects: a route guard cannot undo session destruction that happens before navigation. Shell/router changes are outside this ownership scope.
2. **Historical session switching:** the current Mobile Home/Logbook list flow and `GetLogbookPagePayload` expose no historical-session selector/read endpoint or authoritative history-ID list. The only session IDs found in `masterApi.ts` are milestone Undo `current_session_id` / `restore_session_id`; they are not logbook history selectors. No guessed endpoint, session ID or mutation was added. A separately proven read contract and actual IDs are needed before implementation.
3. Older servers without valid `bimbingan_categories` still require the legacy full-page count fallback. Live aggregate deployment availability is not established by synthetic fixtures.
4. Physical phone camera permissions/file-provider behavior, Safari/Firefox, actual on-device pinch feel, live CORS/upload/Create/Edit persistence and production clinical writes were not tested. Browser fixture evidence is not native-device or production proof. Very large image decode/export remains subject to browser memory/Canvas limits and reports failure instead of silently shrinking originals.
