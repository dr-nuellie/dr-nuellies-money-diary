# Targeted validation — 26 October 2026

- Source: `my_money_diary_home_clicks_currency_fixed.zip`
- JavaScript syntax: PASS (all locally embedded scripts checked with Node).
- Targeted subscription layout test in Chromium: PASS at 320 × 720, 375 × 812, 390 × 844, 667 × 375, 844 × 390 and 1024 × 768.
- Subscription name vs amount width: at 375px, 152px versus 69px; at 390px, 167px versus 69px. These are isolated layout-harness measurements and may vary with the application's enclosing card width.
- Horizontal overflow in these cases: NONE.
- Landscape `sec-desc` computed font size: 11.5px (667 × 375, 844 × 390).
- Original logo crop: 818 × 795 content bounds from 1024 × 1024 source; re-exported 1024px and PWA-sized RGBA images. White border outside the plum rounded-square artwork replaced with transparency.
- Other app functionality: retained from baseline; not independently retested in this targeted revision.

Limitation: iOS Safari installed-PWA text scaling and icon caching must still be verified on the user’s device. Always back up personal financial records before replacing app files.
