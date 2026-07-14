export const IFIXIT_GUIDE_ID = 112995;
export const IFIXIT_API_URL = `https://www.ifixit.com/api/2.0/guides/${IFIXIT_GUIDE_ID}?langid=en`;
export const IFIXIT_GUIDE_URL = "https://www.ifixit.com/Guide/Nintendo+Switch+Battery+Replacement/112995";

const screw = (id, x, y, label, length, driver) => ({ id, x, y, label, length, driver, type: "screw" });
const focus = (x, y, label) => ({ id: `${x}-${y}-${label}`, x, y, label, type: "focus" });

export const FALLBACK_STEPS = [
  {
    number: 1,
    title: "Release the Joy-Con locking tabs",
    summary: "Power the console off, then press the small release button on the rear of each Joy-Con.",
    details: ["Keep the button held while sliding the controller upward."],
    tool: "No tool required",
    markers: [focus(0.08, 0.23, "Release tab"), focus(0.92, 0.23, "Release tab")],
  },
  {
    number: 2,
    title: "Remove both Joy-Con controllers",
    summary: "Continue sliding each Joy-Con upward until it separates from the console.",
    details: ["Repeat on the opposite side."],
    tool: "No tool required",
    markers: [focus(0.05, 0.08, "Slide up"), focus(0.95, 0.08, "Slide up")],
  },
  {
    number: 3,
    title: "Remove the rear panel screws",
    summary: "Remove the four corner screws holding the rear panel.",
    details: ["Use a Y00 driver.", "Store this four-screw batch separately."],
    tool: "Y00 screwdriver",
    warning: "Use firm downward pressure and stop if the driver begins to slip.",
    imageUrl: "https://guide-images.cdn.ifixit.com/igi/UM4r1BOEJDYmMfpC.large",
    screws: [
      screw("rear-tl", 0.043, 0.031, "Rear corner", "6.3 mm", "Y00"),
      screw("rear-tr", 0.958, 0.034, "Rear corner", "6.3 mm", "Y00"),
      screw("rear-br", 0.956, 0.953, "Rear corner", "6.3 mm", "Y00"),
      screw("rear-bl", 0.044, 0.949, "Rear corner", "6.3 mm", "Y00"),
    ],
  },
  {
    number: 4,
    title: "Remove the top and bottom screws",
    summary: "Remove one screw from the top edge and two from the bottom edge.",
    details: ["Use a JIS 00 driver.", "All three screws are 2.5 mm long."],
    tool: "JIS 00 screwdriver",
    imageUrl: "https://guide-images.cdn.ifixit.com/igi/hGXGnEoQjvBhX3wm.large",
    screws: [
      screw("edge-top", 0.50, 0.025, "Top edge", "2.5 mm", "JIS 00"),
      screw("edge-bottom-left", 0.32, 0.975, "Bottom left", "2.5 mm", "JIS 00"),
      screw("edge-bottom-right", 0.68, 0.975, "Bottom right", "2.5 mm", "JIS 00"),
    ],
    cameraViews: [
      {
        id: "top-edge",
        title: "Top edge",
        icon: "↑",
        instruction: "Rotate and support the Switch so the top edge faces the camera. Keep the edge horizontal, fully visible, and centered inside the thin guide box.",
        profile: "edge-horizontal",
        referenceImageUrl: "https://guide-images.cdn.ifixit.com/igi/hGXGnEoQjvBhX3wm.large",
        markers: [screw("edge-top", 0.50, 0.50, "Top edge", "2.5 mm", "JIS 00")],
      },
      {
        id: "bottom-edge",
        title: "Bottom edge",
        icon: "↓",
        instruction: "Rotate the Switch so the bottom edge faces the camera. Keep the USB-C edge horizontal and centered, then remove the two highlighted screws.",
        profile: "edge-horizontal",
        referenceImageUrl: "https://guide-images.cdn.ifixit.com/igi/vEpL4RZKItZCNJlV.large",
        markers: [
          screw("edge-bottom-left", 0.383, 0.50, "USB-C side screw", "2.5 mm", "JIS 00"),
          screw("edge-bottom-right", 0.618, 0.50, "USB-C side screw", "2.5 mm", "JIS 00"),
        ],
      },
    ],
  },
  {
    number: 5,
    title: "Remove the center side screws",
    summary: "Remove the center screw from each side rail.",
    details: ["Both screws are 3.8 mm long."],
    tool: "JIS 00 screwdriver",
    imageUrl: "https://guide-images.cdn.ifixit.com/igi/aygPfTuAlccxJXvj.large",
    screws: [
      screw("side-left", 0.015, 0.50, "Left side", "3.8 mm", "JIS 00"),
      screw("side-right", 0.985, 0.50, "Right side", "3.8 mm", "JIS 00"),
    ],
    cameraViews: [
      {
        id: "left-rail",
        title: "Left rail",
        icon: "←",
        instruction: "Rotate the Switch 90 degrees so the left rail faces the camera. Keep the rail vertical, fully visible, and centered inside the tall guide box.",
        profile: "edge-vertical",
        referenceImageUrl: "https://guide-images.cdn.ifixit.com/igi/aygPfTuAlccxJXvj.large",
        markers: [screw("side-left", 0.528, 0.50, "Rail center screw", "3.8 mm", "JIS 00")],
      },
      {
        id: "right-rail",
        title: "Right rail",
        icon: "→",
        instruction: "Turn the Switch so the right rail faces the camera. Keep the rail vertical and centered, then remove the highlighted center screw.",
        profile: "edge-vertical",
        referenceImageUrl: "https://guide-images.cdn.ifixit.com/igi/DTFNZI2ONKRcbQjd.large",
        markers: [screw("side-right", 0.470, 0.50, "Rail center screw", "3.8 mm", "JIS 00")],
      },
    ],
  },
  {
    number: 6,
    title: "Open the kickstand",
    summary: "Flip up the rear kickstand and remove any microSD card before continuing.",
    details: ["Set the microSD card aside in a safe place."],
    tool: "No tool required",
    markers: [focus(0.16, 0.62, "Kickstand")],
  },
  {
    number: 7,
    title: "Remove the kickstand well screw",
    summary: "Remove the small screw hidden inside the kickstand well, then close the kickstand.",
    details: ["This screw is 1.6 mm long."],
    tool: "JIS 00 screwdriver",
    imageUrl: "https://guide-images.cdn.ifixit.com/igi/rJ4M2PBV1Z5gOaPS.large",
    screws: [screw("kickstand-well", 0.16, 0.91, "Kickstand well", "1.6 mm", "JIS 00")],
  },
  {
    number: 8,
    title: "Lift off the rear panel",
    summary: "Open the game-card flap, then lift the rear panel straight up from the bottom edge.",
    details: ["Do not hinge the panel upward, which can damage the top tabs."],
    risk: { level: "fragile", label: "Fragile tabs", message: "Lift straight up. Tilting the panel can snap the top tabs." },
    tool: "Opening pick, optional",
    markers: [focus(0.50, 0.96, "Lift straight up")],
  },
  {
    number: 9,
    title: "Remove the microSD reader screw",
    summary: "Remove the screw securing the microSD card reader.",
    details: ["The screw is 3.1 mm long."],
    tool: "JIS 00 screwdriver",
    imageUrl: "https://guide-images.cdn.ifixit.com/igi/krDiDT1gtLVOQfyn.large",
    screws: [screw("microsd-reader", 0.13, 0.70, "microSD reader", "3.1 mm", "JIS 00")],
  },
  {
    number: 10,
    title: "Disconnect the microSD reader",
    summary: "Lift the microSD card reader straight up to disconnect its press connector.",
    details: ["During reassembly, verify the connector is fully seated before replacing the foam pad."],
    risk: { level: "fragile", label: "Fragile connector", message: "Lift the reader straight up; sideways force can damage the press connector." },
    tool: "Tweezers, optional",
    markers: [focus(0.15, 0.70, "Lift connector")],
  },
  {
    number: 11,
    title: "Remove the shield plate screws",
    summary: "Remove the six screws holding the metal shield plate.",
    details: ["All six screws are 3 mm long."],
    tool: "JIS 00 screwdriver",
    imageUrl: "https://guide-images.cdn.ifixit.com/igi/jyDV4Ulh1HdvOuKh.large",
    screws: [
      screw("shield-1", 0.934, 0.035, "Shield screw", "3 mm", "JIS 00"),
      screw("shield-2", 0.064, 0.072, "Shield screw", "3 mm", "JIS 00"),
      screw("shield-3", 0.481, 0.540, "Shield screw", "3 mm", "JIS 00"),
      screw("shield-4", 0.949, 0.864, "Shield screw", "3 mm", "JIS 00"),
      screw("shield-5", 0.172, 0.959, "Shield screw", "3 mm", "JIS 00"),
      screw("shield-6", 0.829, 0.963, "Shield screw", "3 mm", "JIS 00"),
    ],
  },
  {
    number: 12,
    title: "Remove the shield plate",
    summary: "Slide a spudger under the edge and gently lift the shield plate away.",
    details: ["The thermal compound may create light resistance.", "Plan to restore the thermal interface during reassembly."],
    tool: "Spudger",
    warning: "Normal thin thermal paste is not suitable for bridging this gap. Follow the official guide for thermal putty guidance.",
    risk: { level: "high", label: "Thermal interface", message: "Pry gently. The shield may be bonded by thermal compound." },
    markers: [focus(0.16, 0.48, "Pry edge")],
  },
  {
    number: 13,
    title: "Disconnect the battery",
    summary: "Use the tip of a spudger to lift the battery connector straight out of its socket.",
    details: ["Do not pry against nearby components."],
    risk: { level: "fragile", label: "Fragile cable", message: "Lift the battery connector straight up and avoid nearby board components." },
    tool: "Spudger",
    markers: [focus(0.58, 0.54, "Battery connector")],
  },
  {
    number: 14,
    title: "Apply adhesive remover",
    summary: "Add a few drops of high-concentration isopropyl alcohol or suitable adhesive remover along the top of the battery well.",
    details: ["Use 90% or higher isopropyl alcohol if following the alcohol method."],
    tool: "Adhesive remover or 90%+ IPA",
    warning: "Keep liquid away from openings and use only a small amount.",
    risk: { level: "high", label: "Battery risk", message: "Use only a few drops and keep solvent away from openings." },
    markers: [focus(0.37, 0.30, "Apply drops")],
  },
  {
    number: 15,
    title: "Let the solvent work",
    summary: "Tilt the top edge upward and allow the solvent to reach the adhesive under the battery.",
    details: ["Hold for about one to two minutes."],
    risk: { level: "high", label: "Battery risk", message: "Keep the battery stable while the solvent reaches the adhesive." },
    tool: "No tool required",
    markers: [focus(0.50, 0.12, "Raise this edge")],
  },
  {
    number: 16,
    title: "Begin slicing the battery adhesive",
    summary: "Insert an opening pick between the battery and the battery-well wall, then work carefully under the edge.",
    details: ["Move slowly and keep the pick shallow."],
    tool: "Plastic opening pick",
    warning: "Never puncture, crease, or sharply bend a lithium-ion battery.",
    risk: { level: "high", label: "Puncture risk", message: "Keep the plastic pick shallow. Never puncture, crease, or bend the battery." },
    markers: [focus(0.22, 0.53, "Insert pick")],
  },
  {
    number: 17,
    title: "Add more solvent if needed",
    summary: "Leave the pick in place, add a few more drops, tilt the console, and wait again.",
    details: ["Allow another one to two minutes for the adhesive to soften."],
    risk: { level: "high", label: "Battery risk", message: "Add solvent instead of increasing force against the battery." },
    tool: "Adhesive remover or 90%+ IPA",
    markers: [focus(0.39, 0.30, "Add drops")],
  },
  {
    number: 18,
    title: "Continue separating the adhesive",
    summary: "Slide the opening pick farther along the top edge to cut more of the adhesive.",
    details: ["Stop and add more solvent rather than applying excessive force."],
    risk: { level: "high", label: "Puncture risk", message: "Use a plastic pick and stop if the battery begins to deform." },
    tool: "Plastic opening pick",
    markers: [focus(0.46, 0.38, "Slide pick")],
  },
  {
    number: 19,
    title: "Lift out the old battery",
    summary: "Once there is enough space, slide a plastic card under the battery and lift it slowly.",
    details: ["Remove the battery and do not reuse it."],
    tool: "Plastic card",
    warning: "Do not bend the battery. Stop immediately if it becomes hot, swells, smokes, or smells unusual.",
    risk: { level: "high", label: "Battery hazard", message: "Stop immediately for heat, swelling, smoke, odor, or deformation." },
    markers: [focus(0.41, 0.56, "Slide card")],
  },
  {
    number: 20,
    title: "Clean and prepare for the new battery",
    summary: "Clean residual adhesive from the battery well, then install the replacement battery and adhesive as directed.",
    details: ["Reassemble in reverse order.", "Calibrate the new battery after the repair."],
    tool: "Microfiber cloth and 90%+ IPA",
    markers: [focus(0.42, 0.54, "Clean battery well")],
  },
].map((step) => ({
  ...step,
  sourceStepNumber: step.number <= 11 ? step.number : step.number + 1,
}));

export const SCREW_BATCHES = FALLBACK_STEPS
  .filter((step) => step.screws?.length)
  .map((step) => ({
    stepNumber: step.number,
    title: step.title,
    count: step.screws.length,
    driver: step.screws[0].driver,
    length: [...new Set(step.screws.map((item) => item.length))].join(", "),
    ids: step.screws.map((item) => item.id),
  }));

function stripHtml(value = "") {
  const parsed = new DOMParser().parseFromString(String(value), "text/html");
  return parsed.body.textContent?.trim() || "";
}

function getImageUrl(step) {
  const media = step?.media?.data || step?.media || [];
  const first = Array.isArray(media) ? media[0] : null;
  const image = first?.image || first;
  return image?.large || image?.medium || image?.standard || image?.original || null;
}

function extractLines(step) {
  const lines = Array.isArray(step?.lines) ? step.lines : [];
  return lines
    .map((line) => stripHtml(line?.text_rendered || line?.text || line?.bullet || ""))
    .filter(Boolean);
}

export async function loadIfixitGuide() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  let response;
  try {
    response = await fetch(IFIXIT_API_URL, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) throw new Error(`iFixit API returned ${response.status}`);
  const guide = await response.json();
  const remoteSteps = Array.isArray(guide?.steps) ? guide.steps : [];
  if (remoteSteps.length < 21) {
    throw new Error(`Expected the 21-step iFixit source guide, received ${remoteSteps.length} steps`);
  }

  const steps = FALLBACK_STEPS.map((fallback) => {
    const remote = remoteSteps[fallback.sourceStepNumber - 1];
    if (!remote) return fallback;
    const lines = extractLines(remote);
    return {
      ...fallback,
      title: stripHtml(remote.title) || fallback.title,
      summary: lines[0] || fallback.summary,
      details: lines.length > 1 ? lines.slice(1) : fallback.details,
      imageUrl: getImageUrl(remote) || fallback.imageUrl,
      sourceStepId: remote.stepid,
    };
  });

  return {
    title: guide?.title || "Nintendo Switch Battery Replacement",
    steps,
    source: "live",
  };
}

export function fallbackGuide() {
  return {
    title: "Nintendo Switch Battery Replacement",
    steps: FALLBACK_STEPS,
    source: "fallback",
  };
}
