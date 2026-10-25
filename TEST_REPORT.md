# Focused regression test report

Baseline: My Money Diary investment/subscription edit build.

## Verified in Chromium
- PASS: Subscription icons and compact actions at 320px
- PASS: Subscription icons and compact actions at 375px
- PASS: Subscription icons and compact actions at 390px
- PASS: Subscription icons and compact actions at 768px
- PASS: Unlock fullscreen + 28 rounded currency symbols
- PASS: PIN unlock restores previous app viewport setting

## Failed
None in this focused test.

## Limits
Tests isolate the changed source functions/styles, not the entire app. Installed iPhone PWA status-bar rendering must be checked on-device, as Chromium cannot reproduce it. All other app features were carried forward unchanged from the baseline; this test does not claim to revalidate every financial function.
