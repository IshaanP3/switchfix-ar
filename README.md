# SwitchFix AR

[![Project status: work in progress](https://img.shields.io/badge/status-work%20in%20progress-F97316)](#project-status)
[![Tests: 5 passing](https://img.shields.io/badge/tests-5%20passing-22C55E)](#testing)
[![License: MIT](https://img.shields.io/badge/license-MIT-2563EB)](LICENSE.md)
[![Deploy: GitHub Pages](https://img.shields.io/badge/deploy-GitHub%20Pages-111827)](.github/workflows/deploy-pages.yml)

SwitchFix AR is a camera-assisted web guide for replacing the battery in an original Nintendo Switch. It combines a guided repair workflow with browser-based computer vision to place screw and action markers over the console in real time.

> [!IMPORTANT]
> **Work in progress:** this is an active portfolio prototype, not a finished repair product. Automatic tracking, device-revision coverage, and screw-level alignment are still being validated. Always compare overlays with the linked iFixit reference image before removing hardware.

[View the live demo](https://ishaanp3.github.io/switchfix-ar/) · [Read the source repair guide](https://www.ifixit.com/Guide/Nintendo+Switch+Battery+Replacement/112995)

![SwitchFix AR interface showing the camera workspace, repair step, safety checklist, and screw tracker](docs/switchfix-ar-preview.png)

## Why this project

Repair instructions are usually presented as static photos. with new EU laws mandating easily reparable batteries, I thought this would make it easier for current gen 1 switch owners to replace their batteries. SwitchFix AR explores a more spatial workflow: detect the device, estimate its four-corner perspective, and transform normalized guide coordinates into live camera positions. The interface also keeps the safety checklist, current tool, screw lengths, and repair progress visible throughout the job. it displays the current Ifixit step photo aswell incase the edge tracking messes up. 

The result is a lightweight, install-free prototype that runs entirely in the browser and can be hosted as a static site.

## Highlights

- 20-step Nintendo Switch battery-replacement workflow
- Automatic dark-device detection tuned for an angled laptop-camera view
- Four-corner perspective projection with temporal smoothing
- Pyramidal Lucas-Kanade optical flow through a vendored 67 KB JSFeat runtime
- Automatic re-acquisition plus a manual four-corner alignment fallback
- Separate top, bottom, left-rail, and right-rail camera views
- 17 screw markers measured from the red circles in the official iFixit images
- 180-degree rear/interior orientation for a Switch facing the repairer
- Per-view screw completion, safety checks, tool prompts, and progress persistence
- Live iFixit guide loading with a bundled offline fallback
- Responsive, build-free static architecture suitable for GitHub Pages
- On-device camera processing; camera frames are not uploaded by the app

## How tracking works

```text
Camera frame
    -> grayscale + dark-component segmentation
    -> candidate scoring by shape, area, orientation, and position
    -> four-corner perspective estimate
    -> JSFeat optical-flow tracking between detections
    -> temporal smoothing and periodic re-acquisition
    -> projected screw and action overlays
```

Three detection profiles cover the rear/interior, horizontal top and bottom edges, and vertical Joy-Con rails. If automatic detection is unreliable, the user can tap the four console corners in order and continue with the same perspective-projection system.

## Project status

Current version: **v2.2.0 — active prototype**

Completed:

- [x] Responsive repair interface and 20-step guide
- [x] Rear, interior, edge, and rail tracking profiles
- [x] Optical-flow tracking and automatic re-detection
- [x] Manual alignment fallback
- [x] iFixit source-step and image integration
- [x] Automated guide-data and projection tests
- [x] GitHub Pages deployment workflow

Planned:

- [ ] Collect a larger camera-angle and lighting validation set
- [ ] Add model-aware support for Switch Lite and Switch OLED
- [ ] Replace heuristic detection with a labeled keypoint or segmentation model
- [ ] Add calibration diagnostics and confidence history
- [ ] Complete hands-on validation across the full repair sequence
- [ ] Expand automated browser and accessibility testing

## Technical decisions

This release uses deterministic computer vision instead of a small, weakly trained neural model. A reliable ML upgrade needs labeled keypoints or masks for the rear, interior, top, bottom, left rail, and right rail—not miscellaneous web images. The current architecture keeps detection replaceable while preserving the perspective overlay and repair workflow.

The fan-foam removal instruction from iFixit step 12 is intentionally omitted. Later app steps retain their original iFixit source mapping so live text and reference images remain aligned.

## Run locally

Camera access requires HTTPS or `localhost`.

```bash
npm start
```

Open [http://localhost:8080](http://localhost:8080) in a current Chrome, Edge, Safari, or Firefox browser.

If Node.js is unavailable, serve the repository with another static server, for example:

```bash
py -m http.server 8080
```

## Testing

```bash
npm test
```

The test suite checks the 20-step flow, omitted fan-foam instruction, all 17 unique screw IDs, iFixit source-step mapping, four edge/rail views, measured coordinates, and perspective-projection math.

## Camera test checklist

- Use an original HAC-001 or HAC-001(-01) Switch; Lite and OLED are not yet supported.
- Place the console on a plain, contrasting surface in bright, even lighting.
- Keep the complete target surface inside the dashed guide.
- For rear/interior views, the logo should appear upside down and the kickstand should be upper-right.
- Keep the visible edge horizontal for top/bottom steps and the rail vertical for side steps.
- Press **Re-scan** after changing views, or use **Tap corners** if detection cannot lock.
- Verify every orange marker against the official reference image before removing a screw.

## Deployment

The repository includes a GitHub Actions workflow that publishes the static site to GitHub Pages from `main`. No bundler, build output, API key, or server deployment is required.

## Project structure

```text
.
|-- .github/workflows/deploy-pages.yml
|-- docs/switchfix-ar-preview.png
|-- src/
|   |-- app.js
|   |-- guide-data.js
|   `-- tracking.js
|-- test/app.test.mjs
|-- vendor/
|   |-- jsfeat-min.js
|   `-- JSFEAT-LICENSE.txt
|-- index.html
|-- styles.css
|-- server.mjs
|-- package.json
`-- README.md
```

## Attribution and safety

Guide content and reference images come from [iFixit Guide 112995](https://www.ifixit.com/Guide/Nintendo+Switch+Battery+Replacement/112995) and remain subject to iFixit's licensing and terms. JSFeat is redistributed under its MIT license in [`vendor/JSFEAT-LICENSE.txt`](vendor/JSFEAT-LICENSE.txt).

This project is independent and is not affiliated with or endorsed by Nintendo or iFixit. Nintendo Switch is a Nintendo trademark. Device repair can damage hardware or cause injury; this prototype is an educational visual aid and does not replace qualified repair guidance.

## Contributing

Focused bug reports and reproducible camera-tracking observations are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) before opening an issue or proposing a change.

## License

Original project code is available under the MIT License. See [LICENSE.md](LICENSE.md) for source, third-party content, and trademark details.
