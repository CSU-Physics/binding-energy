import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_DATASET_PATH = new URL(
  "../public/data/nuclides.json",
  import.meta.url,
);

const EXPECTED_SOURCE_URL =
  "https://nds.iaea.org/relnsd/v1/data?fields=ground_states&nuclides=all";
const MINIMUM_RECORD_COUNT = 3_000;
const MINIMUM_CALCULABLE_RECORD_COUNT = 3_000;

const REFERENCE_NUCLIDES = [
  {
    key: "1:1",
    label: "H-2",
    symbol: "H",
    atomicMassU: 2.014101777844,
    bindingEnergyPerNucleonMeV: 1.1122831,
  },
  {
    key: "2:2",
    label: "He-4",
    symbol: "He",
    atomicMassU: 4.00260325413,
    bindingEnergyPerNucleonMeV: 7.0739156,
  },
  {
    key: "6:6",
    label: "C-12",
    symbol: "C",
    atomicMassU: 12,
    bindingEnergyPerNucleonMeV: 7.6801446,
  },
  {
    key: "26:30",
    label: "Fe-56",
    symbol: "Fe",
    atomicMassU: 55.934935537,
    bindingEnergyPerNucleonMeV: 8.7903563,
  },
  {
    key: "82:126",
    label: "Pb-208",
    symbol: "Pb",
    atomicMassU: 207.976652005,
    bindingEnergyPerNucleonMeV: 7.867453,
  },
];

const isPlainObject = (value) =>
  value !== null &&
  typeof value === "object" &&
  !Array.isArray(value);

const assertFiniteOrNull = (value, label) => {
  assert.ok(
    value === null || Number.isFinite(value),
    `${label} must be a finite number or null`,
  );
};

const assertInRange = (value, minimum, maximum, label) => {
  assert.ok(
    value >= minimum && value <= maximum,
    `${label} must be between ${minimum} and ${maximum}; received ${value}`,
  );
};

const assertClose = (actual, expected, tolerance, label) => {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${label} changed by more than ${tolerance}: ` +
      `expected approximately ${expected}, received ${actual}`,
  );
};

const assertValidExtractionDate = (date) => {
  assert.match(
    date,
    /^\d{4}-\d{2}-\d{2}$/,
    `Invalid extraction date format: ${date}`,
  );

  const parsedDate = new Date(`${date}T00:00:00Z`);
  assert.ok(
    !Number.isNaN(parsedDate.getTime()) &&
      parsedDate.toISOString().slice(0, 10) === date,
    `Invalid extraction date: ${date}`,
  );
  assert.ok(
    parsedDate.getTime() <= Date.now() + 24 * 60 * 60 * 1_000,
    `Extraction date cannot be in the future: ${date}`,
  );
};

const validateMetadata = (metadata) => {
  assert.ok(isPlainObject(metadata), "metadata must be an object");
  assert.equal(
    metadata.title,
    "IAEA LiveChart ground-state nuclide data",
  );
  assert.equal(metadata.source, "IAEA Nuclear Data Services");
  assert.equal(metadata.sourceUrl, EXPECTED_SOURCE_URL);
  assert.equal(metadata.sourceApiVersion, "v1");
  assert.match(
    metadata.sourceSha256,
    /^[a-f0-9]{64}$/,
    "metadata.sourceSha256 must be a lowercase SHA-256 digest",
  );
  assert.ok(
    Array.isArray(metadata.extractionDates) &&
      metadata.extractionDates.length > 0,
    "metadata.extractionDates must contain at least one date",
  );

  const uniqueExtractionDates = [...new Set(metadata.extractionDates)];
  assert.equal(
    uniqueExtractionDates.length,
    metadata.extractionDates.length,
    "metadata.extractionDates must not contain duplicates",
  );
  assert.deepEqual(
    [...metadata.extractionDates].sort(),
    metadata.extractionDates,
    "metadata.extractionDates must be sorted",
  );
  metadata.extractionDates.forEach(assertValidExtractionDate);

  assert.ok(
    Number.isInteger(metadata.recordCount) &&
      metadata.recordCount >= MINIMUM_RECORD_COUNT,
    `metadata.recordCount must be at least ${MINIMUM_RECORD_COUNT}`,
  );
  assert.ok(
    Number.isInteger(metadata.calculableRecordCount) &&
      metadata.calculableRecordCount >= MINIMUM_CALCULABLE_RECORD_COUNT,
    `metadata.calculableRecordCount must be at least ` +
      `${MINIMUM_CALCULABLE_RECORD_COUNT}`,
  );
  assert.ok(
    metadata.calculableRecordCount <= metadata.recordCount,
    "metadata.calculableRecordCount cannot exceed metadata.recordCount",
  );

  assert.equal(metadata.originalAtomicMassUnit, "micro-u");
  assert.equal(metadata.storedAtomicMassUnit, "u");
  assert.equal(
    metadata.originalBindingEnergyUnit,
    "keV per nucleon",
  );
  assert.equal(
    metadata.storedBindingEnergyUnit,
    "MeV per nucleon",
  );
};

const validateRecord = (key, record, seenPairs, symbolsByZ) => {
  assert.ok(isPlainObject(record), `${key} must be an object`);
  assert.match(key, /^\d+:\d+$/, `Invalid nuclide lookup key: ${key}`);

  assert.ok(
    Number.isInteger(record.z) && record.z >= 1 && record.z <= 200,
    `${key}.z must be an integer between 1 and 200`,
  );
  assert.ok(
    Number.isInteger(record.n) && record.n >= 0 && record.n <= 400,
    `${key}.n must be an integer between 0 and 400`,
  );
  assert.equal(key, `${record.z}:${record.n}`);
  assert.equal(record.a, record.z + record.n);
  assertInRange(record.a, 1, 600, `${key}.a`);

  assert.match(
    record.symbol,
    /^[A-Z][a-z]{0,2}$/,
    `${key}.symbol must be a valid element symbol`,
  );

  const pair = `${record.z}:${record.n}`;
  assert.ok(!seenPairs.has(pair), `Duplicate nuclide pair found: ${pair}`);
  seenPairs.add(pair);

  const knownSymbol = symbolsByZ.get(record.z);
  if (knownSymbol) {
    assert.equal(
      record.symbol,
      knownSymbol,
      `Inconsistent symbols for Z=${record.z}`,
    );
  } else {
    symbolsByZ.set(record.z, record.symbol);
  }

  const numericFields = [
    "atomicMassU",
    "atomicMassUncertaintyU",
    "bindingEnergyPerNucleonMeV",
    "bindingEnergyPerNucleonUncertaintyMeV",
  ];

  for (const field of numericFields) {
    assert.ok(
      Object.hasOwn(record, field),
      `${key}.${field} is required`,
    );
    assertFiniteOrNull(record[field], `${key}.${field}`);
  }

  assert.equal(
    record.atomicMassU === null,
    record.atomicMassUncertaintyU === null,
    `${key} mass and mass uncertainty must both be present or null`,
  );
  assert.equal(
    record.bindingEnergyPerNucleonMeV === null,
    record.bindingEnergyPerNucleonUncertaintyMeV === null,
    `${key} binding energy and uncertainty must both be present or null`,
  );
  assert.equal(
    record.atomicMassU === null,
    record.bindingEnergyPerNucleonMeV === null,
    `${key} mass and binding-energy availability must agree`,
  );

  if (record.atomicMassU !== null) {
    assertInRange(record.atomicMassU, 0.5, 600, `${key}.atomicMassU`);
    assert.ok(
      Math.abs(record.atomicMassU - record.a) <= 2,
      `${key}.atomicMassU is not physically consistent with A=${record.a}`,
    );
    assertInRange(
      record.atomicMassUncertaintyU,
      0,
      1,
      `${key}.atomicMassUncertaintyU`,
    );
    assertInRange(
      record.bindingEnergyPerNucleonMeV,
      0,
      10,
      `${key}.bindingEnergyPerNucleonMeV`,
    );
    assertInRange(
      record.bindingEnergyPerNucleonUncertaintyMeV,
      0,
      1,
      `${key}.bindingEnergyPerNucleonUncertaintyMeV`,
    );
  }
};

const validateReferenceNuclides = (nuclides) => {
  for (const reference of REFERENCE_NUCLIDES) {
    const record = nuclides[reference.key];
    assert.ok(record, `Reference nuclide ${reference.label} is missing`);
    assert.equal(record.symbol, reference.symbol);
    assertClose(
      record.atomicMassU,
      reference.atomicMassU,
      0.001,
      `${reference.label} atomic mass`,
    );
    assertClose(
      record.bindingEnergyPerNucleonMeV,
      reference.bindingEnergyPerNucleonMeV,
      0.001,
      `${reference.label} binding energy per nucleon`,
    );
  }
};

const validateDataset = (dataset) => {
  assert.ok(isPlainObject(dataset), "dataset must be an object");
  validateMetadata(dataset.metadata);
  assert.ok(isPlainObject(dataset.nuclides), "nuclides must be an object");

  const entries = Object.entries(dataset.nuclides);
  assert.equal(
    entries.length,
    dataset.metadata.recordCount,
    "metadata.recordCount must match the lookup table",
  );

  const seenPairs = new Set();
  const symbolsByZ = new Map();

  for (const [key, record] of entries) {
    validateRecord(key, record, seenPairs, symbolsByZ);
  }

  const calculableRecordCount = entries.filter(
    ([, record]) =>
      record.atomicMassU !== null &&
      record.bindingEnergyPerNucleonMeV !== null,
  ).length;

  assert.equal(
    calculableRecordCount,
    dataset.metadata.calculableRecordCount,
    "metadata.calculableRecordCount must match the lookup table",
  );

  validateReferenceNuclides(dataset.nuclides);

  return {
    recordCount: entries.length,
    calculableRecordCount,
  };
};

const loadAndValidateDataset = async (datasetPath = DEFAULT_DATASET_PATH) => {
  const datasetText = await readFile(datasetPath, "utf8");
  const dataset = JSON.parse(datasetText);
  const summary = validateDataset(dataset);

  return { dataset, summary };
};

const main = async () => {
  const datasetPath = process.argv[2]
    ? resolve(process.argv[2])
    : DEFAULT_DATASET_PATH;
  const { summary } = await loadAndValidateDataset(datasetPath);

  console.log(
    `Validated ${summary.recordCount} nuclides ` +
      `(${summary.calculableRecordCount} with mass and binding data).`,
  );
};

const isMainModule =
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isMainModule) {
  await main();
}

export {
  DEFAULT_DATASET_PATH,
  REFERENCE_NUCLIDES,
  loadAndValidateDataset,
  validateDataset,
};
