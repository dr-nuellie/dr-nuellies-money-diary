# Scoped restoration

- Restored the exact previous viewport/meta and page shell from `dr_nuellies_money_diary_dates_assets_import_updated.zip`; no global viewport-fit or body padding changes.
- Kept full-available-viewport styling scoped strictly to `#nuellieUnifiedUnlock`, with theme-specific title fonts.
- Correctly separated square PWA/Settings logo, small transparent brand mark, and full wordmark.
- Added a single read-only valuation date control and estimated worth column to the existing Investments > My Portfolio table. No extra calculator, no edits to wallet or investment values.
- Estimates start from the current recorded value; values before today are not guessed, because dated historic valuation data is not stored. Values after recorded maturity are capped at maturity.
- Currency toggles remain in the existing portfolio UI.
