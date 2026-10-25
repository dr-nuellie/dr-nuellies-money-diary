# Dr. Nuellie's Money Diary – focused October 2026 fixes

Built from `dr_nuellies_money_diary_wallets_rename_unlock_polished.zip`. The app's existing page layout, theme palettes, chart renderer and navigation were retained.

## Changes

1. Date inputs have a bounded, mobile-friendly DD/MM/YYYY display shell; their internal values remain ISO YYYY-MM-DD so filters, sorting and calculations still work. Form inputs generated inside Edit and statement-review dialogs receive the same treatment. Common history/list dates are displayed day-first.
2. Wallet Rename is arranged on the same horizontal title row rather than consuming another row. Longer wallet names wrap within the card.
3. Assets use a canonical cedi value. **Show in USD** divides GHS value by the active GHS-per-USD rate; mixed display preserves the originally recorded USD value and historical FX. Example: a GHS 15,000 asset displays $1,250 at rate 12. No asset value is modified by switching display modes.
4. Statement Import accepts PNG/JPG/WebP/BMP as well as CSV/Excel/PDF. Image import uses Tesseract.js OCR, parses possible statement rows and opens the pre-existing editable, opt-in review. OCR recognition does **not** post transactions automatically. OCR needs the external library and sufficiently readable images.
5. The unlock-choice logo uses the 1024px source and no longer moves with fractional CSS transforms. Decorative gradients retain a crisp CSS rendering and themed style.
6. Editing transactions from the main income/expense form replaces the existing ID rather than creating a new record. Edits can retain the existing wallet effect or reverse/reconcile it. Generic transaction modal saves are guarded against repeat submissions. Asset edits continue updating in place.
7. Service-worker shell cache name was revised to release updated files.

## Checks completed

- JavaScript syntax: `node --check` passed on all combined inline scripts.
- Browser harness (Chromium with mock storage and chart API): 320px, 375px, 390px, 430px and 768px mobile/desktop widths; the date shell aligned with its field and did not create horizontal viewport overflow.
- Date input remains `2026-10-25` internally but shows `25/10/2026` visibly.
- Seeded two assets: GH₵15,000 -> $1,250, GHS equivalent of $200 at historical rate 15 -> $250 at current rate 12, combined -> $1,500. No sign-only changes.
- Wallet Rename controls present for all seven built-in cards; at 320px, Rename remains on the title row within card bounds.
- Statement-image OCR test double: recognised 2 dated entries (one debit 45.00 and one credit 1,500.00), offered editable mapping, and saved **zero** transactions before confirmation.
- Existing expense record edited from 50 to 65 with no wallet reconciliation: transaction count stayed 1, original wallet stayed at 950.
- Same record edited to 80 with wallet reconciliation: count stayed 1, wallet moved to 920 and effect became -80.
- Asset edit from GH₵1,200 to GH₵1,300: asset count stayed 1.
- No uncaught page exceptions in the focused regression tests.
- ZIP integrity verified.

## Limitations and deployment

The sandbox blocks browser navigation to a normal HTTP(S) origin. The browser tests therefore used in-memory HTML, fake localStorage and controlled OCR/chart doubles. They validate scoped calculations and UI logic but are not production-browser certification. **Real iPhone Safari date-picker activation, live OCR accuracy for diverse bank statements, iOS Face ID and deployed PWA cache refresh are not verified here.** Tesseract.js and Chart.js are externally loaded by the existing app and require network availability unless separately provisioned. Back up current app data first; install the files to the existing app origin rather than a new origin so local records remain accessible.
