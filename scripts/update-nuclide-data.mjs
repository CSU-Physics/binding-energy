import { copyFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const productionDataset = join(
  repositoryRoot,
  "public",
  "data",
  "nuclides.json",
);
const artifactDirectory = join(
  repositoryRoot,
  "artifacts",
  "iaea-data-update",
);
const baselineDataset = join(artifactDirectory, "baseline.json");
const candidateDataset = join(artifactDirectory, "candidate.json");
const markdownReport = join(artifactDirectory, "report.md");
const jsonReport = join(artifactDirectory, "report.json");

const runNodeScript = (script, argumentsList = []) =>
  new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [join(repositoryRoot, "scripts", script), ...argumentsList],
      {
        cwd: repositoryRoot,
        stdio: "inherit",
      },
    );

    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `${script} failed` +
            (signal ? ` with signal ${signal}` : ` with exit code ${code}`),
        ),
      );
    });
  });

await mkdir(artifactDirectory, { recursive: true });

console.log("Validating the committed baseline snapshot...");
await runNodeScript("validate-nuclide-data.mjs", [productionDataset]);
await copyFile(productionDataset, baselineDataset);

console.log("Building a candidate snapshot without replacing production...");
await runNodeScript("build-nuclide-data.mjs", [
  "--output",
  candidateDataset,
]);

console.log("Validating the candidate snapshot...");
await runNodeScript("validate-nuclide-data.mjs", [candidateDataset]);

console.log("Comparing the candidate with the committed baseline...");
await runNodeScript("compare-nuclide-data.mjs", [
  "--baseline",
  baselineDataset,
  "--candidate",
  candidateDataset,
  "--report",
  markdownReport,
  "--json-report",
  jsonReport,
]);

await copyFile(candidateDataset, productionDataset);

console.log(
  "The candidate passed all guardrails and replaced " +
    "public/data/nuclides.json.",
);
console.log(`Update report: ${markdownReport}`);
