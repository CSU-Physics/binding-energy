# Nuclear Binding Energy Calculator

This React application compares nuclear binding energies calculated from
tabulated atomic masses with estimates from the conventional liquid-drop model.

## Nuclide data

The production calculator is self-contained. It reads the versioned dataset in
`public/data/nuclides.json` and does not require the former Render API at
runtime.

The committed dataset is generated from the IAEA Nuclear Data Services
LiveChart ground-state endpoint:

```text
https://nds.iaea.org/relnsd/v1/data?fields=ground_states&nuclides=all
```

Its metadata records the source URL, extraction date, original and stored
units, record counts, and SHA-256 checksum of the source CSV. Atomic masses are
converted from micro-u to u, and binding energies per nucleon are converted
from keV to MeV.

To deliberately update the snapshot from IAEA, validate it, and compare it
with the committed baseline:

```bash
npm run data:update
```

The update is fail-closed: a candidate snapshot is built separately and only
replaces `public/data/nuclides.json` after all schema, physical-range, reference
nuclide, and change-policy checks pass. Reports are written to
`artifacts/iaea-data-update/report.md` and `report.json`. The report includes
record counts, added and removed nuclides, field-change counts, source
checksums, extraction dates, and the largest mass and binding-energy changes.

The change policy rejects unexpected record-count shifts, excessive removals
or loss of calculable records, extraction-date regressions, changed source
content without a newer extraction date, and large changes to an individual
mass or binding energy. Run the guardrail regression tests without accessing
the network using:

```bash
npm run data:test
```

To validate the already committed snapshot without accessing the network:

```bash
npm run data:validate
```

The production build automatically validates the dataset before compiling.

## Development

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
