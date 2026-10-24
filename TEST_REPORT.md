# Dr. Nuellie’s Money Diary — modal/action root-cause repair QA

Build date: 24 October 2026
Base: dr_nuellies_money_diary_unfreeze_unlock_fixed.zip

## Root causes identified in running Chromium

1. A MutationObserver called `tidyAdviceLanguage()` every animation frame. It rewrote the innerHTML of **every `.mbox` modal even when the text was unchanged**, detaching the live buttons roughly 60 times/second. Playwright clicks kept retrying because targets were detached. The dialog blocked navigation.
2. Multiple old install functions reassigned `confirmDlg` after the final confirmation controller was installed. The final controller's document-capture listener then consumed clicks with an empty callback, so a Yes/No choice closed the dialog without performing the requested action.
3. A document-capture handler treated **Use Saved Template** as a Quick Add Save action and had duplicated pointer/click/touch-save paths.
4. The generic Edit modal's capture handler intercepted the Save button even while editing a non-transaction record, preventing some investment/asset/loan/recurring changes from being committed.
5. The monthly interest sequence marked the entire month finished after the first investment was credited, preventing the other due investments from being processed. The “Not yet” decision was not tracked for the current session.

## Source changes (no visual redesign)

- Adviser wording normalisation is now idempotent and limited to adviser prose; **modal subtree nodes are never needlessly re-created**.
- Older re-installers no longer replace the confirmation controller or repeatedly bind form handlers. Exactly one final confirmation dispatcher owns Yes/No buttons.
- “Not yet” defers that investment's reminder for the current session without posting a transaction or changing the wallet.
- Multiple investment returns are prompted sequentially, each at most once per month, with exact expected wallet credits.
- Monthly reminder is scheduled after unlock, avoiding a financial overlay appearing beneath the security chooser.
- Generic Edit Save can proceed for investments, assets, loans and recurring items; transaction-specific reconciliation uses the transaction handler.
- Quick Add saves only through genuine Save buttons; Saved Template does not trigger transaction creation.
- Existing pages, charts, layout, names, fonts, emojis, palettes, CSS and icons are unchanged.

## Browser interaction checks — all passed in the test harness

- 14 primary navigation destinations: dashboard, income, expenses, wallets, investments, loans, budget, goals, planner, projections, analysis, adviser, tools and settings.
- Due investment: “Not yet” dismisses popup, records no credit, and navigation works; subsequent checks in the same session do not re-prompt.
- Two investments due in one month: sequential Yes actions recorded two transactions and two log entries; cash increased by GH₵200, not duplicated.
- Generic confirmation: No, Yes and close × actions close the overlay and preserve navigation.
- Income and expense: each tested with Yes update and Just record; only Yes changes the wallet; each saves one transaction.
- Quick Add: sheet closes before wallet decision and exactly one transaction is saved; GH₵42 expense debits GH₵42.
- Expense edit GH₵80→GH₵100: reverse the old wallet effect and apply the new one. Delete with reversal returns the wallet to its starting balance.
- Investment, asset, loan and recurring Edit Save: values updated and dialog dismissed.
- Wallet transfer followed by deletion: both account balances restored exactly.
- New wallet/account propagates to selectors; a new expense category propagates to expense category options.
- PIN chooser, wrong PIN, correct PIN, back to methods, then normal navigation.
- Quick Add opens and closes at mobile viewport size.
- All six existing generic modal shells: close button releases overlay and primary navigation remains functional.
- Mutation test: an open monthly-return dialog's card was not replaced over 1 second.
- Static audit: 213 elements with inline onclick handlers; **zero syntax errors and zero unresolved named functions** in the harness.
- No uncaught JavaScript errors in these scenarios.

## Honest limitations

These results come from a Chromium browser harness with simulated localStorage, static local HTML and disabled external network font/CDN requests. They are targeted interaction and numerical tests, **not a certification that every feature in the entire application has been exhaustively tested**. Real on-device Face ID/Touch ID, installation/service-worker behaviour, third-party PDF/Excel OCR parsing, and availability of externally hosted Chart.js/font libraries require their own tests on the real deployed origin/device. No actual financial data was read or modified during the tests.

## Deployment

Install/replace the complete ZIP contents on the same app origin. The service worker has a new cache version; previously cached files should be replaced on update. **Back up local diary data before replacing or relocating an installed PWA; do not clear site data casually.**
