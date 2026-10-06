import * as THREE from "three";

const startCameraButton: HTMLButtonElement | null =
  document.querySelector("#startCamera");

const video: HTMLVideoElement | null =
  document.querySelector("#camera");

const threeContainer: HTMLDivElement | null =
  document.querySelector("#threeContainer");

const navigationArrow: HTMLButtonElement | null = document.querySelector("#navigationArrow");


// Three.js objects
let scene: THREE.Scene;
let threeCamera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let arrow: THREE.ArrowHelper;

async function startCamera(): Promise<void> {
  if (video === null) {
    console.error("Video not found!");
    return;
  }

  try {
    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: "environment"
      },
      audio: false
    };

    const stream: MediaStream =
      await navigator.mediaDevices.getUserMedia(constraints);

    video.srcObject = stream;
  } catch (error: unknown) {
    console.error("Camera error:", error);
    return;
  }

  initThree();
}

type SensorAPI = {
  requestPermission?: () => Promise<"granted" | "denied">;
};

async function enableSensors(): Promise<void> {
  const orientationAPI =
    typeof DeviceOrientationEvent !== "undefined"
      ? (DeviceOrientationEvent as unknown as SensorAPI)
      : undefined;

  const motionAPI =
    typeof DeviceMotionEvent !== "undefined"
      ? (DeviceMotionEvent as unknown as SensorAPI)
      : undefined;

  // Start both requests directly from the button tap.
  const orientationRequest = orientationAPI?.requestPermission?.();
  const motionRequest = motionAPI?.requestPermission?.();

  const [orientationPermission, motionPermission] = await Promise.all([
    orientationRequest,
    motionRequest
  ]);

  if (
    orientationAPI &&
    (orientationPermission === undefined ||
      orientationPermission === "granted")
  ) {
    window.addEventListener("deviceorientation", handleOrientation);
  }

  if (
    motionAPI &&
    (motionPermission === undefined ||
      motionPermission === "granted")
  ) {
    window.addEventListener("devicemotion", handleMotion);
  }
}


function initThree(): void {
  if (threeContainer === null) {
    console.error("No three container!");
    return;
  }

  // Scene
  scene = new THREE.Scene();

  // Camera
  threeCamera = new THREE.PerspectiveCamera(
    75,
    threeContainer.clientWidth / threeContainer.clientHeight,
    0.1,
    1000
  );

  threeCamera.position.z = 5;

  // Renderer
  renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true
  });

  renderer.setSize(
    threeContainer.clientWidth,
    threeContainer.clientHeight
  );

  threeContainer.appendChild(renderer.domElement);

  animate();
}

function animate(): void {
  requestAnimationFrame(animate);

  navigationArrow.style.display = "block";

  renderer.render(
    scene,
    threeCamera
  );
}

function handleOrientation(event: DeviceOrientationEvent): void {
  const alpha: number | null = event.alpha;
  const beta: number | null = event.beta;
  const gamma: number | null = event.gamma;

  console.log({
    alpha,
    beta,
    gamma
  })
}

function handleMotion(event: DeviceMotionEvent): void {
  // Prefer acceleration without gravity; fall back if unavailable.
  const acceleration =
    event.acceleration?.x != null
      ? event.acceleration
      : event.accelerationIncludingGravity;

  if (acceleration === null) {
    return;
  }

  console.log("Acceleration (m/s²):", {
    x: acceleration.x,
    y: acceleration.y,
    z: acceleration.z
  });

  console.log("Rotation speed (degrees/s):", event.rotationRate);
}

window.addEventListener(
  "devicemotion",
  handleMotion
);

if (startCameraButton !== null) {
  startCameraButton?.addEventListener("click", async () => {
    try {
      // Request sensor permission directly from the tap.
      // await enableSensors();
      await startCamera();
    } catch (error) {
      console.error("Start failed:", error);
    }
  });
}

function changeArrow(event: KeyboardEvent): void {
  if (navigationArrow === null) {
    return;
  }

  navigationArrow.classList.remove(
    "mdi-light--arrow-up",
    "mdi-light--arrow-down",
    "mdi-light--arrow-left",
    "mdi-light--arrow-right"
  );

  switch (event.key) {
    case "ArrowUp":
      navigationArrow.classList.add("mdi-light--arrow-up");
      break;

    case "ArrowDown":
      navigationArrow.classList.add("mdi-light--arrow-down");
      break;

    case "ArrowLeft":
      navigationArrow.classList.add("mdi-light--arrow-left");
      break;

    case "ArrowRight":
      navigationArrow.classList.add("mdi-light--arrow-right");
      break;

    default:
      return;
  }

  event.preventDefault();
}

if (startCameraButton !== null) {
  startCameraButton.addEventListener("click", async () => {
    console.log("BUTTON TAPPED");

    try {
      await enableSensors();
      await startCamera();
    } catch (error) {
      console.error("Start failed:", error);
    }
  });
}

window.addEventListener("keydown", changeArrow);
