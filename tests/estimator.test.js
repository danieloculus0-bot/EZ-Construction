"use strict";
const assert = require("node:assert/strict");
const {parseDescription,calculate}=require("../estimator.js");

const description="wall 20 x 8\nwall 12 x 8\nopening 3 x 7\nopening 4 x 4";
const options={spacingIn:16,wastePercent:10,pricePerStud:4.5,pricePerSheet:21,hoursPerSqFt:0.12,hourlyRate:65};
const parsed=parseDescription(description);
assert.equal(parsed.walls.length,2);
assert.equal(parsed.openings.length,2);

const result=calculate(description,options);
assert.equal(result.grossAreaSqFt,256);
assert.equal(result.openingAreaSqFt,37);
assert.equal(result.netAreaSqFt,219);
assert.equal(result.fullHeightPositions,26);
assert.equal(result.supplementaryStuds,4);
assert.equal(result.totalStuds,30);
assert.equal(result.sheets4x8,8);
assert.equal(result.sheets4x8Independent,9);
assert.deepEqual(result.wallTakeoff.map(w=>w.sheets4x8Independent),[5,4]);
assert.equal(result.independentWallPanelSubtotal,189);
assert.ok(Math.abs(result.independentWallGrandTotal-2320.8)<1e-8);
assert.equal(result.laborHours,30.72);
assert.equal(result.studSubtotal,135);
assert.equal(result.sheathingSubtotal,168);
assert.ok(Math.abs(result.grandTotal-2299.8)<1e-8);

const small=calculate("WALL 8ft x 8ft\nOPENING 2 x 3",{...options,pricePerStud:0,pricePerSheet:0,hoursPerSqFt:0,hourlyRate:0});
assert.equal(small.totalStuds,9);
assert.equal(small.netAreaSqFt,58);
assert.equal(small.grandTotal,0);
assert.throws(()=>parseDescription("roof 20 x 8"),/Line 1/);
assert.throws(()=>parseDescription("opening 3 x 7"),/at least one wall/);
assert.throws(()=>calculate("wall 2 x 4\nopening 3 x 7",options),/Opening area exceeds/);
assert.throws(()=>calculate("wall 20 x 8\nopening 2 x 9",options),/does not fit any listed wall/);
assert.throws(()=>calculate("wall 8 x 8\nwall 20 x 4\nopening 12 x 6",options),/does not fit any listed wall/);
assert.equal(calculate("wall 20 x 8\nopening 2 x 7",options).openingAreaSqFt,14);
assert.throws(()=>calculate("wall 20 x 8",{...options,spacingIn:0}),/greater than zero/);
assert.throws(()=>calculate("wall 20 x 8",{...options,wastePercent:101}),/100 or less/);
assert.throws(()=>calculate("wall 20 x 8",{...options,pricePerSheet:-1}),/zero or greater/);
// Physically impossible even though every opening fits some wall and net area is positive.
assert.throws(()=>calculate("wall 10 x 8\nopening 6 x 4\nopening 6 x 4",options),/cannot be allocated/);
// Backtracking must move the 6-ft opening to the second wall to fit 7+3 on the first.
const allocated=calculate("wall 10 x 8\nwall 6 x 8\nopening 6 x 7\nopening 7 x 4\nopening 3 x 3",options);
assert.deepEqual(allocated.openingWallNumbers,[2,1,1]);
assert.throws(()=>calculate("wall 10 x 8\nwall 10 x 4\nopening 7 x 7\nopening 7 x 7",options),/cannot be allocated/);

const pinned=calculate(`wall 10 x 8
wall 12 x 8
opening 4 x 7 @2
opening 3 x 3 @1`,options);
assert.deepEqual(pinned.openingWallNumbers,[2,1]);
assert.equal(pinned.openingAreaSqFt,37);
assert.throws(()=>calculate(`wall 10 x 8
opening 3 x 7 @2`,options),/does not fit any listed wall/);
assert.throws(()=>calculate(`wall 10 x 8
wall 10 x 8
opening 7 x 7 @1
opening 7 x 7 @1`,options),/cannot be allocated/);
assert.throws(()=>parseDescription("wall 10 x 8 @1"),/wall entries cannot/);

// Equal-sized walls are not interchangeable when a later opening is pinned.
// The 8-ft unassigned opening must go on wall 2, preserving wall 1 for @1.
const symmetricPinned=calculate("wall 10 x 8\nwall 10 x 8\nopening 8 x 4\nopening 7 x 7 @1",options);
assert.deepEqual(symmetricPinned.openingWallNumbers,[2,1]);
assert.equal(symmetricPinned.netAreaSqFt,79);

// Per-wall quantities reconcile after pinned and backtracked allocations.
assert.deepEqual(allocated.wallTakeoff.map(w => w.openingCount), [2, 1]);
assert.deepEqual(allocated.wallTakeoff.map(w => w.openingAreaSqFt), [37, 42]);
assert.equal(allocated.wallTakeoff.reduce((n,w)=>n+w.totalStuds,0), allocated.totalStuds);
assert.equal(allocated.wallTakeoff.reduce((n,w)=>n+w.netAreaSqFt,0), allocated.netAreaSqFt);
assert.deepEqual(pinned.wallTakeoff.map(w=>w.openingCount),[1,1]);
assert.equal(pinned.wallTakeoff[0].openingAreaSqFt,9);
assert.equal(pinned.wallTakeoff[1].openingAreaSqFt,28);

// Rounding each wall separately must not understate pooled area takeoff.
const twoWalls=calculate("wall 4 x 8\\nwall 4 x 8",{...options,wastePercent:0});
assert.equal(twoWalls.sheets4x8,2);
assert.equal(twoWalls.sheets4x8Independent,2);
const splitWalls=calculate("wall 2 x 8\\nwall 2 x 8",{...options,wastePercent:0});
assert.equal(splitWalls.sheets4x8,1);
assert.equal(splitWalls.sheets4x8Independent,2);
assert.equal(splitWalls.wallTakeoff.reduce((n,w)=>n+w.sheets4x8Independent,0),2);

console.log("EZ Construction estimator: all deterministic assertions passed");
