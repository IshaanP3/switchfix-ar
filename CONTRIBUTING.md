# Contributing to SwitchFix AR

SwitchFix AR is an active work-in-progress prototype. Contributions should keep the repair flow safe, traceable, and easy to validate.

## Before opening an issue

For tracking problems, include:

- Browser and operating system
- Nintendo Switch model
- Camera position and approximate angle
- Lighting and work-surface description
- Repair step and camera view
- Whether automatic re-scan or manual corner alignment worked
- Whether the issue concerns the console outline, projected component, or loose Joy-Con label
- Joy-Con colour, surrounding colours, and whether the controller was fully inside the frame

Do not upload images containing private information or identifiable people.

## Development workflow

1. Serve the project from `localhost` with `npm start`.
2. Make focused changes without adding a build requirement unless it is essential.
3. Run `npm test`.
4. Test automatic detection and the manual four-corner fallback.
5. Test loose red/orange and blue Joy-Cons against both neutral and similarly coloured backgrounds.
6. Confirm every marker change against the linked iFixit reference image.

## Pull requests

Keep pull requests small and describe:

- The problem being solved
- The test setup used
- Any repair steps or device orientations affected
- Before/after screenshots for visual changes

Never present unvalidated marker coordinates or device-model support as production ready.
