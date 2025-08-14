import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const isMobile = window.innerWidth <= 768;

const planetDetails = {
    'About Me & Skills': { modelPath: 'assets/purple_planet.glb', color: '#8A2BE2', modelScale: 1.0 },
    'Projects': { modelPath: 'assets/green_planet.glb', color: '#00FF7F', modelScale: 1.0 },
    'Education & Experience': { modelPath: 'assets/blue_planet.glb', color: '#4169E1', modelScale: 1.0 },
    'Achievements': { modelPath: 'assets/red_planet.glb', color: '#FF4500', modelScale: 1.0 },
    'Contact': { modelPath: 'assets/brown_planet.glb', color: '#D2691E', modelScale: 1.0 }
};

const hoverSound = new Audio('assets/sounds/hover.wav');
const clickSound = new Audio('assets/sounds/click.wav');

hoverSound.volume = 0.4;
clickSound.volume = 0.8;

const pageTitle = document.querySelector('.content-header h1').textContent;
const currentPlanet = planetDetails[pageTitle];
const detailTooltip = document.getElementById('detail-tooltip');
const detailTooltipClose = document.getElementById('detail-tooltip-close');

const scene = new THREE.Scene();
const planetViewer = document.querySelector('.planet-viewer');
const camera = new THREE.PerspectiveCamera(50, planetViewer.clientWidth / planetViewer.clientHeight, 0.1, 1000);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById('planet-canvas-detail'),
    antialias: true,
    alpha: true
});
renderer.setSize(planetViewer.clientWidth, planetViewer.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.enableZoom = false;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.5;

scene.add(new THREE.AmbientLight(0xffffff, 0.7));
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
directionalLight.position.set(0, 0, 1);
camera.add(directionalLight);
scene.add(camera);

const backlight = new THREE.DirectionalLight(0xffffff, 2.0);
backlight.position.copy(camera.position).add(new THREE.Vector3(0, 0, -5));
backlight.target.position.set(0, 0, 0);
scene.add(backlight);
scene.add(backlight.target);

if (currentPlanet) {
    document.documentElement.style.setProperty('--planet-color', currentPlanet.color);
    if (currentPlanet.modelPath) {
        const gltfLoader = new GLTFLoader();
        gltfLoader.load(currentPlanet.modelPath, (gltf) => {
            const model = gltf.scene;
            const scale = currentPlanet.modelScale || 1.0;
            model.scale.set(scale, scale, scale); 
            scene.add(model);
        });
    }
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    backlight.position.copy(camera.position).add(new THREE.Vector3(0, 0, -5));
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = planetViewer.clientWidth / planetViewer.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(planetViewer.clientWidth, planetViewer.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

function showDetailTooltip() {
    setTimeout(() => {
        detailTooltip.classList.remove('hidden');
    }, 1500);
}

function hideDetailTooltip() {
    detailTooltip.classList.add('hidden');
}

function adaptDetailUIToDevice() {
    if (!isMobile) return;
    const tooltipList = document.querySelector('#detail-tooltip ul');
    if (tooltipList) {
        tooltipList.innerHTML = `<li><strong>Drag:</strong> One finger to rotate.</li>`;
    }
}

adaptDetailUIToDevice();
detailTooltipClose.addEventListener('click', hideDetailTooltip);

window.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() === 'h') {
        detailTooltip.classList.toggle('hidden');
    }
});

showDetailTooltip();

const interactables = document.querySelectorAll('a, button, .back-button, #detail-tooltip-close, .content-body img');
interactables.forEach(el => {
    el.addEventListener('mouseenter', () => {
        if (!isMobile) {
            hoverSound.currentTime = 0;
            hoverSound.play();
        }
    });

    el.addEventListener('click', (e) => {
        const tag = el.tagName.toLowerCase();
        const isNav = tag === 'a' && el.href;

        if (isNav) {
            e.preventDefault();
            clickSound.currentTime = 0;
            clickSound.playbackRate = 2.0;
            clickSound.play();
            clickSound.onended = () => { window.location.href = el.href; };
        } else {
            clickSound.currentTime = 0;
            clickSound.play();
        }
    });
});

const musicFrame = document.createElement('iframe');
musicFrame.src = 'music-player-sub.html';
musicFrame.style.display = 'none';
musicFrame.allow = 'autoplay';
document.body.appendChild(musicFrame);

function startMusic() {
    musicFrame.contentWindow.postMessage('play', '*');
}
window.addEventListener('click', startMusic, { once: true });
window.addEventListener('keydown', startMusic, { once: true });

