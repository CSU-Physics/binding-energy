let datasetPromise = null;

const loadNuclideDataset = () => {
  if (!datasetPromise) {
    const datasetUrl = `${process.env.PUBLIC_URL}/data/nuclides.json`;

    datasetPromise = fetch(datasetUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Unable to load local nuclide data: ${response.status}`,
          );
        }

        return response.json();
      })
      .catch((error) => {
        // Do not permanently cache a failed request.
        datasetPromise = null;
        throw error;
      });
  }

  return datasetPromise;
};

const getNuclide = async (Z, N) => {
  if (
    !Number.isInteger(Z) ||
    !Number.isInteger(N) ||
    Z < 1 ||
    N < 0
  ) {
    throw new RangeError(
      "Z must be a positive integer and N must be a non-negative integer.",
    );
  }

  const dataset = await loadNuclideDataset();
  return dataset.nuclides[`${Z}:${N}`] ?? null;
};

const getDatasetMetadata = async () => {
  const dataset = await loadNuclideDataset();
  return dataset.metadata;
};

export {
  getNuclide,
  getDatasetMetadata,
  loadNuclideDataset,
};
