import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  DEFAULT_POLICY,
  compareDatasets,
  createMarkdownReport,
} from "./compare-nuclide-data.mjs";
import { validateDataset } from "./validate-nuclide-data.mjs";

const committedDataset = JSON.parse(
  await readFile(
    new URL("../public/data/nuclides.json", import.meta.url),
    "utf8",
  ),
);

const makeRecord = (z, n, overrides = {}) => ({
  z,
  n,
  a: z + n,
  symbol: "H",
  atomicMassU: z + n,
  atomicMassUncertaintyU: 0,
  bindingEnergyPerNucleonMeV: 1,
  bindingEnergyPerNucleonUncertaintyMeV: 0,
  ...overrides,
});

const makeDataset = ({
  records = { "1:1": makeRecord(1, 1) },
  sourceSha256 = "a".repeat(64),
  extractionDate = "2023-10-18",
} = {}) => ({
  metadata: {
    sourceSha256,
    extractionDates: [extractionDate],
    recordCount: Object.keys(records).length,
    calculableRecordCount: Object.values(records).filter(
      (record) => record.atomicMassU !== null,
    ).length,
  },
  nuclides: records,
});

const makeRecords = (count) =>
  Object.fromEntries(
    Array.from({ length: count }, (_, index) => {
      const n = index + 1;
      return [`1:${n}`, makeRecord(1, n)];
    }),
  );

test("strict validation accepts the committed snapshot", () => {
  const summary = validateDataset(committedDataset);

  assert.equal(summary.recordCount, 3383);
  assert.equal(summary.calculableRecordCount, 3356);
});

test("strict validation rejects non-finite scientific values", () => {
  const invalidDataset = structuredClone(committedDataset);
  invalidDataset.nuclides["1:1"].atomicMassU = Number.NaN;

  assert.throws(
    () => validateDataset(invalidDataset),
    /finite number or null/,
  );
});

test("strict validation rejects inconsistent metadata counts", () => {
  const invalidDataset = structuredClone(committedDataset);
  invalidDataset.metadata.recordCount += 1;

  assert.throws(
    () => validateDataset(invalidDataset),
    /recordCount must match/,
  );
});

test("comparison passes identical snapshots", () => {
  const baseline = makeDataset();
  const report = compareDatasets(baseline, structuredClone(baseline));

  assert.equal(report.status, "pass");
  assert.equal(report.hasDatasetChanges, false);
  assert.equal(report.changes.modifiedCount, 0);
  assert.deepEqual(report.violations, []);
});

test("comparison reports an acceptable new nuclide", () => {
  const records = makeRecords(20);
  const baseline = makeDataset({ records });
  const candidate = makeDataset({
    records: {
      ...baseline.nuclides,
      "1:21": makeRecord(1, 21),
    },
    sourceSha256: "b".repeat(64),
    extractionDate: "2024-01-01",
  });
  const report = compareDatasets(baseline, candidate);

  assert.equal(report.status, "pass");
  assert.equal(report.changes.addedCount, 1);
  assert.deepEqual(report.changes.addedKeys, ["1:21"]);
});

test("comparison rejects a changed source without a newer extraction date", () => {
  const baseline = makeDataset();
  const candidate = makeDataset({
    sourceSha256: "b".repeat(64),
  });
  const report = compareDatasets(baseline, candidate);

  assert.equal(report.status, "rejected");
  assert.match(report.violations.join("\n"), /newer extraction date/);
});

test("comparison rejects excessive record removal", () => {
  const records = Object.fromEntries(
    Array.from({ length: 30 }, (_, index) => {
      const n = index + 1;
      return [`1:${n}`, makeRecord(1, n)];
    }),
  );
  const baseline = makeDataset({ records });
  const candidate = makeDataset({
    records: Object.fromEntries(Object.entries(records).slice(10)),
    sourceSha256: "b".repeat(64),
    extractionDate: "2024-01-01",
  });
  const report = compareDatasets(baseline, candidate, {
    ...DEFAULT_POLICY,
    maximumRecordCountChangeFraction: 1,
    maximumRemovedRecordFraction: 0,
    maximumRemovedRecords: 5,
    maximumCalculableRecordLossFraction: 1,
    maximumCalculableRecordLoss: 30,
  });

  assert.equal(report.status, "rejected");
  assert.match(report.violations.join("\n"), /nuclides were removed/);
});

test("comparison rejects a large binding-energy change", () => {
  const baseline = makeDataset();
  const candidate = makeDataset({
    records: {
      "1:1": makeRecord(1, 1, {
        bindingEnergyPerNucleonMeV: 1.2,
      }),
    },
    sourceSha256: "b".repeat(64),
    extractionDate: "2024-01-01",
  });
  const report = compareDatasets(baseline, candidate);

  assert.equal(report.status, "rejected");
  assert.match(report.violations.join("\n"), /binding-energy change/);
});

test("markdown report exposes the scientific comparison", () => {
  const records = makeRecords(20);
  const baseline = makeDataset({ records });
  const candidate = makeDataset({
    records: {
      ...baseline.nuclides,
      "1:21": makeRecord(1, 21),
    },
    sourceSha256: "b".repeat(64),
    extractionDate: "2024-01-01",
  });
  const report = compareDatasets(baseline, candidate);
  const markdown = createMarkdownReport(
    report,
    baseline,
    candidate,
  );

  assert.match(markdown, /Status.*PASS/);
  assert.match(markdown, /H-22/);
  assert.match(markdown, /Guardrails/);
});
