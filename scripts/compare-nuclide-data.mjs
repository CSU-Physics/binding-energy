import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_POLICY = Object.freeze({
  maximumRecordCountChangeFraction: 0.05,
  maximumRemovedRecordFraction: 0.01,
  maximumRemovedRecords: 25,
  maximumCalculableRecordLossFraction: 0.005,
  maximumCalculableRecordLoss: 10,
  maximumAtomicMassChangeU: 0.05,
  maximumBindingEnergyPerNucleonChangeMeV: 0.05,
});

const COMPARISON_FIELDS = [
  "symbol",
  "atomicMassU",
  "atomicMassUncertaintyU",
  "bindingEnergyPerNucleonMeV",
  "bindingEnergyPerNucleonUncertaintyMeV",
];

const NUMERIC_COMPARISON_FIELDS = COMPARISON_FIELDS.filter(
  (field) => field !== "symbol",
);

const formatNumber = (value, maximumFractionDigits = 12) => {
  if (value === null || value === undefined) {
    return "n/a";
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
    useGrouping: false,
  }).format(value);
};

const formatSignedInteger = (value) =>
  value > 0 ? `+${value}` : String(value);

const formatPercent = (value) =>
  `${(value * 100).toFixed(3).replace(/\.?0+$/, "")}%`;

const sortNuclideKeys = (keys) =>
  [...keys].sort((first, second) => {
    const [firstZ, firstN] = first.split(":").map(Number);
    const [secondZ, secondN] = second.split(":").map(Number);
    return firstZ - secondZ || firstN - secondN;
  });

const latestExtractionDate = (dataset) =>
  dataset.metadata.extractionDates.at(-1);

const valuesDiffer = (first, second) => !Object.is(first, second);

const absoluteNumericDifference = (first, second) => {
  if (!Number.isFinite(first) || !Number.isFinite(second)) {
    return null;
  }

  return Math.abs(second - first);
};

const largestChanges = (changes, field, limit = 10) =>
  changes
    .map((change) => ({
      key: change.key,
      symbol: change.candidate.symbol,
      a: change.candidate.a,
      baseline: change.baseline[field],
      candidate: change.candidate[field],
      absoluteChange: absoluteNumericDifference(
        change.baseline[field],
        change.candidate[field],
      ),
    }))
    .filter((change) => change.absoluteChange !== null)
    .sort((first, second) => second.absoluteChange - first.absoluteChange)
    .slice(0, limit);

const compareDatasets = (
  baseline,
  candidate,
  policy = DEFAULT_POLICY,
) => {
  const baselineKeys = new Set(Object.keys(baseline.nuclides));
  const candidateKeys = new Set(Object.keys(candidate.nuclides));
  const addedKeys = sortNuclideKeys(
    [...candidateKeys].filter((key) => !baselineKeys.has(key)),
  );
  const removedKeys = sortNuclideKeys(
    [...baselineKeys].filter((key) => !candidateKeys.has(key)),
  );
  const commonKeys = sortNuclideKeys(
    [...baselineKeys].filter((key) => candidateKeys.has(key)),
  );

  const modifiedRecords = [];
  const fieldChangeCounts = Object.fromEntries(
    COMPARISON_FIELDS.map((field) => [field, 0]),
  );

  for (const key of commonKeys) {
    const baselineRecord = baseline.nuclides[key];
    const candidateRecord = candidate.nuclides[key];
    const changedFields = COMPARISON_FIELDS.filter((field) =>
      valuesDiffer(baselineRecord[field], candidateRecord[field]),
    );

    if (changedFields.length === 0) {
      continue;
    }

    changedFields.forEach((field) => {
      fieldChangeCounts[field] += 1;
    });
    modifiedRecords.push({
      key,
      baseline: baselineRecord,
      candidate: candidateRecord,
      changedFields,
    });
  }

  const baselineRecordCount = baseline.metadata.recordCount;
  const candidateRecordCount = candidate.metadata.recordCount;
  const recordCountChange = candidateRecordCount - baselineRecordCount;
  const recordCountChangeFraction =
    Math.abs(recordCountChange) / baselineRecordCount;

  const baselineCalculableCount =
    baseline.metadata.calculableRecordCount;
  const candidateCalculableCount =
    candidate.metadata.calculableRecordCount;
  const calculableRecordChange =
    candidateCalculableCount - baselineCalculableCount;
  const calculableRecordLoss = Math.max(0, -calculableRecordChange);

  const allowedRemovedRecords = Math.max(
    policy.maximumRemovedRecords,
    Math.ceil(
      baselineRecordCount * policy.maximumRemovedRecordFraction,
    ),
  );
  const allowedCalculableRecordLoss = Math.max(
    policy.maximumCalculableRecordLoss,
    Math.ceil(
      baselineCalculableCount *
        policy.maximumCalculableRecordLossFraction,
    ),
  );

  const massChanges = largestChanges(
    modifiedRecords,
    "atomicMassU",
    modifiedRecords.length,
  );
  const bindingChanges = largestChanges(
    modifiedRecords,
    "bindingEnergyPerNucleonMeV",
    modifiedRecords.length,
  );
  const maximumAtomicMassChangeU =
    massChanges[0]?.absoluteChange ?? 0;
  const maximumBindingEnergyPerNucleonChangeMeV =
    bindingChanges[0]?.absoluteChange ?? 0;

  const baselineExtractionDate = latestExtractionDate(baseline);
  const candidateExtractionDate = latestExtractionDate(candidate);
  const sourceChanged =
    baseline.metadata.sourceSha256 !== candidate.metadata.sourceSha256;
  const violations = [];

  if (
    recordCountChangeFraction >
    policy.maximumRecordCountChangeFraction
  ) {
    violations.push(
      `Record count changed by ${formatPercent(
        recordCountChangeFraction,
      )}; the limit is ${formatPercent(
        policy.maximumRecordCountChangeFraction,
      )}.`,
    );
  }

  if (removedKeys.length > allowedRemovedRecords) {
    violations.push(
      `${removedKeys.length} nuclides were removed; the limit is ` +
        `${allowedRemovedRecords}.`,
    );
  }

  if (calculableRecordLoss > allowedCalculableRecordLoss) {
    violations.push(
      `${calculableRecordLoss} calculable nuclides lost mass or binding ` +
        `data; the limit is ${allowedCalculableRecordLoss}.`,
    );
  }

  if (
    maximumAtomicMassChangeU > policy.maximumAtomicMassChangeU
  ) {
    const largest = massChanges[0];
    violations.push(
      `Largest atomic-mass change is ` +
        `${formatNumber(maximumAtomicMassChangeU)} u for ` +
        `${largest.symbol}-${largest.a} (${largest.key}); the limit is ` +
        `${policy.maximumAtomicMassChangeU} u.`,
    );
  }

  if (
    maximumBindingEnergyPerNucleonChangeMeV >
    policy.maximumBindingEnergyPerNucleonChangeMeV
  ) {
    const largest = bindingChanges[0];
    violations.push(
      `Largest binding-energy change is ` +
        `${formatNumber(
          maximumBindingEnergyPerNucleonChangeMeV,
        )} MeV/nucleon for ${largest.symbol}-${largest.a} ` +
        `(${largest.key}); the limit is ` +
        `${policy.maximumBindingEnergyPerNucleonChangeMeV} MeV/nucleon.`,
    );
  }

  if (candidateExtractionDate < baselineExtractionDate) {
    violations.push(
      `Extraction date regressed from ${baselineExtractionDate} to ` +
        `${candidateExtractionDate}.`,
    );
  }

  if (
    sourceChanged &&
    candidateExtractionDate <= baselineExtractionDate
  ) {
    violations.push(
      "The source checksum changed without a newer extraction date.",
    );
  }

  const hasDatasetChanges =
    sourceChanged ||
    addedKeys.length > 0 ||
    removedKeys.length > 0 ||
    modifiedRecords.length > 0;

  return {
    generatedAt: new Date().toISOString(),
    status: violations.length === 0 ? "pass" : "rejected",
    hasDatasetChanges,
    sourceChanged,
    baseline: {
      sourceSha256: baseline.metadata.sourceSha256,
      extractionDate: baselineExtractionDate,
      recordCount: baselineRecordCount,
      calculableRecordCount: baselineCalculableCount,
    },
    candidate: {
      sourceSha256: candidate.metadata.sourceSha256,
      extractionDate: candidateExtractionDate,
      recordCount: candidateRecordCount,
      calculableRecordCount: candidateCalculableCount,
    },
    changes: {
      recordCount: recordCountChange,
      calculableRecordCount: calculableRecordChange,
      addedCount: addedKeys.length,
      removedCount: removedKeys.length,
      modifiedCount: modifiedRecords.length,
      fieldChangeCounts,
      addedKeys,
      removedKeys,
      maximumAtomicMassChangeU,
      maximumBindingEnergyPerNucleonChangeMeV,
      largestAtomicMassChanges: massChanges.slice(0, 10),
      largestBindingEnergyChanges: bindingChanges.slice(0, 10),
    },
    policy: {
      ...policy,
      allowedRemovedRecords,
      allowedCalculableRecordLoss,
    },
    violations,
  };
};

const formatNuclideList = (keys, dataset, maximumItems = 50) => {
  if (keys.length === 0) {
    return "None.";
  }

  const displayed = keys.slice(0, maximumItems).map((key) => {
    const record = dataset.nuclides[key];
    return `${record.symbol}-${record.a} (\`${key}\`)`;
  });
  const suffix =
    keys.length > maximumItems
      ? `, and ${keys.length - maximumItems} more`
      : "";

  return `${displayed.join(", ")}${suffix}.`;
};

const formatChangeTable = (changes, unit) => {
  if (changes.length === 0) {
    return "None.";
  }

  const rows = changes.map(
    (change) =>
      `| ${change.symbol}-${change.a} | \`${change.key}\` | ` +
      `${formatNumber(change.baseline)} | ` +
      `${formatNumber(change.candidate)} | ` +
      `${formatNumber(change.absoluteChange)} ${unit} |`,
  );

  return [
    "| Nuclide | Z:N | Baseline | Candidate | Absolute change |",
    "|---|---:|---:|---:|---:|",
    ...rows,
  ].join("\n");
};

const createMarkdownReport = (report, baseline, candidate) => {
  const statusLabel =
    report.status === "pass"
      ? "PASS — update is within configured guardrails"
      : "REJECTED — manual scientific review is required";
  const violationSection =
    report.violations.length === 0
      ? "None."
      : report.violations
          .map((violation) => `- ${violation}`)
          .join("\n");

  return `# IAEA Nuclide Data Update Report

**Status:** ${statusLabel}  
**Generated:** ${report.generatedAt}

## Snapshot comparison

| Metric | Baseline | Candidate | Change |
|---|---:|---:|---:|
| Extraction date | ${report.baseline.extractionDate} | ${report.candidate.extractionDate} | — |
| Nuclide records | ${report.baseline.recordCount} | ${report.candidate.recordCount} | ${formatSignedInteger(report.changes.recordCount)} |
| Calculable records | ${report.baseline.calculableRecordCount} | ${report.candidate.calculableRecordCount} | ${formatSignedInteger(report.changes.calculableRecordCount)} |
| Added nuclides | — | ${report.changes.addedCount} | ${formatSignedInteger(report.changes.addedCount)} |
| Removed nuclides | ${report.changes.removedCount} | — | ${formatSignedInteger(-report.changes.removedCount)} |
| Modified nuclides | — | ${report.changes.modifiedCount} | ${report.changes.modifiedCount} |
| Atomic-mass values changed | — | ${report.changes.fieldChangeCounts.atomicMassU} | ${report.changes.fieldChangeCounts.atomicMassU} |
| Binding-energy values changed | — | ${report.changes.fieldChangeCounts.bindingEnergyPerNucleonMeV} | ${report.changes.fieldChangeCounts.bindingEnergyPerNucleonMeV} |
| Maximum atomic-mass change | — | ${formatNumber(report.changes.maximumAtomicMassChangeU)} u | — |
| Maximum binding-energy change | — | ${formatNumber(report.changes.maximumBindingEnergyPerNucleonChangeMeV)} MeV/nucleon | — |

**Baseline SHA-256:** \`${report.baseline.sourceSha256}\`  
**Candidate SHA-256:** \`${report.candidate.sourceSha256}\`

## Policy violations

${violationSection}

## Added nuclides

${formatNuclideList(report.changes.addedKeys, candidate)}

## Removed nuclides

${formatNuclideList(report.changes.removedKeys, baseline)}

## Largest atomic-mass changes

${formatChangeTable(report.changes.largestAtomicMassChanges, "u")}

## Largest binding-energy changes

${formatChangeTable(
    report.changes.largestBindingEnergyChanges,
    "MeV/nucleon",
  )}

## Guardrails

- Maximum total record-count change: ${formatPercent(
    report.policy.maximumRecordCountChangeFraction,
  )}
- Maximum removed records: ${report.policy.allowedRemovedRecords}
- Maximum loss of calculable records: ${
    report.policy.allowedCalculableRecordLoss
  }
- Maximum atomic-mass change: ${
    report.policy.maximumAtomicMassChangeU
  } u
- Maximum binding-energy change: ${
    report.policy.maximumBindingEnergyPerNucleonChangeMeV
  } MeV/nucleon
- A changed source checksum requires a newer extraction date.

This report was generated automatically. A rejected update is not copied into
the production snapshot and cannot open an automatic update pull request.
`;
};

const parseArguments = (argumentsList) => {
  const options = {};

  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];

    if (!argument.startsWith("--")) {
      throw new Error(`Unexpected argument: ${argument}`);
    }

    const value = argumentsList[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`${argument} requires a value`);
    }

    options[argument.slice(2)] = resolve(value);
    index += 1;
  }

  for (const requiredOption of [
    "baseline",
    "candidate",
    "report",
    "json-report",
  ]) {
    if (!options[requiredOption]) {
      throw new Error(`--${requiredOption} is required`);
    }
  }

  return options;
};

const readDataset = async (filePath) =>
  JSON.parse(await readFile(filePath, "utf8"));

const writeReports = async (
  report,
  baseline,
  candidate,
  markdownPath,
  jsonPath,
) => {
  await Promise.all([
    mkdir(dirname(markdownPath), { recursive: true }),
    mkdir(dirname(jsonPath), { recursive: true }),
  ]);
  await Promise.all([
    writeFile(
      markdownPath,
      createMarkdownReport(report, baseline, candidate),
      "utf8",
    ),
    writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8"),
  ]);
};

const main = async () => {
  const options = parseArguments(process.argv.slice(2));
  const [baseline, candidate] = await Promise.all([
    readDataset(options.baseline),
    readDataset(options.candidate),
  ]);
  const report = compareDatasets(baseline, candidate);

  await writeReports(
    report,
    baseline,
    candidate,
    options.report,
    options["json-report"],
  );

  console.log(`IAEA data comparison status: ${report.status.toUpperCase()}`);
  console.log(
    `Added: ${report.changes.addedCount}; ` +
      `removed: ${report.changes.removedCount}; ` +
      `modified: ${report.changes.modifiedCount}.`,
  );
  console.log(`Markdown report: ${options.report}`);
  console.log(`JSON report: ${options["json-report"]}`);

  if (report.violations.length > 0) {
    report.violations.forEach((violation) => {
      console.error(`Policy violation: ${violation}`);
    });
    process.exitCode = 1;
  }
};

const isMainModule =
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isMainModule) {
  await main();
}

export {
  DEFAULT_POLICY,
  compareDatasets,
  createMarkdownReport,
  writeReports,
};
