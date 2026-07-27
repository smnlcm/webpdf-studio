# Changelog

## 3.0.1

- Make paper size, orientation, and all four margin controls override
  conflicting HTML `@page` rules.
- Refresh an existing PDF preview automatically after source or setting
  changes.
- Show the exact saved PDF in the preview after export.
- Refresh relative CSS and image assets whenever Preview is selected.
- Re-render file-mode exports so changed relative assets cannot be replaced by
  an older cached PDF.
- Localize native open/save dialogs in Turkish and English.
- Keep the previous preview visible with a stable error when an automatic
  refresh has no valid source, and release PDF.js workers after each render.
- Serialize preference writes so rapid language, theme, and color changes are
  all restored correctly after relaunch.
- Replace the source-only smoke check with geometry-based PDF, safe-save, and
  UI tests.
- Run self-tests against packaged Windows, macOS Intel, macOS Apple Silicon,
  and Linux applications before publishing a release.
- Stage the unpacked Linux application in a space-free runtime path before
  exercising Chromium's sandbox; ZIP and DEB artifacts are tested separately.
- Build macOS artifacts on matching native Intel and Apple Silicon runners and
  apply a verifiable ad-hoc signature when Developer ID credentials are not
  available.
- Restrict build jobs to read-only repository access and reject release tags
  that do not match the application version.
- Audit production dependencies before packaging; the v3.0.1 runtime reports
  no known high-severity vulnerabilities.
