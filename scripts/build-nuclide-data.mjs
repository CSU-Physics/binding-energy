import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { parse } from "csv-parse/sync";

const SOURCE_URL =
  "https://nds.iaea.org/relnsd/v1/data?fields=ground_states&nuclides=all";

const numberOrNull = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  const text = String(value).trim();

  if (text === "") {
    return null;
  }

  const number = Number(text);
  return Number.isFinite(number) ? number : null;
};

const scaleOrNull = (value, divisor) =>
  value === null ? null : Number((value / divisor).toFixed(12));

console.log("Downloading IAEA LiveChart ground-state data...");

const response = await fetch(SOURCE_URL, {
  headers: {
    "User-Agent": "CSU-Binding-Energy/1.0",
  },
});

if (!response.ok) {
  throw new Error(
    `IAEA download failed: ${response.status} ${response.statusText}`,
  );
}

const csvText = await response.text();
const sourceSha256 = createHash("sha256").update(csvText).digest("hex");

const rows = parse(csvText, {
  columns: true,
  skip_empty_lines: true,
  bom: true,
  relax_column_count: true,
});

rows.sort((first, second) => {
  const zDifference = Number(first.z) - Number(second.z);

  if (zDifference !== 0) {
    return zDifference;
  }

  return Number(first.n) - Number(second.n);
});

const nuclides = {};
const extractionDates = new Set();

for (const row of rows) {
  const z = numberOrNull(row.z);
  const n = numberOrNull(row.n);

  // The calculator models nuclei, so free-neutron records with Z = 0 are
  // deliberately excluded from its lookup table.
  if (!Number.isInteger(z) || !Number.isInteger(n) || z < 1 || n < 0) {
    continue;
  }

  const key = `${z}:${n}`;

  if (nuclides[key]) {
    throw new Error(`Duplicate nuclide found for Z=${z}, N=${n}`);
  }

  const atomicMassMicroU = numberOrNull(row.atomic_mass);
  const atomicMassUncertaintyMicroU = numberOrNull(row.unc_am);
  const bindingKeV = numberOrNull(row.binding);
  const bindingUncertaintyKeV = numberOrNull(row.unc_ba);

  if (row.Extraction_date) {
    extractionDates.add(row.Extraction_date);
  }

  nuclides[key] = {
    z,
    n,
    a: z + n,
    symbol: row.symbol || null,
    atomicMassU: scaleOrNull(atomicMassMicroU, 1_000_000),
    atomicMassUncertaintyU: scaleOrNull(
      atomicMassUncertaintyMicroU,
      1_000_000,
    ),
    bindingEnergyPerNucleonMeV: scaleOrNull(bindingKeV, 1_000),
    bindingEnergyPerNucleonUncertaintyMeV: scaleOrNull(
      bindingUncertaintyKeV,
      1_000,
    ),
  };
}

const records = Object.values(nuclides);
const calculableRecordCount = records.filter(
  (record) =>
    record.atomicMassU !== null &&
    record.bindingEnergyPerNucleonMeV !== null,
).length;

const output = {
  metadata: {
    title: "IAEA LiveChart ground-state nuclide data",
    source: "IAEA Nuclear Data Services",
    sourceUrl: SOURCE_URL,
    sourceApiVersion: "v1",
    sourceSha256,
    extractionDates: [...extractionDates].sort(),
    recordCount: records.length,
    calculableRecordCount,
    originalAtomicMassUnit: "micro-u",
    storedAtomicMassUnit: "u",
    originalBindingEnergyUnit: "keV per nucleon",
    storedBindingEnergyUnit: "MeV per nucleon",
  },
  nuclides,
};

const outputDirectory = new URL("../public/data/", import.meta.url);
const outputFile = new URL(
  "../public/data/nuclides.json",
  import.meta.url,
);

await mkdir(outputDirectory, { recursive: true });
await writeFile(outputFile, `${JSON.stringify(output, null, 2)}\n`, "utf8");

console.log(`Created public/data/nuclides.json`);
console.log(`Nuclide records: ${records.length}`);
console.log(`Records with mass and binding data: ${calculableRecordCount}`);
console.log(`Source SHA-256: ${sourceSha256}`);
