# Design QA — image1 dashboard redesign

- source visual truth: `C:\all\Aduino project\image1.png`
- implementation screenshot: `C:\all\Aduino project\docs\design-qa-implementation-v1.png`
- combined full-view comparison: `C:\all\Aduino project\docs\design-qa-comparison-v1.png`
- focused top comparison: `C:\all\Aduino project\docs\design-qa-focus-top-v1.png`
- focused bottom comparison: `C:\all\Aduino project\docs\design-qa-focus-bottom-v1.png`
- state: desktop dashboard, DHT11 pack selected, device disconnected, no measurement, no saved record
- browser: Edge, browser-rendered Vite development build

## Viewport and normalization

- Source pixels: 1672 × 941. The top 84 px are browser chrome and are not part of the app.
- Source app crop: 1672 × 856 CSS-equivalent px, `x=0`, `y=84`.
- Implementation CSS viewport: 1672 × 856.
- Browser capture: the 1672 × 856 app was presented at 0.5 scale solely for the capture pipeline and rasterized to 627 × 321.
- Density normalization: the source app crop was downsampled to the same 627 × 321 pixels before comparison. The two normalized images are joined side by side in `docs/design-qa-comparison-v1.png`.

## Full-view comparison evidence

The comparison confirms the same principal composition: 72 px application header, 178 px left navigation, three-panel top row, workflow plus wide simulation middle row, three-panel bottom row, and 50 px status footer. Browser-measured final desktop panel rectangles were:

| Region | Implementation | Reference target | Result |
|---|---:|---:|---|
| Hero | x190 y84 w647 h304 | x191 y84 w645 h304 | within 2 px |
| Sensor | x849 y84 w294 h304 | x847 y84 w293 h304 | within 2 px |
| Measurement | x1155 y84 w505 h304 | x1152 y84 w504 h304 | within 3 px |
| Workflow | x190 y400 w647 h176 | x191 y400 w645 h176 | within 2 px |
| Simulation | x849 y400 w811 h176 | x847 y400 w809 h176 | within 2 px |
| Bottom row | y588 h201 | y588 h198–201 | within 3 px |

There was no page-level horizontal overflow at the desktop target. The bottom footer was browser-measured at y403–428 in the normalized 0.5 capture, corresponding to y806–856 in the full CSS viewport.

## Focused comparison evidence

- Top region: the brand header, sidebar density, pale-blue scientist hero, three mode cards, device card, blue primary action, and live-measurement panel use the same hierarchy, palette, radii, and visual rhythm as the source.
- Bottom region: the five-step workflow, dark space simulation asset, photo-led lesson cards, local record panel, readiness panel, and white footer preserve the source layout and visual weight.
- Real raster assets are used for the brand mark, hero scientist, UNO-style board, teacher avatar, simulation poster, and three lesson thumbnails. UI icons use one Lucide line-icon family. No emoji, CSS illustration, inline handcrafted SVG asset, or screenshot crop is used in the product UI.

## Required fidelity surfaces

- Fonts and typography: Korean system/Pretendard stack, 13–14 px base UI hierarchy, 28 px hero heading, 15 px panel headings, compact labels and values. No actionable wrapping or truncation mismatch remains.
- Spacing and layout rhythm: 12 px dashboard gaps, 8 px large-panel radii, 7–12 px internal card radii, one-pixel borders, and restrained shadows match the reference density.
- Colors and visual tokens: light `#f6f8fb` canvas, white surfaces, `#1464d2` blue primary, navy text, muted blue-gray labels, and separate success/warning/error colors.
- Image quality: generated project assets use the same educational 3D/photo direction and correct slot-specific crops; optimized JPEG derivatives are used in the app.
- Copy and content: visible content is Korean and app-specific. Reference-only live numbers, class activity, and saved-file names were intentionally not copied because they would falsely imply actual sensor/student data.
- Icons: a single Lucide family is used for navigation, states, modes, actions, sensors, and workflow.
- Accessibility and interaction: semantic landmarks/headings, visible focus rings, labeled controls, disabled unavailable modes, reduced-motion support, no desktop horizontal overflow, and CSS tablet/mobile layouts are present.

## Findings and comparison history

### Iteration 1

- [P1] The previous implementation was a centered 1180 px green landing flow instead of the source dashboard.
  - Fix: rebuilt the application shell as the measured header/sidebar/three-row dashboard while retaining all serial, measurement, and storage handlers.
  - Post-fix evidence: `docs/design-qa-comparison-v1.png`; measured major panel edges are within 2–3 px of the source.
- [P2] Visible image assets and icons did not match the source art direction.
  - Fix: added slot-specific raster assets and Lucide icons; removed rendered emoji from experiment and safety surfaces.
  - Post-fix evidence: `docs/design-qa-focus-top-v1.png` and `docs/design-qa-focus-bottom-v1.png`.
- [P2] Reference live numbers and class/storage records could tempt a false-data implementation.
  - Fix: preserved honest empty states (`—`, disconnected, zero records), an explicit demo badge, disabled real-data save, and “준비 중” labels for unavailable modes.
  - Post-fix evidence: browser interaction produced two `.source-demo` badges, kept save disabled, and showed the demo-not-real warning.

No actionable P0, P1, or P2 mismatch remains. Residual differences are intentional product constraints: three implemented experiment packs rather than five decorative source cards, no fake video playback controls, and no fabricated class or stored-data activity.

## Browser verification

- Primary interaction tested: demo data action.
- Result: two demo badges rendered, actual-result save remained disabled, and the “실제 센서 측정 결과가 아니에요” warning was visible.
- Device connection was not invoked in visual QA because it requires a real Web Serial chooser and hardware; protocol behavior remains covered by automated tests.
- Console errors and warnings checked: none.

## Follow-up polish

- [P3] A future teacher-data backend could populate the class and saved-data panels without placeholders.
- [P3] A real simulation module could replace the explicitly labeled static preview.

final result: passed
