import "./style.css";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import * as THREE from "three";
import { 
  PhysicsSimulation, 
  CelestialBodyPresets, 
  Vector2D,
  createCelestialBody
} from 'astro-physics-engine';

// Textures
import marsTexture from "../img/mars_1k_color.jpg";
import sunTexture from "../img/sunmap.jpg";
// Note: Using procedural material for Earth since we don't have an Earth texture
// Canvas
const canvas = document.querySelector("canvas.webgl");

// Scene
const scene = new THREE.Scene();

/**
 * Object
 */
const textureLoader = new THREE.TextureLoader();
const marsGeometry = new THREE.SphereGeometry(0.5, 64, 64);
const earthGeometry = new THREE.SphereGeometry(0.5, 64, 64);
const sunGeometry = new THREE.SphereGeometry(0.5, 64, 64);
const sunMaterial = new THREE.MeshBasicMaterial({
  map: textureLoader.load(sunTexture),
});
const marsMaterial = new THREE.MeshLambertMaterial({
  map: textureLoader.load(marsTexture),
});
const earthMaterial = new THREE.MeshLambertMaterial({
  color: 0x4169E1, // Royal blue color for Earth
});
const marsMesh = new THREE.Mesh(marsGeometry, marsMaterial);
const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);

// Scale the meshes to realistic proportions
// Sun radius: 6.96e8 meters, Mars radius: 3.39e6 meters
// Ratio: Sun is ~205 times larger than Mars
// For visualization, we'll scale down but maintain the ratio
const sunRadius = 6.96e8;
const marsRadius = 3.39e6;
const sizeRatio = sunRadius / marsRadius; // ~205

// Calculate Earth scale too (Earth radius: 6.371e6 meters)
const earthRadius = 6.371e6;
const earthToMarsRatio = earthRadius / marsRadius; // ~1.88 (Earth is bigger than Mars)

// Scale planets to reasonable sizes, then scale Sun proportionally
const marsScale = 0.1; // Small Mars for better orbit visualization
const earthScale = marsScale * earthToMarsRatio; // Earth proportionally bigger than Mars
const sunScale = marsScale * sizeRatio * 0.01; // Scale down the ratio for better viewing

sunMesh.scale.set(sunScale, sunScale, sunScale);  // Realistic Sun size
earthMesh.scale.set(earthScale, earthScale, earthScale);  // Earth bigger than Mars
marsMesh.scale.set(marsScale, marsScale, marsScale);  // Small Mars

scene.add(sunMesh);
scene.add(earthMesh);
scene.add(marsMesh);

// Create physics simulation
const sun = CelestialBodyPresets.createSun();

// Create Earth using the preset (which has the right orbital parameters)
const earth = CelestialBodyPresets.createEarth();

// Create Mars manually since it's not in the 2D presets
const mars = createCelestialBody({
  id: "mars",
  name: "Mars",
  mass: 6.39e23, // kg (Mars mass)
  position: new Vector2D(2.28e11, 0), // meters (Mars average distance from Sun)
  velocity: new Vector2D(0, 24100), // m/s (Mars orbital velocity)
  radius: 3.39e6, // meters (Mars radius)
  color: "#CD5C5C"
});

// Set up the simulation with the celestial bodies
const simulation = new PhysicsSimulation([sun, earth, mars]);
simulation.dt = 86400 * 10; // 10 days per step for faster orbit

// Scale factor for converting physics units to Three.js units
const SCALE_FACTOR = 1 / 1e11; // Convert meters to scene units

// Create orbital trails for both planets
// Mars trail
const marsTrailGeometry = new THREE.BufferGeometry();
const marsTrailMaterial = new THREE.LineBasicMaterial({ color: 0xff4500, opacity: 0.6, transparent: true });
const marsTrailPositions = [];
const MAX_TRAIL_POINTS = 200;

// Earth trail  
const earthTrailGeometry = new THREE.BufferGeometry();
const earthTrailMaterial = new THREE.LineBasicMaterial({ color: 0x4169E1, opacity: 0.6, transparent: true });
const earthTrailPositions = [];

// Initialize trail positions for both planets
for (let i = 0; i < MAX_TRAIL_POINTS; i++) {
  marsTrailPositions.push(0, 0, 0);
  earthTrailPositions.push(0, 0, 0);
}

marsTrailGeometry.setAttribute('position', new THREE.Float32BufferAttribute(marsTrailPositions, 3));
earthTrailGeometry.setAttribute('position', new THREE.Float32BufferAttribute(earthTrailPositions, 3));

const marsTrailLine = new THREE.Line(marsTrailGeometry, marsTrailMaterial);
const earthTrailLine = new THREE.Line(earthTrailGeometry, earthTrailMaterial);

scene.add(marsTrailLine);
scene.add(earthTrailLine);

// Trail tracking variables
let marsTrailIndex = 0;
let earthTrailIndex = 0;
const trailUpdateCounter = { count: 0 };

// Add some ambient lighting
const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
scene.add(ambientLight);

// Add point light at sun position for realistic lighting
const sunLight = new THREE.PointLight(0xffffff, 1, 100);
scene.add(sunLight);

// Get DOM elements for info display
const distanceElement = document.getElementById('distance');
const velocityElement = document.getElementById('velocity');
const simTimeElement = document.getElementById('sim-time');

// Simulation time tracking
let simulationTime = 0;
let lastPhysicsUpdate = 0;

/**
 * Sizes
 */
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

/**
 * Camera
 */
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height);
camera.position.set(0, 0, 8); // Better initial position to see the full orbit
scene.add(camera);

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.render(scene, camera);

// Controls
const orbit = new OrbitControls(camera, renderer.domElement);
orbit.update();

/**
 * Window Resize Handler
 */
window.addEventListener('resize', () => {
  // Update sizes
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  // Update camera
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  // Update renderer
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

/**
 * Animation
 */
const clock = new THREE.Clock();
let lastTime = 0;

const tick = () => {
  const currentTime = clock.getElapsedTime();
  const deltaTime = currentTime - lastTime;
  lastTime = currentTime;

  // Update physics simulation every 0.5 seconds for smooth continuous animation
  if (currentTime - lastPhysicsUpdate >= 0.5) {
    simulation.step();
    simulationTime += simulation.dt;
    lastPhysicsUpdate = currentTime;
    
    // Update info panel every simulation step
    const distance = mars.position.magnitude() / 1.496e11; // Convert to AU
    const velocity = mars.velocity.magnitude() / 1000; // Convert to km/s
    const days = simulationTime / 86400; // Convert to days
    
    if (distanceElement) {
      distanceElement.textContent = distance.toFixed(3);
    }
    if (velocityElement) {
      velocityElement.textContent = velocity.toFixed(2);
    }
    if (simTimeElement) {
      simTimeElement.textContent = Math.floor(days).toLocaleString();
    }
  }

  // Update Three.js object positions based on physics simulation
  // Sun position (should stay at origin)
  sunMesh.position.set(
    sun.position.x * SCALE_FACTOR,
    sun.position.y * SCALE_FACTOR,
    0
  );

  // Earth position
  const earthX = earth.position.x * SCALE_FACTOR;
  const earthY = earth.position.y * SCALE_FACTOR;
  earthMesh.position.set(earthX, earthY, 0);

  // Mars position
  const marsX = mars.position.x * SCALE_FACTOR;
  const marsY = mars.position.y * SCALE_FACTOR;
  marsMesh.position.set(marsX, marsY, 0);

  // Update orbital trails every few frames
  trailUpdateCounter.count++;
  if (trailUpdateCounter.count % 5 === 0) {
    // Update Mars trail
    const marsPositions = marsTrailLine.geometry.attributes.position.array;
    marsPositions[marsTrailIndex * 3] = marsX;
    marsPositions[marsTrailIndex * 3 + 1] = marsY;
    marsPositions[marsTrailIndex * 3 + 2] = 0;
    marsTrailIndex = (marsTrailIndex + 1) % MAX_TRAIL_POINTS;
    marsTrailLine.geometry.attributes.position.needsUpdate = true;
    
    // Update Earth trail
    const earthPositions = earthTrailLine.geometry.attributes.position.array;
    earthPositions[earthTrailIndex * 3] = earthX;
    earthPositions[earthTrailIndex * 3 + 1] = earthY;
    earthPositions[earthTrailIndex * 3 + 2] = 0;
    earthTrailIndex = (earthTrailIndex + 1) % MAX_TRAIL_POINTS;
    earthTrailLine.geometry.attributes.position.needsUpdate = true;
  }

  // Update sun light position
  sunLight.position.copy(sunMesh.position);

  // Add rotation to all bodies for visual appeal
  sunMesh.rotation.y += deltaTime * 0.5;
  earthMesh.rotation.y += deltaTime * 1.5;
  marsMesh.rotation.y += deltaTime * 2.0;

  // Update camera controls
  orbit.update();

  // Render
  renderer.render(scene, camera);
  
  // Call tick again on the next frame
  window.requestAnimationFrame(tick);
};
tick();
