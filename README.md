# <img src="public/icon.png" alt="Linéo Logo" width="32" height="32" /> Linéo

> Create figures with beautiful approximation curves with few points.

[![Rust](https://img.shields.io/badge/Rust-1.85+-orange?logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![Tauri](https://img.shields.io/badge/Tauri-2.9+-blue?logo=tauri&logoColor=white)](https://tauri.app/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub profile](https://img.shields.io/badge/GitHub-ThomasByr-181717?logo=github&logoColor=white)](https://github.com/ThomasByr)

1. [Installation](#installation)
2. [Usage](#usage)
3. [Deploying Linéo as a Website](#deploying-linéo-as-a-website)
4. [TODO and Bugs](#todo-and-bugs)

## Installation

### Pre-built binaries

> [!NOTE]
> You can download the latest release of Linéo for your system from the [Releases](https://github.com/ThomasByr/Lineo/releases) page.

Please download the appropriate archive for your operating system, extract it, and run the executable inside.

On MacOS, both Intel and Apple Silicon architectures are supported.

### Building from source

To build Linéo from source, make sure you have [Node.js](https://nodejs.org/) (with npm - [fnm](https://github.com/Schniz/fnm) is recommended), [Rust](https://www.rust-lang.org/tools/install) and [Tauri prerequisites](https://tauri.app/start/prerequisites/) installed.

Then, clone the repository and run the following commands in the project directory:

```bash
npm install
npm run tauri build
```

This will create the application binaries in the `src-tauri/target/release/bundle` directory.

### Web Version

Linéo can also be built as a static website. See [WEB_DEPLOY.md](WEB_DEPLOY.md) for details.

## Usage

Run the application and use the graphical interface to create and manipulate figures with approximation curves.

![Linéo Screenshot](assets/Linéo_capture.png)

On the above image:

1. The tab selector allows you to switch between the different tools:
   - **Data**: for data creation and import. This allows to create and modify "series".
   - **Plot**: the settings for your different "series". Change the color, the point size and shape, etc.
   - **Approx**: this is where you can set your approximation curves. Choose the type of curve for each "series", and set the parameters.
   - **Settings**: settings for the canvas, like axes limits, grid lines, titles, etc.
2. Action buttons:
   - **Enter draw mode**: allows you to draw points directly on the canvas with the mouse and exporting them as a "serie".
   - **Export PNG/JPG**: export the current canvas as an image.
   - **Copy to clipboard**: copy the current canvas to the clipboard as an image.
   - **Auto Crop**: automatically crops exported images to tightly fit the content.
3. App settings: change the zoom mode, switch from dark to light theme, and access recent action outcomes.
4. The canvas displays the figures. You can zoom in/out with the mouse wheel and pan by clicking and dragging (on manual zoom mode).
5. Save/Open project: save your current project to a file or open a previously saved project.
6. Undo/Redo your most recent actions.

## Deploying Linéo as a Website

Linéo has been updated to support running as a standard web application in addition to a desktop application.

To build the web version of Linéo, run:

```bash
npm run build
```

This will generate a `dist` directory containing the static website files.

### Hosting

You can host the contents of the `dist` directory on any static site hosting provider.

A GitHub Actions workflow has been included to automatically deploy to GitHub Pages.

1. Go to your repository **Settings** > **Pages**.
2. Under **Build and deployment**, select **GitHub Actions** as the source.
3. Push your changes to the `main` branch.
4. The `Deploy Web to GitHub Pages` workflow will run and deploy your site.

<details><summary>Troubleshooting: "Tag is not allowed to deploy"</summary>

If you see an error like `Tag "v0.1.1" is not allowed to deploy to github-pages due to environment protection rules`, you need to update your environment settings:

1. Go to repository **Settings** > **Environments** > **github-pages**.
2. Under **Deployment branches and tags**, click **Add deployment branch or tag rule**.
3. Select **Tag** from the dropdown.
4. Enter `v*` (or `*`) as the pattern.
5. Click **Add rule**.

</details>

### Limitations of Web Version

When running in the browser, some features behave differently compared to the desktop version:

- **Excel Import**: Currently disabled in the web version. Only CSV and Manual entry are supported.
- **File Saving**: Files (images) are downloaded via the browser's download manager instead of a system save dialog.
- **Clipboard**: Uses the browser's Clipboard API.

## TODO and Bugs

- [x] Version mention on the app title.
- [x] Change UI to have more space on the left for the menu.
- [x] Add more canvas settings and pit them in the left menu (axes limits, grid lines, etc.).
- [x] Add more approximation curves (splines, etc.).
- [x] Create custom notification zone inside the app (status of app actions, errors on copy/export).
