/* EZ Construction deterministic wall takeoff. No remote calls or AI inference. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.EZConstruction = api;
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";

  function positive(value, label, allowZero) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0 || (!allowZero && n === 0)) {
      throw new Error(label + " must be " + (allowZero ? "zero or greater" : "greater than zero") + ".");
    }
    return n;
  }

  function parseDescription(description) {
    if (typeof description !== "string") throw new Error("Enter a wall description.");
    const walls = [];
    const openings = [];
    description.split(/\r?
/).forEach(function (line, index) {
      const source = line.trim();
      if (!source || source.startsWith("#")) return;
      const match = /^(wall|opening)\s+(\d+(?:\.\d+)?)\s*(?:ft|feet|')?\s*[x×]\s*(\d+(?:\.\d+)?)\s*(?:ft|feet|')?\s*(?:@([1-9]\d*))?\s*$/i.exec(source);
      if (!match) {
        throw new Error("Line " + (index + 1) + ": use 'wall 20 x 8' or 'opening 3 x 7' (feet).");
      }
      const length = positive(match[2], "Line " + (index + 1) + " width");
      const height = positive(match[3], "Line " + (index + 1) + " height");
      if (match[1].toLowerCase() === "wall") {
        if (match[4]) throw new Error("Line " + (index + 1) + ": wall entries cannot have an opening assignment.");
        walls.push({ lengthFt: length, heightFt: height });
      } else {
        openings.push({ lengthFt: length, heightFt: height, wallNumber: match[4] ? Number(match[4]) : null });
      }
    });
    if (!walls.length) throw new Error("Add at least one wall, such as 'wall 20 x 8'.");
    return { walls: walls, openings: openings };
  }

  function calculate(description, options) {
    const parsed = parseDescription(description);
    const o = options || {};
    const spacingIn = positive(o.spacingIn, "Stud spacing");
    const wastePercent = positive(o.wastePercent, "Waste percentage", true);
    const pricePerStud = positive(o.pricePerStud, "Price per stud", true);
    const pricePerSheet = positive(o.pricePerSheet, "Price per sheet", true);
    const hoursPerSqFt = positive(o.hoursPerSqFt, "Labor hours per square foot", true);
    const hourlyRate = positive(o.hourlyRate, "Labor hourly rate", true);
    if (spacingIn > 48) throw new Error("Stud spacing greater than 48 inches is outside this estimator.");
    if (wastePercent > 100) throw new Error("Waste percentage must be 100 or less.");

    const grossAreaSqFt = parsed.walls.reduce((sum, wall) => sum + wall.lengthFt * wall.heightFt, 0);
    const openingAreaSqFt = parsed.openings.reduce((sum, item) => sum + item.lengthFt * item.heightFt, 0);
    if (openingAreaSqFt > grossAreaSqFt) throw new Error("Opening area exceeds total wall area. Recheck entries.");

    // Area alone is insufficient: a single opening must fit a physical wall.
    // Openings are not assigned to walls in the current description syntax.
    parsed.openings.forEach(function (opening, index) {
      const fitsSomeWall = parsed.walls.some(function (wall) {
        return (opening.wallNumber === null || opening.wallNumber === parsed.walls.indexOf(wall) + 1) && opening.lengthFt <= wall.lengthFt && opening.heightFt <= wall.heightFt;
      });
      if (!fitsSomeWall) {
        throw new Error("Opening " + (index + 1) + " does not fit any listed wall dimensions.");
      }
    });

    // Allocate every opening to one physical wall. Each opening consumes its
    // full width; overlapping or stacked openings are not inferred from area.
    // Backtracking avoids rejecting layouts where greedy first-fit fails.
    const remainingWidths = parsed.walls.map(function (wall) { return wall.lengthFt; });
    const assignment = new Array(parsed.openings.length);
    const ordered = parsed.openings.map(function (opening, index) {
      return { opening: opening, index: index };
    }).sort(function (a, b) { return b.opening.lengthFt - a.opening.lengthFt; });
    function allocate(position) {
      if (position === ordered.length) return true;
      const item = ordered[position];
      const tried = new Set();
      for (let wallIndex = 0; wallIndex < parsed.walls.length; wallIndex++) {
        const wall = parsed.walls[wallIndex];
        const available = remainingWidths[wallIndex];
        if ((item.opening.wallNumber !== null && item.opening.wallNumber !== wallIndex + 1) || wall.heightFt < item.opening.heightFt || available + 1e-9 < item.opening.lengthFt) continue;
        const signature = wall.heightFt + ":" + available;
        if (tried.has(signature)) continue;
        tried.add(signature);
        remainingWidths[wallIndex] -= item.opening.lengthFt;
        assignment[item.index] = wallIndex + 1;
        if (allocate(position + 1)) return true;
        remainingWidths[wallIndex] += item.opening.lengthFt;
      }
      return false;
    }
    if (!allocate(0)) {
      throw new Error("Openings cannot be allocated to wall widths without overlap; split or revise the layout.");
    }

    const netAreaSqFt = grossAreaSqFt - openingAreaSqFt;
    const fullHeightPositions = parsed.walls.reduce((sum, wall) => sum + Math.ceil(wall.lengthFt * 12 / spacingIn) + 1, 0);
    const supplementaryStuds = parsed.openings.length * 2;
    const totalStuds = fullHeightPositions + supplementaryStuds;
    const sheets4x8 = Math.ceil((netAreaSqFt * (1 + wastePercent / 100)) / 32);
    const laborHours = grossAreaSqFt * hoursPerSqFt;
    const studSubtotal = totalStuds * pricePerStud;
    const sheathingSubtotal = sheets4x8 * pricePerSheet;
    const materialSubtotal = studSubtotal + sheathingSubtotal;
    const laborSubtotal = laborHours * hourlyRate;
    return {
      wallCount: parsed.walls.length,
      openingCount: parsed.openings.length,
      openingWallNumbers: assignment,
      grossAreaSqFt: grossAreaSqFt,
      openingAreaSqFt: openingAreaSqFt,
      netAreaSqFt: netAreaSqFt,
      fullHeightPositions: fullHeightPositions,
      supplementaryStuds: supplementaryStuds,
      totalStuds: totalStuds,
      sheets4x8: sheets4x8,
      laborHours: laborHours,
      studSubtotal: studSubtotal,
      sheathingSubtotal: sheathingSubtotal,
      materialSubtotal: materialSubtotal,
      laborSubtotal: laborSubtotal,
      grandTotal: materialSubtotal + laborSubtotal,
      options: {spacingIn, wastePercent, pricePerStud, pricePerSheet, hoursPerSqFt, hourlyRate},
      parsed: parsed,
      assumptions: [
        "Openings may be assigned to numbered walls with @N; unassigned openings are allocated by width. Exact positions and vertical stacking are not modeled.",
        "Area-only material estimate; sheathing cut placement and usable offcuts are not modeled.",
        "Two supplementary framing studs per opening are a rough allowance, not an engineered opening assembly.",
        "Headers, trimmers, cripple studs, fasteners, connectors, corners and wall intersections are not calculated.",
        "Stud pricing must match the required wall height and selected lumber specification.",
        "Labor and prices are user-supplied assumptions. This is not a structural or building-code verification."
      ]
    };
  }
  return { parseDescription: parseDescription, calculate: calculate };
});
