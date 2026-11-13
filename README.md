# EZ Construction

A small, local-first construction estimating workbench. **The job is the interface.** Describe the walls and openings, enter your own prices, calculate a reproducible rough takeoff, and export the work.

## First working increment

Open `index.html` in a browser. No install, account, connection, or server required. The screen accepts one line per wall/opening, e.g.:

```text
wall 20 x 8
wall 12 x 8
opening 3 x 7
opening 4 x 4
```

All dimensions in **feet**. Set stud spacing, prices, waste, and labor assumptions on the screen. Press **Calculate**. Export a JSON evidence snapshot or a simple CSV estimate. The calculation library in `estimator.js` is shared with its offline Node tests: `node tests/estimator.test.js`.

**This is a working quantity and cost *estimate*, not a structural design or a fabrication cutlist.** It counts indicative full-height framing positions plus two supplementary studs per opening, and estimates 4x8 sheathing by net area with a waste allowance. It does **not** calculate wall headers, cripple studs, stud-length selection, fasteners, sheathing cut/nesting, wall intersections, structural loads, code compliance, framing engineering, or dynamic regional prices. The user supplies rates; no private business data ships with the source. No BEAN, Axiom, or pricing supplier is connected yet. Estimates are clearly based on assumptions and can be exported for later review.

## Product direction

- Keep plain-English description and one-click estimates at the center, not a maze of dialogs.
- Import reviewed spreadsheet/CSV and drawing data without assuming dimensions or prices.
- Build multi-trade quantity takeoffs and editable labor/material assemblies.
- Reuse Axiom/EZstimate contracts for approved quote transfer, maintain bid version history, and wire BEAN as a transparent assistant when actually available.
- Expand to actual construction models and plans, with traceable source documents and explicit missing values.

Everything here uses synthetic example values. Never commit customer plans, quotes, proprietary prices, or credentials.
