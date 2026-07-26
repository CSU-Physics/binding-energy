import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const datasetUrl = new URL(
  "../public/data/nuclides.json",
  import.meta.url,
);
const dataset = JSON.parse(await readFile(datasetUrl, "utf8"));
const records = Object.values(dataset.nuclides);

assert.equal(
  records.length,
  dataset.metadata.recordCount,
  "metadata.recordCount must match the lookup table",
);

const calculableRecordCount = records.filter(
  (record) =>
    record.atomicMassU !== null &&
    record.bindingEnergyPerNucleonMeV !== null,
).length;

assert.equal(
  calculableRecordCount,
  dataset.metadata.calculableRecordCount,
  "metadata.calculableRecordCount must match the lookup table",
);

for (const [key, record] of Object.entries(dataset.nuclides)) {
  assert.equal(key, `${record.z}:${record.n}`);
  assert.equal(record.a, record.z + record.n);
  assert.ok(Number.isInteger(record.z) && record.z >= 1);
  assert.ok(Number.isInteger(record.n) && record.n >= 0);
  assert.ok(record.symbol);
}

const assertClose = (actual, expected, tolerance = 1e-10) => {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `Expected ${actual} to be within ${tolerance} of ${expected}`,
  );
};

const hydrogen2 = dataset.nuclides["1:1"];
assert.equal(hydrogen2.symbol, "H");
assertClose(hydrogen2.atomicMassU, 2.014101777844);
assertClose(hydrogen2.bindingEnergyPerNucleonMeV, 1.1122831);

const hydrogen3 = dataset.nuclides["1:2"];
assert.equal(hydrogen3.symbol, "H");
assertClose(hydrogen3.atomicMassU, 3.01604928132);
assertClose(hydrogen3.bindingEnergyPerNucleonMeV, 2.8272654);

const lead208 = dataset.nuclides["82:126"];
assert.equal(lead208.symbol, "Pb");
assertClose(lead208.atomicMassU, 207.976652005);
assertClose(lead208.bindingEnergyPerNucleonMeV, 7.867453);

console.log(
  `Validated ${records.length} nuclides ` +
    `(${calculableRecordCount} with mass and binding data).`,
);
