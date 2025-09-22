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
// Canvas
const canvas = document.querySelector("canvas.webgl");

// Scene
const scene = new THREE.Scene();

/**
 * Object
 */
const textureLoader = new THREE.TextureLoader();
const marsGeometry = new THREE.SphereGeometry(0.5, 64, 64);
const sunGeometry = new THREE.SphereGeometry(0.5, 64, 64);
const sunMaterial = new THREE.MeshBasicMaterial({
  map: textureLoader.load(sunTexture),
});
const marsMaterial = new THREE.MeshLambertMaterial({
  map: textureLoader.load(marsTexture),
});
const marsMesh = new THREE.Mesh(marsGeometry, marsMaterial);
const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);

// Scale the meshes for better visualization
sunMesh.scale.set(2, 2, 2);  // Make sun bigger
marsMesh.scale.set(0.8, 0.8, 0.8);  // Make mars smaller

scene.add(sunMesh);
scene.add(marsMesh);

// Create physics simulation
const sun = CelestialBodyPresets.createSun();

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
const simulation = new PhysicsSimulation([sun, mars]);
simulation.dt = 86400 * 10; // 10 days per step for faster orbit

// Scale factor for converting physics units to Three.js units
const SCALE_FACTOR = 1 / 1e11; // Convert meters to scene units

// Create orbital trail for Mars
const trailGeometry = new THREE.BufferGeometry();
const trailMaterial = new THREE.LineBasicMaterial({ color: 0xff4500, opacity: 0.6, transparent: true });
const trailPositions = [];
const MAX_TRAIL_POINTS = 200;

// Initialize trail positions
for (let i = 0; i < MAX_TRAIL_POINTS; i++) {
  trailPositions.push(0, 0, 0);
}
trailGeometry.setAttribute('position', new THREE.Float32BufferAttribute(trailPositions, 3));
const trailLine = new THREE.Line(trailGeometry, trailMaterial);
scene.add(trailLine);

// Trail tracking variables
let trailIndex = 0;
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

  // Mars position
  const marsX = mars.position.x * SCALE_FACTOR;
  const marsY = mars.position.y * SCALE_FACTOR;
  marsMesh.position.set(marsX, marsY, 0);

  // Update orbital trail every few frames
  trailUpdateCounter.count++;
  if (trailUpdateCounter.count % 5 === 0) {
    const positions = trailLine.geometry.attributes.position.array;
    positions[trailIndex * 3] = marsX;
    positions[trailIndex * 3 + 1] = marsY;
    positions[trailIndex * 3 + 2] = 0;
    
    trailIndex = (trailIndex + 1) % MAX_TRAIL_POINTS;
    trailLine.geometry.attributes.position.needsUpdate = true;
  }

  // Update sun light position
  sunLight.position.copy(sunMesh.position);

  // Add rotation to both bodies for visual appeal
  sunMesh.rotation.y += deltaTime * 0.5;
  marsMesh.rotation.y += deltaTime * 2.0;

  // Update camera controls
  orbit.update();

  // Render
  renderer.render(scene, camera);
  
  // Call tick again on the next frame
  window.requestAnimationFrame(tick);
};
tick();
