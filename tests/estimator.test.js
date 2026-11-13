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
assert.throws(()=>calculate("wall 20 x 8",{...options,spacingIn:0}),/greater than zero/);
assert.throws(()=>calculate("wall 20 x 8",{...options,wastePercent:101}),/100 or less/);
assert.throws(()=>calculate("wall 20 x 8",{...options,pricePerSheet:-1}),/zero or greater/);
console.log("EZ Construction estimator: all deterministic assertions passed");
