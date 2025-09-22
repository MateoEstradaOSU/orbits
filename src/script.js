import "./style.css";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import * as THREE from "three";

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
const marsMaterial = new THREE.MeshBasicMaterial({
  map: textureLoader.load(marsTexture),
});
const marsMesh = new THREE.Mesh(marsGeometry, marsMaterial);
const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sunMesh);
scene.add(marsMesh);

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
camera.position.z = 3;
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
const tick = () => {
  // Update objects
  const elapsedTime = clock.getElapsedTime();
  marsMesh.rotation.y = elapsedTime * 0.1;
  marsMesh.position.y = Math.sin(elapsedTime);
  marsMesh.position.x = 5 * Math.cos(elapsedTime);

  // Render
  renderer.render(scene, camera);
  // Call tick again on the next frame
  window.requestAnimationFrame(tick);
};
tick();
