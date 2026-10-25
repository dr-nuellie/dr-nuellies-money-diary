# Dr. Nuellie’s Money Diary — wallet and unlock update QA

Date: 25 October 2026. Baseline: dr_nuellies_money_diary_modal_root_fixed_tested.zip.

## Changes

- The dashboard liquid breakdown and existing Chart.js wallet doughnut chart now use the same registry as the liquid total, including GHS and USD custom accounts. Zero-balance wallets remain visible in the list but are omitted from the doughnut slices. The financial total formula is unchanged.
- A discreet Rename control has been added to Wallets. Custom-wallet renaming keeps its unique immutable key, balance, applied wallet effects, transactions, recurring entries, templates and transfer references. Built-in wallet renaming uses saved display aliases while retaining canonical internal keys.
- Wallet selectors in Quick Add, transaction forms, recurring items, bulk entry, investments, goal links, transfers and statement-review rows use the live custom-wallet registry.
- Dates, grid fields and compound emojis are constrained to the card/grid bounds.
- The existing unlock controller and security gates are unchanged; only the unlock-choice presentation has a themed card, existing app logo, decorative animations and reduced-motion support.
- Previous charts, page layouts, main navigation, transaction workflows, modal handlers and app theme values have been retained.

## Automated checks

Playwright Chromium harness (local simulated app storage and a Chart.js test double, no real personal data):

- 24/24 focused checks passed: GHS and USD custom wallet totals, dashboard breakdown/chart consistency, custom wallet selectors and cards, inline renaming and persistence of keys/balances, built-in alias renaming, linked transaction references, date picker bounds at widths 320/375/390/768/1024px, emoji overflow, unlock chooser, PIN selection/back and successful PIN unlock. No uncaught JavaScript errors.
- Additional checks passed: adding a USD wallet using the Settings form; propagating to Quick Add/income selectors; recurring item editor retaining newly added account; changing a custom wallet balance and recomputing liquid total. No uncaught JavaScript errors.
- `node --check` on the compiled inline JavaScript: passed.
- ZIP content verified after packaging.

## Limits

The app loads Google fonts and Chart.js from external hosts in its normal deployment. In the browser test harness, these resources were removed and a lightweight Chart.js test double was used to validate labels and dataset amounts, so actual canvas rendering under every theme was not retested. Biometric hardware, mobile installed-PWA service-worker installation, statement PDF parsing, and full regression of every unrelated finance tool were not retested for this targeted release. The previous proven modal/transaction flows were retained rather than reimplemented.

Keep a backup and deploy all files to the existing app origin; do not clear local site data.
