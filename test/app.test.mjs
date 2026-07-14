import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { FALLBACK_STEPS, SCREW_BATCHES } from "../src/guide-data.js";
import {
  adaptiveDarkThreshold,
  analyzeLuminance,
  classifyJoyconPixel,
  classifyLighting,
  detectJoyconColorBlobs,
  projectPoint,
} from "../src/tracking.js";
import {
  ASSEMBLY_SEQUENCE,
  COMPONENTS,
  DEFAULT_REPAIR_ROTATION,
  LIGHTING_TRIALS,
  componentMarkers,
  evaluateLightingTrial,
} from "../src/training-data.js";

test("guide contains the requested 20-step flow without the fan foam step", () => {
  assert.equal(FALLBACK_STEPS.length, 20);
  assert.deepEqual(FALLBACK_STEPS.map((step) => step.number), Array.from({ length: 20 }, (_, index) => index + 1));
  assert.equal(FALLBACK_STEPS.some((step) => /fan foam/i.test(`${step.title} ${step.summary}`)), false);
  assert.equal(FALLBACK_STEPS[11].sourceStepNumber, 13);
});

test("all 17 screw identifiers are unique and have valid coordinates", () => {
  const screws = FALLBACK_STEPS.flatMap((step) => step.screws || []);
  assert.equal(screws.length, 17);
  assert.equal(new Set(screws.map((screw) => screw.id)).size, 17);
  screws.forEach((screw) => {
    assert.ok(screw.x >= 0 && screw.x <= 1);
    assert.ok(screw.y >= 0 && screw.y <= 1);
  });
  assert.equal(SCREW_BATCHES.reduce((total, batch) => total + batch.count, 0), 17);
});

test("edge workflow separates top, bottom, left, and right views", () => {
  assert.deepEqual(FALLBACK_STEPS[3].cameraViews.map((view) => view.id), ["top-edge", "bottom-edge"]);
  assert.deepEqual(FALLBACK_STEPS[4].cameraViews.map((view) => view.id), ["left-rail", "right-rail"]);
});

test("iFixit red-circle screw coordinates are preserved", () => {
  assert.deepEqual(
    FALLBACK_STEPS[2].screws.map(({ x, y }) => [x, y]),
    [[0.043, 0.031], [0.958, 0.034], [0.956, 0.953], [0.044, 0.949]],
  );
  assert.deepEqual(
    FALLBACK_STEPS[10].screws.map(({ x, y }) => [x, y]),
    [[0.934, 0.035], [0.064, 0.072], [0.481, 0.54], [0.949, 0.864], [0.172, 0.959], [0.829, 0.963]],
  );
});

test("perspective projection maps normalized corners exactly", () => {
  const corners = [{ x: 10, y: 20 }, { x: 210, y: 30 }, { x: 190, y: 130 }, { x: 20, y: 120 }];
  [[0, 0], [1, 0], [1, 1], [0, 1]].forEach(([u, v], index) => {
    const actual = projectPoint(u, v, corners);
    assert.ok(Math.abs(actual.x - corners[index].x) < 1e-9);
    assert.ok(Math.abs(actual.y - corners[index].y) < 1e-9);
  });
});

test("component trainer includes the requested five repair components", () => {
  assert.deepEqual(COMPONENTS.map((component) => component.id), ["joycons", "backplate", "microsd", "heatshield", "battery"]);
  COMPONENTS.forEach((component) => {
    assert.ok(component.description.length > 20);
    component.regions.forEach((region) => {
      if (component.id !== "joycons") {
        assert.ok(region.x >= 0);
        assert.ok(region.x + region.width <= 1);
      }
      assert.ok(region.y >= 0);
      assert.ok(region.y + region.height <= 1);
    });
  });
  assert.deepEqual(ASSEMBLY_SEQUENCE.map((item) => item.id), ["battery", "shield", "microsd", "backplate", "joycons"]);
});

test("rear and interior overlays use top-right microSD and kickstand orientation", () => {
  assert.equal(DEFAULT_REPAIR_ROTATION, 180);
  const microsd = componentMarkers("microsd")[0];
  assert.ok(microsd.x > 0.7 && microsd.y < 0.5);
  const kickstand = FALLBACK_STEPS[5].markers[0];
  const microsdScrew = FALLBACK_STEPS[8].screws[0];
  assert.ok(Math.abs((1 - kickstand.x) - 0.84) < 1e-9);
  assert.ok(Math.abs((1 - kickstand.y) - 0.38) < 1e-9);
  assert.ok(Math.abs((1 - microsdScrew.x) - 0.87) < 1e-9);
  assert.ok(Math.abs((1 - microsdScrew.y) - 0.30) < 1e-9);

  const normal = componentMarkers("battery", 0)[0];
  const rotated = componentMarkers("battery", 180)[0];
  assert.equal(rotated.x, 1 - normal.x - normal.width);
  assert.equal(rotated.y, 1 - normal.y - normal.height);
});

test("Joy-Con guide regions sit outside the tracked main-console rectangle", () => {
  const joycons = componentMarkers("joycons").sort((left, right) => left.x - right.x);
  assert.ok(joycons[0].x + joycons[0].width < 0);
  assert.ok(joycons[1].x > 1);
});

test("loose Joy-Con color detection accepts neon red-orange and blue but rejects wood", () => {
  assert.equal(classifyJoyconPixel(245, 82, 34), "red");
  assert.equal(classifyJoyconPixel(25, 170, 225), "blue");
  assert.equal(classifyJoyconPixel(180, 135, 90), null);

  const width = 100;
  const height = 100;
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    rgba.set([180, 135, 90, 255], index * 4);
  }
  const paint = (left, top, boxWidth, boxHeight, color) => {
    for (let y = top; y < top + boxHeight; y += 1) {
      for (let x = left; x < left + boxWidth; x += 1) rgba.set([...color, 255], (y * width + x) * 4);
    }
  };
  paint(8, 10, 12, 40, [245, 82, 34]);
  paint(76, 45, 12, 40, [25, 170, 225]);
  const detections = detectJoyconColorBlobs(rgba, width, height);
  assert.deepEqual(detections.map((item) => item.label).sort(), ["Blue Joy-Con", "Red Joy-Con"]);
});

test("exploded view keeps microSD inside the right side and mirrors the Joy-Cons", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const styles = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
  const appSource = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
  assert.ok(html.indexOf("assembly-backplate") < html.indexOf("assembly-microsd"));
  assert.match(styles, /\.assembly-microsd\s*\{[^}]*z-index:\s*2[^}]*margin-left:\s*22%[^}]*margin-top:\s*10%/s);
  assert.match(appSource, /battery:\s*95,\s*shield:\s*145,\s*microsd:\s*95,\s*backplate:\s*235/);
  assert.doesNotMatch(appSource, /part\.dataset\.assemblyPart === "microsd" \? " translateZ/);
  assert.match(styles, /\.diagram-joycon\.right\s*\{[^}]*border-radius:\s*5px 22px 22px 5px/s);
  assert.match(styles, /\.assembly-joycon\.right\s*\{[^}]*border-radius:\s*4px 25px 25px 4px/s);
});

test("fragile and high-risk steps expose camera warning metadata", () => {
  const riskSteps = FALLBACK_STEPS.filter((step) => step.risk);
  assert.deepEqual(riskSteps.map((step) => step.number), [8, 10, 12, 13, 14, 15, 16, 17, 18, 19]);
  assert.ok(riskSteps.some((step) => step.risk.label === "Fragile cable"));
  assert.ok(riskSteps.some((step) => step.risk.level === "high"));
});

test("lighting metrics classify dim and bright practice frames", () => {
  const dim = analyzeLuminance(Uint8Array.from([35, 45, 55, 65, 75, 85]));
  const bright = analyzeLuminance(Uint8Array.from([170, 185, 200, 215, 230, 245]));
  assert.equal(classifyLighting(dim).id, "dim");
  assert.equal(classifyLighting(bright).id, "bright");
  assert.ok(adaptiveDarkThreshold(122, dim) < adaptiveDarkThreshold(122, bright));
});

test("all four calibration trials can pass under representative metrics", () => {
  assert.equal(LIGHTING_TRIALS.length, 4);
  assert.equal(evaluateLightingTrial("balanced", { brightness: 145, contrast: 42, locked: true }), true);
  assert.equal(evaluateLightingTrial("dim", { brightness: 82, contrast: 22, locked: true }), true);
  assert.equal(evaluateLightingTrial("bright", { brightness: 205, contrast: 32, locked: true }), true);
  assert.equal(evaluateLightingTrial("angled", { angle: 6, perspectiveRatio: 1.01, locked: true }), true);
  assert.equal(evaluateLightingTrial("balanced", { brightness: 145, contrast: 42, locked: false }), false);
});

test("every statically queried UI element exists in the page", () => {
  const appSource = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const ids = [...appSource.matchAll(/document\.querySelector\("#([A-Za-z0-9_-]+)"\)/g)]
    .map((match) => match[1])
    .filter((id) => id !== "demoStartCamera");
  assert.equal(new Set(ids).size, ids.length);
  ids.forEach((id) => assert.match(html, new RegExp(`id=["']${id}["']`), `missing #${id}`));
  assert.match(appSource, /rotation: DEFAULT_REPAIR_ROTATION/);
});
