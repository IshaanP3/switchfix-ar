import {
  IFIXIT_GUIDE_URL,
  SCREW_BATCHES,
  fallbackGuide,
  loadIfixitGuide,
} from "./guide-data.js";
import { SwitchTracker } from "./tracking.js";

const elements = {
  apiStatus: document.querySelector("#apiStatus"),
  cameraStage: document.querySelector("#cameraStage"),
  cameraVideo: document.querySelector("#cameraVideo"),
  overlayCanvas: document.querySelector("#overlayCanvas"),
  cameraEmpty: document.querySelector("#cameraEmpty"),
  startCameraButton: document.querySelector("#startCameraButton"),
  demoButton: document.querySelector("#demoButton"),
  orientationCard: document.querySelector("#orientationCard"),
  orientationTitle: document.querySelector("#orientationTitle"),
  orientationInstruction: document.querySelector("#orientationInstruction"),
  orientationIcon: document.querySelector("#orientationIcon"),
  detectionConfidence: document.querySelector("#detectionConfidence"),
  detectionConfidenceBar: document.querySelector("#detectionConfidenceBar"),
  trackingBadge: document.querySelector("#trackingBadge"),
  trackingText: document.querySelector("#trackingText"),
  cameraToolbar: document.querySelector("#cameraToolbar"),
  rescanButton: document.querySelector("#rescanButton"),
  manualButton: document.querySelector("#manualButton"),
  mirrorButton: document.querySelector("#mirrorButton"),
  stopCameraButton: document.querySelector("#stopCameraButton"),
  stepNumber: document.querySelector("#stepNumber"),
  stepTitle: document.querySelector("#stepTitle"),
  stepSummary: document.querySelector("#stepSummary"),
  stepDetails: document.querySelector("#stepDetails"),
  stepWarning: document.querySelector("#stepWarning"),
  viewSequence: document.querySelector("#viewSequence"),
  ifixitLink: document.querySelector("#ifixitLink"),
  referenceImageWrap: document.querySelector("#referenceImageWrap"),
  previousButton: document.querySelector("#previousButton"),
  nextButton: document.querySelector("#nextButton"),
  progressLabel: document.querySelector("#progressLabel"),
  progressPercent: document.querySelector("#progressPercent"),
  progressBar: document.querySelector("#progressBar"),
  screwChart: document.querySelector("#screwChart"),
  screwTotal: document.querySelector("#screwTotal"),
  resetProgressButton: document.querySelector("#resetProgressButton"),
  currentTool: document.querySelector("#currentTool"),
  toolTip: document.querySelector("#toolTip"),
  helpDialog: document.querySelector("#helpDialog"),
  helpButton: document.querySelector("#helpButton"),
  closeHelpButton: document.querySelector("#closeHelpButton"),
  safetyPower: document.querySelector("#safetyPower"),
  safetyBattery: document.querySelector("#safetyBattery"),
  safetyModel: document.querySelector("#safetyModel"),
};

const STORAGE_KEY = "switchfix-ar-progress-v3";
let guide = fallbackGuide();
let currentStepIndex = 0;
let currentViewIndex = 0;
let completedScrewIds = new Set();
let cameraActive = false;
let tracker;

function readSavedState() {
  try {
    const state = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    currentStepIndex = Number.isInteger(state.currentStepIndex) ? state.currentStepIndex : 0;
    currentViewIndex = Number.isInteger(state.currentViewIndex) ? state.currentViewIndex : 0;
    completedScrewIds = new Set(Array.isArray(state.completedScrewIds) ? state.completedScrewIds : []);
    elements.safetyPower.checked = Boolean(state.safetyPower);
    elements.safetyBattery.checked = Boolean(state.safetyBattery);
    elements.safetyModel.checked = Boolean(state.safetyModel);
  } catch {
    currentStepIndex = 0;
    currentViewIndex = 0;
    completedScrewIds = new Set();
  }
}

function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      currentStepIndex,
      currentViewIndex,
      completedScrewIds: [...completedScrewIds],
      safetyPower: elements.safetyPower.checked,
      safetyBattery: elements.safetyBattery.checked,
      safetyModel: elements.safetyModel.checked,
    }),
  );
}

function setApiStatus(state, text) {
  elements.apiStatus.dataset.state = state;
  elements.apiStatus.lastChild.textContent = ` ${text}`;
}

async function initialiseGuide() {
  try {
    guide = await loadIfixitGuide();
    setApiStatus("live", "Live iFixit guide loaded");
  } catch (error) {
    console.warn("Using bundled guide fallback", error);
    guide = fallbackGuide();
    setApiStatus("fallback", "Offline guide fallback");
  }
  currentStepIndex = Math.min(currentStepIndex, guide.steps.length - 1);
  currentViewIndex = Math.min(currentViewIndex, getCameraViews(guide.steps[currentStepIndex]).length - 1);
  renderStep();
}

function getCameraViews(step) {
  if (Array.isArray(step.cameraViews) && step.cameraViews.length) return step.cameraViews;

  const interior = step.number >= 9;
  return [{
    id: interior ? "interior" : "rear",
    title: interior ? "Interior view" : "Rear view",
    icon: interior ? "⌖" : "▭",
    instruction: interior
      ? "Keep the Switch in the same 180-degree orientation, with the top edge nearest you. Lay the open interior flat and keep the complete metal frame visible."
      : "Match your reference setup: lay the Switch rear-up, with the logo upside down in the preview and the kickstand on the upper-right. Slight perspective is fine.",
    profile: "device-wide",
    markers: step.screws || step.markers || [],
    rotation: 180,
  }];
}

export function orientMarkers(markers = [], rotation = 0) {
  if (rotation !== 180) return markers;
  return markers.map((marker) => ({
    ...marker,
    x: 1 - marker.x,
    y: 1 - marker.y,
  }));
}

function getCurrentView() {
  const step = guide.steps[currentStepIndex];
  return getCameraViews(step)[currentViewIndex] || getCameraViews(step)[0];
}

function renderStep() {
  const step = guide.steps[currentStepIndex];
  const views = getCameraViews(step);
  currentViewIndex = Math.min(currentViewIndex, views.length - 1);
  const view = views[currentViewIndex];
  const progress = ((currentStepIndex + 1) / guide.steps.length) * 100;
  const rawMarkers = view.markers || step.screws || step.markers || [];
  const currentMarkers = orientMarkers(rawMarkers, view.rotation);
  const currentScrews = currentMarkers.filter((marker) => marker.type === "screw");

  elements.stepNumber.textContent = `Step ${step.number}`;
  elements.stepTitle.textContent = step.title;
  elements.stepSummary.textContent = step.summary;
  elements.stepDetails.innerHTML = "";
  (step.details || []).forEach((detail) => {
    const item = document.createElement("li");
    item.textContent = detail;
    elements.stepDetails.appendChild(item);
  });

  elements.stepWarning.textContent = step.warning || "";
  elements.stepWarning.classList.toggle("hidden", !step.warning);
  elements.currentTool.textContent = step.tool || "No tool required";
  elements.toolTip.textContent = currentScrews.length
    ? `This camera view contains ${currentScrews.length} screw${currentScrews.length === 1 ? "" : "s"}. Remove the orange marker${currentScrews.length === 1 ? "" : "s"}, then continue.`
    : "Use the orange marker as a visual cue and confirm it against the official guide image.";

  elements.progressLabel.textContent = `${currentStepIndex + 1} of ${guide.steps.length}`;
  elements.progressPercent.textContent = `${Math.round(progress)}%`;
  elements.progressBar.style.width = `${progress}%`;
  elements.previousButton.disabled = currentStepIndex === 0 && currentViewIndex === 0;
  elements.nextButton.disabled = false;
  const destination = currentViewIndex < views.length - 1
    ? "Next view"
    : currentStepIndex === guide.steps.length - 1
      ? "Finish"
      : "Next step";
  elements.nextButton.textContent = currentScrews.length
    ? `Removed ${currentScrews.length} — ${destination}`
    : destination;
  elements.ifixitLink.href = step.sourceStepId ? `${IFIXIT_GUIDE_URL}#s${step.sourceStepId}` : IFIXIT_GUIDE_URL;

  renderViewSequence(views);
  updateOrientationCard(view);
  tracker?.setProfile(view.profile || "device-wide");
  tracker?.setMarkers(currentMarkers);
  renderScrewChart();
  renderReferenceImage(step, view);
  saveState();
}

function renderViewSequence(views) {
  elements.viewSequence.innerHTML = "";
  elements.viewSequence.classList.toggle("hidden", views.length <= 1);
  if (views.length <= 1) return;

  views.forEach((view, index) => {
    const chip = document.createElement("div");
    chip.className = `view-chip${index === currentViewIndex ? " active" : ""}${index < currentViewIndex ? " done" : ""}`;
    chip.innerHTML = `<span>${index < currentViewIndex ? "✓" : index + 1}</span><strong>${view.title}</strong>`;
    elements.viewSequence.appendChild(chip);
  });
}

function updateOrientationCard(view) {
  elements.orientationTitle.textContent = view.title;
  elements.orientationInstruction.textContent = view.instruction;
  elements.orientationIcon.textContent = view.icon || "↻";
  elements.orientationCard.classList.toggle("hidden", !cameraActive);
}

function renderReferenceImage(step, view) {
  elements.referenceImageWrap.innerHTML = "";
  const imageUrl = view?.referenceImageUrl || step.imageUrl;
  if (imageUrl) {
    const image = document.createElement("img");
    image.src = imageUrl;
    image.alt = `iFixit reference for step ${step.number}`;
    image.loading = "lazy";
    image.referrerPolicy = "no-referrer";
    image.addEventListener("error", () => renderReferencePlaceholder());
    elements.referenceImageWrap.appendChild(image);
  } else {
    renderReferencePlaceholder();
  }
}

function renderReferencePlaceholder() {
  elements.referenceImageWrap.innerHTML = '<div class="reference-placeholder">Open the linked iFixit step to verify the exact screw location and orientation.</div>';
}

function renderScrewChart() {
  let removed = 0;
  elements.screwChart.innerHTML = "";

  SCREW_BATCHES.forEach((batch) => {
    const completedCount = batch.ids.filter((id) => completedScrewIds.has(id)).length;
    removed += completedCount;
    const done = completedCount === batch.count;
    const row = document.createElement("div");
    row.className = `screw-row${done ? " done" : completedCount ? " partial" : ""}`;
    row.innerHTML = `
      <div class="screw-meta">
        <span class="screw-symbol" aria-hidden="true"></span>
        <div>
          <strong>Step ${batch.stepNumber}, ${batch.length}</strong>
          <small>${batch.driver}</small>
        </div>
      </div>
      <span class="screw-count">${completedCount} / ${batch.count}</span>
    `;
    elements.screwChart.appendChild(row);
  });

  const total = SCREW_BATCHES.reduce((sum, item) => sum + item.count, 0);
  elements.screwTotal.textContent = `${removed} / ${total}`;
}

function handleDetectionState({ state, confidence = 0, profile }) {
  const profileLabel = profile?.label || "device";
  const messages = {
    idle: "Camera stopped",
    loading: "Loading lightweight tracker",
    searching: `Finding ${profileLabel}`,
    detected: `${profileLabel} locked, ${confidence}%`,
    tracking: `${profileLabel} tracked, ${confidence}%`,
    lost: `Move ${profileLabel} into the guide`,
    unavailable: "Tracking library could not load",
    error: "Detection error, press Re-scan",
  };

  elements.trackingText.textContent = messages[state] || state;
  elements.trackingBadge.classList.toggle("lost", ["lost", "unavailable", "error"].includes(state));
  elements.trackingBadge.classList.toggle("hidden", state === "idle");
  const locked = state === "detected" || state === "tracking";
  elements.detectionConfidence.textContent = locked ? `${confidence}% match` : "Scanning shape and contrast";
  elements.detectionConfidenceBar.style.width = locked ? `${confidence}%` : "18%";
  elements.orientationCard.dataset.state = state;
}

function handleManualState({ state, count = 0 }) {
  if (state === "idle") {
    elements.manualButton.classList.remove("active");
    elements.manualButton.textContent = "Tap corners";
    return;
  }
  const messages = {
    calibrating: `Tap corner ${count + 1} of 4`,
    manual: "Manual outline locked",
  };
  elements.trackingText.textContent = messages[state] || "Manual alignment";
  elements.trackingBadge.classList.remove("hidden", "lost");
  elements.detectionConfidence.textContent = state === "manual" ? "Stationary manual lock" : messages[state];
  elements.detectionConfidenceBar.style.width = state === "manual" ? "100%" : `${count * 25}%`;
  elements.orientationCard.dataset.state = state === "manual" ? "detected" : "searching";
  elements.manualButton.classList.toggle("active", state === "calibrating");
  elements.manualButton.textContent = state === "calibrating" ? "Cancel tapping" : "Tap corners";
}

async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    alert("Camera access is not supported in this browser. Use a current browser over HTTPS or localhost.");
    return;
  }

  try {
    cameraActive = true;
    elements.cameraEmpty.classList.add("hidden");
    elements.cameraToolbar.classList.remove("hidden");
    elements.orientationCard.classList.remove("hidden");
    const view = getCurrentView();
    tracker.setProfile(view.profile || "device-wide");
    tracker.setMarkers(orientMarkers(view.markers || [], view.rotation));
    await tracker.startCamera();
    updateOrientationCard(view);
  } catch (error) {
    cameraActive = false;
    elements.cameraEmpty.classList.remove("hidden");
    elements.cameraToolbar.classList.add("hidden");
    elements.orientationCard.classList.add("hidden");
    console.error(error);
    alert("Camera access failed. Check browser permission, then reload the page or use Explore without camera.");
  }
}

function stopCamera() {
  cameraActive = false;
  tracker.stopCamera();
  elements.cameraEmpty.classList.remove("hidden");
  elements.cameraToolbar.classList.add("hidden");
  elements.orientationCard.classList.add("hidden");
  elements.trackingBadge.classList.add("hidden");
  elements.manualButton.classList.remove("active");
  elements.manualButton.textContent = "Tap corners";
}

function startDemo() {
  elements.cameraEmpty.innerHTML = `
    <div class="camera-icon" aria-hidden="true"></div>
    <h2>Guide preview mode</h2>
    <p>Step through each instruction and orientation. Start the camera when you are ready to repair.</p>
    <button id="demoStartCamera" class="primary-button" type="button"><span class="button-icon">●</span>Start camera</button>
  `;
  document.querySelector("#demoStartCamera").addEventListener("click", startCamera);
}

function markCurrentViewComplete() {
  const step = guide.steps[currentStepIndex];
  const view = getCurrentView();
  const markers = view.markers || step.screws || [];
  markers
    .filter((marker) => marker.type === "screw" && marker.id)
    .forEach((marker) => completedScrewIds.add(marker.id));
}

function goNext() {
  const step = guide.steps[currentStepIndex];
  const views = getCameraViews(step);
  markCurrentViewComplete();

  if (currentViewIndex < views.length - 1) {
    currentViewIndex += 1;
    renderStep();
    tracker?.rescan();
    return;
  }

  if (currentStepIndex < guide.steps.length - 1) {
    currentStepIndex += 1;
    currentViewIndex = 0;
    renderStep();
    tracker?.rescan();
  } else {
    renderScrewChart();
    saveState();
    elements.nextButton.textContent = "Completed ✓";
    elements.nextButton.disabled = true;
  }
}

function goPrevious() {
  if (currentViewIndex > 0) {
    currentViewIndex -= 1;
  } else if (currentStepIndex > 0) {
    currentStepIndex -= 1;
    currentViewIndex = getCameraViews(guide.steps[currentStepIndex]).length - 1;
  }
  elements.nextButton.disabled = false;
  renderStep();
  tracker?.rescan();
}

function resetProgress() {
  if (!window.confirm("Reset the current step, screw tracker, and safety checklist?")) return;
  currentStepIndex = 0;
  currentViewIndex = 0;
  completedScrewIds.clear();
  elements.safetyPower.checked = false;
  elements.safetyBattery.checked = false;
  elements.safetyModel.checked = false;
  renderStep();
  tracker?.rescan();
}

function bindEvents() {
  elements.startCameraButton.addEventListener("click", startCamera);
  elements.demoButton.addEventListener("click", startDemo);
  elements.stopCameraButton.addEventListener("click", stopCamera);
  elements.rescanButton.addEventListener("click", () => tracker.rescan());
  elements.manualButton.addEventListener("click", () => {
    if (!cameraActive) return;
    tracker.toggleManualCalibration();
  });
  elements.mirrorButton.addEventListener("click", () => {
    const mirrored = tracker.toggleMirror();
    elements.mirrorButton.textContent = mirrored ? "Unmirror" : "Mirror";
  });
  elements.nextButton.addEventListener("click", goNext);
  elements.previousButton.addEventListener("click", goPrevious);
  elements.resetProgressButton.addEventListener("click", resetProgress);
  elements.helpButton.addEventListener("click", () => elements.helpDialog.showModal());
  elements.closeHelpButton.addEventListener("click", () => elements.helpDialog.close());
  [elements.safetyPower, elements.safetyBattery, elements.safetyModel].forEach((checkbox) => {
    checkbox.addEventListener("change", saveState);
  });
  window.addEventListener("beforeunload", () => tracker.stopCamera());
}

function init() {
  readSavedState();
  tracker = new SwitchTracker({
    video: elements.cameraVideo,
    canvas: elements.overlayCanvas,
    stage: elements.cameraStage,
    onDetectionState: handleDetectionState,
    onManualState: handleManualState,
  });
  bindEvents();
  renderScrewChart();
  renderStep();
  initialiseGuide();
}

init();
