export const LIGHTING_TRIALS = [
  {
    id: "balanced",
    title: "Even light",
    instruction: "Use soft, even room light with the whole console visible.",
    test: ({ brightness, contrast, locked }) => locked && brightness >= 95 && brightness <= 190 && contrast >= 24,
  },
  {
    id: "dim",
    title: "Dim light",
    instruction: "Lower the room light, but keep the console edges distinguishable from the table.",
    test: ({ brightness, contrast, locked }) => locked && brightness >= 45 && brightness <= 120 && contrast >= 16,
  },
  {
    id: "bright",
    title: "Bright light",
    instruction: "Add brighter indirect light. Avoid a white reflection covering the console.",
    test: ({ brightness, contrast, locked }) => locked && brightness >= 165 && brightness <= 235 && contrast >= 18,
  },
  {
    id: "angled",
    title: "Slight angle",
    instruction: "Turn the console a few degrees and keep all four corners in frame.",
    test: ({ angle, perspectiveRatio, locked }) => locked && (angle >= 3 || perspectiveRatio >= 1.035),
  },
];

export const DEFAULT_REPAIR_ROTATION = 180;

export const COMPONENTS = [
  {
    id: "joycons",
    name: "Joy-Con controllers",
    shortName: "Joy-Cons",
    stage: "Console closed, controllers beside the main console",
    description: "The removable controllers sit outside the main console rectangle. Loose neon red/orange and blue Joy-Cons are also labeled automatically by color.",
    step: 1,
    regions: [
      { x: -0.18, y: 0.08, width: 0.15, height: 0.84, label: "Left Joy-Con" },
      { x: 1.03, y: 0.08, width: 0.15, height: 0.84, label: "Right Joy-Con" },
    ],
  },
  {
    id: "backplate",
    name: "Rear panel / backplate",
    shortName: "Backplate",
    stage: "Console closed, rear side facing up",
    description: "The large black outer cover with the Nintendo Switch logo and kickstand.",
    step: 8,
    regions: [{ x: 0.14, y: 0.06, width: 0.72, height: 0.88, label: "Rear panel / backplate" }],
  },
  {
    id: "microsd",
    name: "microSD card reader",
    shortName: "microSD reader",
    stage: "Rear panel removed, shield plate installed",
    description: "The small removable reader board beside the kickstand area, attached by a press connector.",
    step: 10,
    regions: [{ x: 0.065, y: 0.58, width: 0.19, height: 0.24, label: "microSD card reader" }],
  },
  {
    id: "heatshield",
    name: "Shield plate / heat shield",
    shortName: "Heat shield",
    stage: "Rear panel and microSD reader removed",
    description: "The broad silver metal plate covering most of the internal electronics.",
    step: 12,
    regions: [{ x: 0.075, y: 0.055, width: 0.85, height: 0.89, label: "Shield plate / heat shield" }],
  },
  {
    id: "battery",
    name: "Battery",
    shortName: "Battery",
    stage: "Shield plate removed",
    description: "The large black rectangular lithium-ion pack seated in the left-center battery well.",
    step: 13,
    regions: [{ x: 0.17, y: 0.24, width: 0.39, height: 0.57, label: "Battery" }],
  },
];

export const ASSEMBLY_SEQUENCE = [
  { id: "battery", label: "Seat replacement battery", note: "Apply replacement adhesive and seat the pack without bending it." },
  { id: "shield", label: "Restore shield plate", note: "Restore the specified thermal interface before lowering the shield." },
  { id: "microsd", label: "Reconnect microSD reader", note: "Align the press connector and push straight down until fully seated." },
  { id: "backplate", label: "Lower rear panel", note: "Engage the top tabs first, then lower the panel without forcing it." },
  { id: "joycons", label: "Slide on Joy-Cons", note: "Slide each controller down its rail until it clicks." },
];

export function componentMarkers(componentId, rotation = DEFAULT_REPAIR_ROTATION) {
  const component = COMPONENTS.find((item) => item.id === componentId);
  if (!component) return [];
  return component.regions.map((region, index) => {
    const oriented = rotation === 180
      ? { ...region, x: 1 - region.x - region.width, y: 1 - region.y - region.height }
      : region;
    return {
      ...oriented,
      id: `${component.id}-${index}`,
      type: "component",
      label: region.label,
      componentId: component.id,
    };
  });
}

export function evaluateLightingTrial(trialId, metrics) {
  const trial = LIGHTING_TRIALS.find((item) => item.id === trialId);
  return Boolean(trial?.test(metrics));
}
