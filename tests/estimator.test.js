"use strict";
const assert = require("node:assert/strict");
const {parseDescription,calculate}=require("../estimator.js");

const description="wall 20 x 8
wall 12 x 8
opening 3 x 7
opening 4 x 4";
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
assert.equal(result.laborHours,30.72);
assert.equal(result.studSubtotal,135);
assert.equal(result.sheathingSubtotal,168);
assert.ok(Math.abs(result.grandTotal-2299.8)<1e-8);

const small=calculate("WALL 8ft x 8ft
OPENING 2 x 3",{...options,pricePerStud:0,pricePerSheet:0,hoursPerSqFt:0,hourlyRate:0});
assert.equal(small.totalStuds,9);
assert.equal(small.netAreaSqFt,58);
assert.equal(small.grandTotal,0);
assert.throws(()=>parseDescription("roof 20 x 8"),/Line 1/);
assert.throws(()=>parseDescription("opening 3 x 7"),/at least one wall/);
assert.throws(()=>calculate("wall 2 x 4
opening 3 x 7",options),/Opening area exceeds/);
assert.throws(()=>calculate("wall 20 x 8
opening 2 x 9",options),/does not fit any listed wall/);
assert.throws(()=>calculate("wall 8 x 8
wall 20 x 4
opening 12 x 6",options),/does not fit any listed wall/);
assert.equal(calculate("wall 20 x 8
opening 2 x 7",options).openingAreaSqFt,14);
assert.throws(()=>calculate("wall 20 x 8",{...options,spacingIn:0}),/greater than zero/);
assert.throws(()=>calculate("wall 20 x 8",{...options,wastePercent:101}),/100 or less/);
assert.throws(()=>calculate("wall 20 x 8",{...options,pricePerSheet:-1}),/zero or greater/);
// Physically impossible even though every opening fits some wall and net area is positive.
assert.throws(()=>calculate("wall 10 x 8
opening 6 x 4
opening 6 x 4",options),/cannot be allocated/);
// Backtracking must move the 6-ft opening to the second wall to fit 7+3 on the first.
const allocated=calculate("wall 10 x 8
wall 6 x 8
opening 6 x 7
opening 7 x 4
opening 3 x 3",options);
assert.deepEqual(allocated.openingWallNumbers,[2,1,1]);
assert.throws(()=>calculate("wall 10 x 8
wall 10 x 4
opening 7 x 7
opening 7 x 7",options),/cannot be allocated/);
// Explicit opening-to-wall assignment must override automatic allocation.
const pinned=calculate("wall 10 x 8
wall 12 x 8
opening 4 x 7 @2
opening 3 x 3 @1",options);
assert.deepEqual(pinned.openingWallNumbers,[2,1]);
assert.equal(pinned.openingAreaSqFt,37);
assert.throws(()=>calculate("wall 10 x 8
opening 3 x 7 @2",options),/does not fit any listed wall/);
assert.throws(()=>calculate("wall 10 x 8
wall 10 x 8
opening 7 x 7 @1
opening 7 x 7 @1",options),/cannot be allocated/);
assert.throws(()=>parseDescription("wall 10 x 8 @1"),/wall entries cannot/);
console.log("EZ Construction estimator: all deterministic assertions passed");
