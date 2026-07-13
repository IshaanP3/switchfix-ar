const DETECTION_PROFILES = {
  "device-wide": {
    id: "device-wide",
    label: "Switch body",
    orientation: "horizontal",
    minAspect: 1.35,
    maxAspect: 3.0,
    minAreaRatio: 0.018,
    maxAreaRatio: 0.82,
    targetAreaRatio: 0.09,
    minFill: 0.42,
    darkThreshold: 122,
  },
  "edge-horizontal": {
    id: "edge-horizontal",
    label: "horizontal edge",
    orientation: "horizontal",
    minAspect: 3.0,
    maxAspect: 22,
    minAreaRatio: 0.004,
    maxAreaRatio: 0.42,
    targetAreaRatio: 0.065,
    minFill: 0.22,
    darkThreshold: 105,
  },
  "edge-vertical": {
    id: "edge-vertical",
    label: "vertical rail",
    orientation: "vertical",
    minAspect: 3.0,
    maxAspect: 22,
    minAreaRatio: 0.004,
    maxAreaRatio: 0.42,
    targetAreaRatio: 0.065,
    minFill: 0.22,
    darkThreshold: 105,
  },
};

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function polygonArea(points) {
  if (points.length !== 4) return 0;
  let area = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    area += current.x * next.y - next.x * current.y;
  }
  return Math.abs(area / 2);
}

function quadrilateralAspect(points) {
  const horizontal = (distance(points[0], points[1]) + distance(points[2], points[3])) / 2;
  const vertical = (distance(points[1], points[2]) + distance(points[3], points[0])) / 2;
  return Math.max(horizontal, vertical) / Math.max(1, Math.min(horizontal, vertical));
}

function averagePointDistance(a, b) {
  if (!a?.length || !b?.length || a.length !== b.length) return Number.POSITIVE_INFINITY;
  return a.reduce((sum, point, index) => sum + distance(point, b[index]), 0) / a.length;
}

function orderCorners(points) {
  if (points.length !== 4) return points;

  const sums = points.map((point) => point.x + point.y);
  const differences = points.map((point) => point.x - point.y);
  const ordered = [
    points[sums.indexOf(Math.min(...sums))],
    points[differences.indexOf(Math.max(...differences))],
    points[sums.indexOf(Math.max(...sums))],
    points[differences.indexOf(Math.min(...differences))],
  ];

  if (new Set(ordered).size === 4) return ordered;

  const sorted = [...points].sort((a, b) => a.y - b.y);
  const top = sorted.slice(0, 2).sort((a, b) => a.x - b.x);
  const bottom = sorted.slice(2).sort((a, b) => a.x - b.x);
  return [top[0], top[1], bottom[1], bottom[0]];
}

function longAxisAngle(points) {
  const topLength = distance(points[0], points[1]);
  const sideLength = distance(points[1], points[2]);
  const start = points[0];
  const end = topLength >= sideLength ? points[1] : points[3];
  let angle = Math.abs((Math.atan2(end.y - start.y, end.x - start.x) * 180) / Math.PI);
  while (angle > 180) angle -= 180;
  if (angle > 90) angle = 180 - angle;
  return angle;
}

function smoothCorners(previous, next, alpha = 0.3) {
  if (!previous?.length) return next;
  return next.map((point, index) => ({
    x: previous[index].x * (1 - alpha) + point.x * alpha,
    y: previous[index].y * (1 - alpha) + point.y * alpha,
  }));
}

function regularizePerspective(points, maximumEdgeRatio = 1.2) {
  const adjusted = points.map((point) => ({ ...point }));
  const topWidth = distance(adjusted[0], adjusted[1]);
  const bottomWidth = distance(adjusted[3], adjusted[2]);
  const widerTop = topWidth > bottomWidth;
  const widerWidth = Math.max(topWidth, bottomWidth);
  const narrowerWidth = Math.max(1, Math.min(topWidth, bottomWidth));
  if (widerWidth / narrowerWidth <= maximumEdgeRatio) return adjusted;

  const firstIndex = widerTop ? 0 : 3;
  const secondIndex = widerTop ? 1 : 2;
  const first = adjusted[firstIndex];
  const second = adjusted[secondIndex];
  const center = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
  const length = distance(first, second);
  const targetHalf = narrowerWidth * maximumEdgeRatio / 2;
  const unit = { x: (second.x - first.x) / length, y: (second.y - first.y) / length };
  adjusted[firstIndex] = { x: center.x - unit.x * targetHalf, y: center.y - unit.y * targetHalf };
  adjusted[secondIndex] = { x: center.x + unit.x * targetHalf, y: center.y + unit.y * targetHalf };
  return adjusted;
}

export class SwitchTracker {
  constructor({ video, canvas, stage, onDetectionState, onManualState }) {
    this.video = video;
    this.canvas = canvas;
    this.stage = stage;
    this.ctx = canvas.getContext("2d");
    this.onDetectionState = onDetectionState;
    this.onManualState = onManualState;

    this.stream = null;
    this.trackerReady = false;
    this.mirrored = false;
    this.points = [];
    this.markers = [];
    this.profile = DETECTION_PROFILES["device-wide"];
    this.animationFrame = null;
    this.lastDetectionAt = 0;
    this.frameInterval = 1000 / 10;
    this.analysisCanvas = document.createElement("canvas");
    this.analysisContext = this.analysisCanvas.getContext("2d", { willReadFrequently: true });
    this.analysisWidth = 0;
    this.analysisHeight = 0;
    this.gray = null;
    this.blurred = null;
    this.previousPyramid = null;
    this.currentPyramid = null;
    this.hasPreviousFrame = false;
    this.trackingFrame = 0;
    this.redetectEvery = 8;
    this.detectedFrames = 0;
    this.missedFrames = 0;
    this.lastConfidence = 0;
    this.lastState = "idle";
    this.manualLock = false;
    this.calibrating = false;
    this.calibrationPoints = [];

    this.renderLoop = this.renderLoop.bind(this);
    this.handleCalibrationTap = this.handleCalibrationTap.bind(this);
    this.canvas.addEventListener("pointerdown", this.handleCalibrationTap);
  }

  async waitForTracker(timeoutMs = 5000) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      if (globalThis.jsfeat?.matrix_t && globalThis.jsfeat?.optical_flow_lk) {
        this.trackerReady = true;
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return false;
  }

  async startCamera() {
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });

    this.video.srcObject = this.stream;
    await this.video.play();
    await new Promise((resolve) => {
      if (this.video.videoWidth) resolve();
      else this.video.addEventListener("loadedmetadata", resolve, { once: true });
    });

    this.resizeCanvas();
    this.video.style.display = "block";
    this.resetTrackingBuffers();
    this.rescan();
    this.animationFrame = requestAnimationFrame(this.renderLoop);
    this.emitState("loading");

    const ready = await this.waitForTracker();
    if (!this.stream) return;
    if (this.manualLock) {
      this.onManualState?.({ state: "manual", count: 4 });
    } else if (ready) {
      this.emitState("searching");
    } else {
      this.emitState("unavailable");
    }
  }

  stopCamera() {
    cancelAnimationFrame(this.animationFrame);
    this.animationFrame = null;
    this.points = [];
    this.cancelManualCalibration();
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.video.srcObject = null;
    this.video.style.display = "none";
    this.resetTrackingBuffers();
    this.clearCanvas();
    this.stage.classList.remove("mirrored");
    this.emitState("idle");
  }

  resizeCanvas() {
    const width = this.video.videoWidth || 1280;
    const height = this.video.videoHeight || 720;
    this.canvas.width = width;
    this.canvas.height = height;
    this.stage.style.aspectRatio = `${width} / ${height}`;
  }

  setProfile(profile) {
    const nextProfile = typeof profile === "string"
      ? DETECTION_PROFILES[profile] || DETECTION_PROFILES["device-wide"]
      : { ...DETECTION_PROFILES[profile?.id] || DETECTION_PROFILES["device-wide"], ...profile };

    if (this.profile?.id !== nextProfile.id) {
      this.profile = nextProfile;
      this.rescan();
    } else {
      this.profile = nextProfile;
    }
  }

  setMarkers(markers = []) {
    this.markers = markers;
  }

  rescan() {
    this.manualLock = false;
    this.cancelManualCalibration();
    this.points = [];
    this.detectedFrames = 0;
    this.missedFrames = 0;
    this.lastConfidence = 0;
    this.trackingFrame = 0;
    this.hasPreviousFrame = false;
    if (this.stream) this.emitState(this.trackerReady ? "searching" : "loading");
  }

  toggleMirror() {
    this.mirrored = !this.mirrored;
    this.stage.classList.toggle("mirrored", this.mirrored);
    return this.mirrored;
  }

  toggleManualCalibration() {
    if (this.calibrating) {
      this.rescan();
      return false;
    }

    this.manualLock = false;
    this.points = [];
    this.calibrationPoints = [];
    this.calibrating = true;
    this.canvas.classList.add("calibrating");
    this.onManualState?.({ state: "calibrating", count: 0 });
    return true;
  }

  cancelManualCalibration() {
    this.calibrating = false;
    this.calibrationPoints = [];
    this.canvas.classList.remove("calibrating");
    this.onManualState?.({ state: "idle", count: 0 });
  }

  handleCalibrationTap(event) {
    if (!this.calibrating || !this.stream) return;
    const bounds = this.canvas.getBoundingClientRect();
    let x = ((event.clientX - bounds.left) / bounds.width) * this.canvas.width;
    const y = ((event.clientY - bounds.top) / bounds.height) * this.canvas.height;
    if (this.mirrored) x = this.canvas.width - x;

    this.calibrationPoints.push({ x, y });
    if (this.calibrationPoints.length < 4) {
      this.onManualState?.({ state: "calibrating", count: this.calibrationPoints.length });
      return;
    }

    this.points = orderCorners(this.calibrationPoints);
    this.manualLock = true;
    this.calibrating = false;
    this.calibrationPoints = [];
    this.canvas.classList.remove("calibrating");
    this.lastConfidence = 100;
    this.onManualState?.({ state: "manual", count: 4 });
  }

  renderLoop(timestamp) {
    if (!this.stream) return;
    this.drawOverlay();

    if (this.trackerReady && !this.manualLock && !this.calibrating && timestamp - this.lastDetectionAt >= this.frameInterval) {
      this.lastDetectionAt = timestamp;
      this.detectDevice();
    }

    this.animationFrame = requestAnimationFrame(this.renderLoop);
  }

  detectDevice() {
    const jsfeat = globalThis.jsfeat;
    if (!jsfeat) return;

    try {
      this.ensureAnalysisBuffers(jsfeat);
      this.analysisContext.drawImage(this.video, 0, 0, this.analysisWidth, this.analysisHeight);
      const image = this.analysisContext.getImageData(0, 0, this.analysisWidth, this.analysisHeight);
      jsfeat.imgproc.grayscale(
        image.data,
        this.analysisWidth,
        this.analysisHeight,
        this.gray,
        jsfeat.COLOR_RGBA2GRAY,
      );
      jsfeat.imgproc.gaussian_blur(this.gray, this.blurred, 5, 0);
      this.currentPyramid.build(this.blurred, false);

      this.trackingFrame += 1;
      const tracked = this.trackWithOpticalFlow(jsfeat);
      if (tracked && this.trackingFrame % this.redetectEvery !== 0) {
        this.detectedFrames += 1;
        this.missedFrames = 0;
        this.lastConfidence = Math.max(this.lastConfidence, 78);
        this.emitState("tracking", this.lastConfidence);
        this.finishAnalysisFrame();
        return;
      }

      const candidate = this.findDarkCandidate();

      if (candidate) {
        const movement = averagePointDistance(this.points, candidate.points);
        const frameDiagonal = Math.hypot(this.canvas.width, this.canvas.height);
        const alpha = Number.isFinite(movement) && movement > frameDiagonal * 0.08 ? 0.58 : 0.3;
        this.points = smoothCorners(this.points, candidate.points, alpha);
        this.detectedFrames += 1;
        this.missedFrames = 0;
        this.lastConfidence = candidate.confidence;
        this.emitState(this.detectedFrames >= 2 ? "detected" : "searching", candidate.confidence);
      } else if (tracked) {
        this.detectedFrames += 1;
        this.missedFrames = 0;
        this.emitState("tracking", this.lastConfidence);
      } else {
        this.detectedFrames = 0;
        this.missedFrames += 1;
        if (this.missedFrames > 5) this.points = [];
        this.emitState(this.points.length ? "searching" : "lost", this.lastConfidence);
      }
      this.finishAnalysisFrame();
    } catch (error) {
      console.warn("Automatic Switch tracking error", error);
      this.emitState("error");
    }
  }

  ensureAnalysisBuffers(jsfeat) {
    const width = Math.min(360, this.video.videoWidth || this.canvas.width || 1280);
    const height = Math.max(1, Math.round(width * (this.video.videoHeight || this.canvas.height || 720) / (this.video.videoWidth || this.canvas.width || 1280)));
    if (this.analysisWidth === width && this.analysisHeight === height && this.gray) return;

    this.analysisWidth = width;
    this.analysisHeight = height;
    this.analysisCanvas.width = width;
    this.analysisCanvas.height = height;
    const matrixType = jsfeat.U8_t | jsfeat.C1_t;
    this.gray = new jsfeat.matrix_t(width, height, matrixType);
    this.blurred = new jsfeat.matrix_t(width, height, matrixType);
    this.previousPyramid = new jsfeat.pyramid_t(3);
    this.currentPyramid = new jsfeat.pyramid_t(3);
    this.previousPyramid.allocate(width, height, matrixType);
    this.currentPyramid.allocate(width, height, matrixType);
    this.hasPreviousFrame = false;
  }

  finishAnalysisFrame() {
    [this.previousPyramid, this.currentPyramid] = [this.currentPyramid, this.previousPyramid];
    this.hasPreviousFrame = true;
  }

  trackWithOpticalFlow(jsfeat) {
    if (!this.hasPreviousFrame || this.points.length !== 4) return false;

    const scaleX = this.analysisWidth / this.canvas.width;
    const scaleY = this.analysisHeight / this.canvas.height;
    const previousPoints = new Float32Array(8);
    const currentPoints = new Float32Array(8);
    const status = new Uint8Array(4);
    this.points.forEach((point, index) => {
      previousPoints[index * 2] = point.x * scaleX;
      previousPoints[index * 2 + 1] = point.y * scaleY;
    });

    jsfeat.optical_flow_lk.track(
      this.previousPyramid,
      this.currentPyramid,
      previousPoints,
      currentPoints,
      4,
      20,
      30,
      status,
      0.01,
      0.001,
    );
    if (Array.from(status).some((value) => value !== 1)) return false;

    const trackedPoints = orderCorners(Array.from({ length: 4 }, (_, index) => ({
      x: currentPoints[index * 2] / scaleX,
      y: currentPoints[index * 2 + 1] / scaleY,
    })));
    if (!this.isValidQuadrilateral(trackedPoints)) return false;
    this.points = smoothCorners(this.points, trackedPoints, 0.62);
    return true;
  }

  isValidQuadrilateral(points) {
    if (!points?.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y))) return false;
    const areaRatio = polygonArea(points) / Math.max(1, this.canvas.width * this.canvas.height);
    const aspect = quadrilateralAspect(points);
    const targetAngle = this.profile.orientation === "vertical" ? 90 : 0;
    const angleDifference = Math.abs(targetAngle - longAxisAngle(points));
    return areaRatio >= this.profile.minAreaRatio * 0.7 &&
      areaRatio <= this.profile.maxAreaRatio * 1.1 &&
      aspect >= this.profile.minAspect * 0.75 &&
      aspect <= this.profile.maxAspect * 1.2 &&
      angleDifference <= 48;
  }

  findDarkCandidate() {
    const width = this.analysisWidth;
    const height = this.analysisHeight;
    const total = width * height;
    const pixels = this.blurred.data;
    const mask = new Uint8Array(total);
    const threshold = this.profile.darkThreshold;
    for (let index = 0; index < total; index += 1) mask[index] = pixels[index] < threshold ? 1 : 0;

    const queue = new Int32Array(total);
    const scaleX = this.canvas.width / width;
    const scaleY = this.canvas.height / height;
    const frameArea = this.canvas.width * this.canvas.height;
    const frameCenter = { x: this.canvas.width / 2, y: this.canvas.height / 2 };
    const frameDiagonal = Math.hypot(this.canvas.width, this.canvas.height);
    let best = null;

    for (let seed = 0; seed < total; seed += 1) {
      if (!mask[seed]) continue;
      let head = 0;
      let tail = 1;
      queue[0] = seed;
      mask[seed] = 0;
      let area = 0;
      let minX = width;
      let maxX = 0;
      let minY = height;
      let maxY = 0;
      let topLeft = { x: width, y: height, value: Number.POSITIVE_INFINITY };
      let topRight = { x: 0, y: height, value: Number.NEGATIVE_INFINITY };
      let bottomRight = { x: 0, y: 0, value: Number.NEGATIVE_INFINITY };
      let bottomLeft = { x: width, y: 0, value: Number.POSITIVE_INFINITY };

      while (head < tail) {
        const position = queue[head++];
        const x = position % width;
        const y = Math.floor(position / width);
        area += 1;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
        const sum = x + y;
        const difference = x - y;
        if (sum < topLeft.value) topLeft = { x, y, value: sum };
        if (difference > topRight.value) topRight = { x, y, value: difference };
        if (sum > bottomRight.value) bottomRight = { x, y, value: sum };
        if (difference < bottomLeft.value) bottomLeft = { x, y, value: difference };

        const startX = Math.max(0, x - 1);
        const endX = Math.min(width - 1, x + 1);
        const startY = Math.max(0, y - 1);
        const endY = Math.min(height - 1, y + 1);
        for (let nextY = startY; nextY <= endY; nextY += 1) {
          for (let nextX = startX; nextX <= endX; nextX += 1) {
            const next = nextY * width + nextX;
            if (!mask[next]) continue;
            mask[next] = 0;
            queue[tail++] = next;
          }
        }
      }

      if (area < total * 0.002 || minX <= 1 || minY <= 1 || maxX >= width - 2 || maxY >= height - 2) continue;
      const rawPoints = orderCorners([topLeft, topRight, bottomRight, bottomLeft].map((point) => ({
        x: point.x * scaleX,
        y: point.y * scaleY,
      })));
      const points = this.profile.id === "device-wide" ? regularizePerspective(rawPoints) : rawPoints;
      const quadArea = polygonArea(points);
      const areaRatio = quadArea / frameArea;
      const aspect = quadrilateralAspect(points);
      const fill = area / Math.max(1, (maxX - minX + 1) * (maxY - minY + 1));

      if (
        areaRatio < this.profile.minAreaRatio ||
        areaRatio > this.profile.maxAreaRatio ||
        aspect < this.profile.minAspect ||
        aspect > this.profile.maxAspect ||
        fill < this.profile.minFill
      ) continue;

      const angle = longAxisAngle(points);
      const targetAngle = this.profile.orientation === "vertical" ? 90 : 0;
      const angleDifference = Math.abs(targetAngle - angle);
      if (angleDifference > 42) continue;

      const center = {
        x: points.reduce((sum, point) => sum + point.x, 0) / 4,
        y: points.reduce((sum, point) => sum + point.y, 0) / 4,
      };
      const centerScore = 1 - clamp(distance(center, frameCenter) / (frameDiagonal * 0.48), 0, 1);
      const orientationScore = 1 - clamp(angleDifference / 42, 0, 1);
      const areaScore = 1 - clamp(Math.abs(areaRatio - this.profile.targetAreaRatio) / this.profile.targetAreaRatio, 0, 1);
      const fillScore = clamp((fill - this.profile.minFill) / (1 - this.profile.minFill), 0, 1);
      const aspectMidpoint = (this.profile.minAspect + Math.min(this.profile.maxAspect, 8)) / 2;
      const aspectScore = 1 - clamp(Math.abs(aspect - aspectMidpoint) / Math.max(aspectMidpoint, 1), 0, 1);
      const temporalDistance = averagePointDistance(this.points, points);
      const temporalScore = this.points.length
        ? 1 - clamp(temporalDistance / (frameDiagonal * 0.24), 0, 1)
        : 0.5;
      const borderMargin = Math.min(...points.map((point) => Math.min(
        point.x,
        point.y,
        this.canvas.width - point.x,
        this.canvas.height - point.y,
      )));
      const borderScore = clamp(borderMargin / (Math.min(this.canvas.width, this.canvas.height) * 0.06), 0, 1);

      const score =
        centerScore * 0.18 +
        orientationScore * 0.2 +
        areaScore * 0.18 +
        fillScore * 0.16 +
        aspectScore * 0.08 +
        temporalScore * 0.15 +
        borderScore * 0.05;

      if (!best || score > best.score) {
        best = {
          points,
          score,
          confidence: Math.round(clamp(score, 0, 1) * 100),
          area: quadArea,
        };
      }

    }

    return best && best.score >= 0.42 ? best : null;
  }

  emitState(state, confidence = this.lastConfidence) {
    if (state === this.lastState && state !== "detected" && state !== "tracking") return;
    this.lastState = state;
    this.onDetectionState?.({
      state,
      confidence,
      profile: this.profile,
    });
  }

  drawOverlay() {
    this.clearCanvas();
    if (!this.points.length) {
      this.drawTargetGuide();
      this.drawCalibrationPoints();
      return;
    }

    const ctx = this.ctx;
    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    ctx.beginPath();
    this.points.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();
    ctx.strokeStyle = "rgba(255, 122, 26, 0.9)";
    ctx.lineWidth = Math.max(2, this.canvas.width / 520);
    ctx.setLineDash([12, 8]);
    ctx.stroke();
    ctx.setLineDash([]);

    this.markers.forEach((marker, index) => this.drawMarker(marker, index));
    ctx.restore();
  }

  drawTargetGuide() {
    if (!this.stream) return;
    const ctx = this.ctx;
    const horizontalEdge = this.profile.id === "edge-horizontal";
    const verticalEdge = this.profile.id === "edge-vertical";
    const width = verticalEdge ? this.canvas.width * 0.16 : horizontalEdge ? this.canvas.width * 0.72 : this.canvas.width * 0.50;
    const height = horizontalEdge ? this.canvas.height * 0.16 : verticalEdge ? this.canvas.height * 0.72 : this.canvas.height * 0.30;
    const x = (this.canvas.width - width) / 2;
    const y = (this.canvas.height - height) / 2;

    ctx.save();
    ctx.strokeStyle = "rgba(255, 122, 26, 0.58)";
    ctx.lineWidth = Math.max(2, this.canvas.width / 600);
    ctx.setLineDash([15, 11]);
    roundRect(ctx, x, y, width, height, Math.max(10, this.canvas.width / 90));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(18, 20, 22, 0.78)";
    const label = horizontalEdge
      ? "Align the visible edge horizontally"
      : verticalEdge
        ? "Align the visible rail vertically"
        : "Keep the Switch near the middle; a slight angle is OK";
    ctx.font = `700 ${Math.max(12, Math.round(this.canvas.width / 85))}px Inter, sans-serif`;
    const textWidth = ctx.measureText(label).width + 24;
    roundRect(ctx, (this.canvas.width - textWidth) / 2, y + height + 15, textWidth, 34, 8);
    ctx.fill();
    ctx.fillStyle = "#fff4eb";
    ctx.textAlign = "center";
    ctx.fillText(label, this.canvas.width / 2, y + height + 37);
    ctx.restore();
  }

  drawCalibrationPoints() {
    if (!this.calibrating || !this.calibrationPoints.length) return;
    const ctx = this.ctx;
    const scale = Math.max(0.75, this.canvas.width / 1280);
    ctx.save();
    this.calibrationPoints.forEach((point, index) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 13 * scale, 0, Math.PI * 2);
      ctx.fillStyle = "#ff7a1a";
      ctx.fill();
      ctx.fillStyle = "#17120e";
      ctx.font = `900 ${Math.round(12 * scale)}px Inter, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(index + 1), point.x, point.y);
    });
    ctx.restore();
  }

  drawMarker(marker, index) {
    const point = projectPoint(marker.x, marker.y, this.points);
    const scale = Math.max(0.75, this.canvas.width / 1280);
    const ctx = this.ctx;

    if (marker.type === "screw") {
      const radius = 14 * scale;
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius + 9 * scale, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 122, 26, 0.18)";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 122, 26, 0.96)";
      ctx.fill();
      ctx.strokeStyle = "#fff3e9";
      ctx.lineWidth = 2 * scale;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(point.x - 6 * scale, point.y);
      ctx.lineTo(point.x + 6 * scale, point.y);
      ctx.moveTo(point.x, point.y - 6 * scale);
      ctx.lineTo(point.x, point.y + 6 * scale);
      ctx.strokeStyle = "#27160a";
      ctx.lineWidth = 2 * scale;
      ctx.stroke();
      this.drawLabel(point, `${index + 1}`, marker.label, scale);
    } else {
      const radius = 10 * scale;
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius + 10 * scale, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 122, 26, 0.16)";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = "#ff7a1a";
      ctx.fill();
      this.drawLabel(point, "", marker.label, scale);
    }
  }

  drawLabel(point, number, label, scale) {
    const ctx = this.ctx;
    const text = number ? `${number}  ${label}` : label;
    ctx.font = `700 ${Math.round(12 * scale)}px Inter, sans-serif`;
    const width = ctx.measureText(text).width + 18 * scale;
    const x = Math.min(Math.max(8, point.x + 18 * scale), this.canvas.width - width - 8);
    const y = Math.min(Math.max(22, point.y - 18 * scale), this.canvas.height - 16);
    roundRect(ctx, x, y - 18 * scale, width, 27 * scale, 7 * scale);
    ctx.fillStyle = "rgba(20, 22, 24, 0.9)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 122, 26, 0.62)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#fff4eb";
    ctx.fillText(text, x + 9 * scale, y);
  }

  clearCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  resetTrackingBuffers() {
    this.gray = null;
    this.blurred = null;
    this.previousPyramid = null;
    this.currentPyramid = null;
    this.analysisWidth = 0;
    this.analysisHeight = 0;
    this.hasPreviousFrame = false;
  }
}

export function projectPoint(u, v, corners) {
  const [p0, p1, p2, p3] = corners;
  const dx1 = p1.x - p2.x;
  const dx2 = p3.x - p2.x;
  const dx3 = p0.x - p1.x + p2.x - p3.x;
  const dy1 = p1.y - p2.y;
  const dy2 = p3.y - p2.y;
  const dy3 = p0.y - p1.y + p2.y - p3.y;

  let a;
  let b;
  let c;
  let d;
  let e;
  let f;
  let g;
  let h;

  if (Math.abs(dx3) < 1e-8 && Math.abs(dy3) < 1e-8) {
    a = p1.x - p0.x;
    b = p3.x - p0.x;
    c = p0.x;
    d = p1.y - p0.y;
    e = p3.y - p0.y;
    f = p0.y;
    g = 0;
    h = 0;
  } else {
    const determinant = dx1 * dy2 - dx2 * dy1;
    if (Math.abs(determinant) < 1e-9) return { x: p0.x, y: p0.y };
    g = (dx3 * dy2 - dx2 * dy3) / determinant;
    h = (dx1 * dy3 - dx3 * dy1) / determinant;
    a = p1.x - p0.x + g * p1.x;
    b = p3.x - p0.x + h * p3.x;
    c = p0.x;
    d = p1.y - p0.y + g * p1.y;
    e = p3.y - p0.y + h * p3.y;
    f = p0.y;
  }

  const denominator = g * u + h * v + 1;
  return {
    x: (a * u + b * v + c) / denominator,
    y: (d * u + e * v + f) / denominator,
  };
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, width, height, radius);
    return;
  }
  const r = Math.min(radius, width / 2, height / 2);
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}
