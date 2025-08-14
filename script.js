import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const isMobile = window.innerWidth <= 768;

const sunVertexShader = `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const sunFragmentShader = `varying vec2 vUv; uniform float u_time; float random (vec2 st) { return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123); } float noise (vec2 st) { vec2 i = floor(st); vec2 f = fract(st); float a = random(i); float b = random(i + vec2(1.0, 0.0)); float c = random(i + vec2(0.0, 1.0)); float d = random(i + vec2(1.0, 1.0)); vec2 u = f * f * (3.0 - 2.0 * f); return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y; } void main() { float time = u_time * 0.1; vec2 uv = vUv; float noise_val = noise(uv * 5.0 + time); vec3 color = vec3(1.0, 0.8, 0.2) * (0.8 + noise_val * 0.4); gl_FragColor = vec4(color, 1.0); }`;
const atmosphereVertexShader = `varying vec3 vNormal; void main() { vNormal = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const atmosphereFragmentShader = `varying vec3 vNormal; uniform vec3 u_color; void main() { float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0); gl_FragColor = vec4(u_color, 1.0) * intensity; }`;

const scene = new THREE.Scene();
const clock = new THREE.Clock();
const textureLoader = new THREE.TextureLoader();
const gltfLoader = new GLTFLoader();

let rocket = null;
const rocketHelper = new THREE.Box3Helper(new THREE.Box3(), 0xff0000);
let isRocketAnimating = false;
rocketHelper.visible = false;
scene.add(rocketHelper);

let rocketVelocity = new THREE.Vector3();
let rocketControlsEnabled = false;

window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

const rocketIcon = document.getElementById('rocket-icon');
const rocketToggle = document.getElementById('rocket-toggle');
const keys = {};

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
const defaultCameraPosition = { x: 0, y: 60, z: 0.1 };
camera.position.set(defaultCameraPosition.x, defaultCameraPosition.y, defaultCameraPosition.z);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('planet-canvas'), antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.minDistance = 5;
controls.maxDistance = 150;
if (isMobile) {
    controls.enablePan = true; 
    controls.panSpeed = 0.5;
    controls.touchDamping = 0.1;
}

const nav = document.querySelector('nav');
const navButtons = document.querySelectorAll('.nav-links button');
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const clickableObjects = [];
const infoBox = document.getElementById('info-box');
const readMoreBtn = document.getElementById('read-more-btn');
const controlsTooltip = document.getElementById('controls-tooltip');
const tooltipCloseBtn = document.getElementById('tooltip-close');
const rocketTutorialPanel = document.getElementById('rocket-tutorial');
const rocketTutorialCloseBtn = document.getElementById('rocket-tutorial-close');

const tutorialOverlay = document.getElementById('tutorial-overlay');
const tutorialQuitBtn = document.getElementById('tutorial-quit-btn');

scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const directionalLight = new THREE.DirectionalLight(0xffffff, 2.0);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);
const sun = new THREE.Mesh(new THREE.SphereGeometry(3.5, 64, 64), new THREE.ShaderMaterial({ uniforms: { u_time: { value: 0.0 } }, vertexShader: sunVertexShader, fragmentShader: sunFragmentShader }));
scene.add(sun);

const planetData = [
    { modelPath: 'assets/purple_planet.glb', orbitRadius: 10, atmosphereColor: '#8A2BE2', rotationSpeed: 0.0022, name: 'About Me & Skills', info: 'A computer engineering student with a strong foundation in many different languages, dedicated to giving technical solutions life.', detailPage: 'about.html', modelScale: 1.0 },
    { modelPath: 'assets/green_planet.glb', orbitRadius: 16, atmosphereColor: '#00FF7F', rotationSpeed: 0.0018, name: 'Projects', info: 'A collection of projects demonstrating proficiency in various software development skills, from web development to robotics.', detailPage: 'projects.html', modelScale: 1.0 },
    { modelPath: 'assets/blue_planet.glb', orbitRadius: 22, atmosphereColor: '#4169E1', rotationSpeed: 0.0030, name: 'Experience & Education', info: 'Software Engineering student with over 2 years of experience in developing solutions across the full software stack', detailPage: 'resume.html', modelScale: 1.0 },
    { modelPath: 'assets/red_planet.glb', orbitRadius: 29, atmosphereColor: '#FF4500', rotationSpeed: 0.0015, name: 'Achievements', info: 'A showcase of key achievements, including two U.S. patents for innovative tech solutions.', detailPage: 'achievements.html', modelScale: 1.0 },
    { modelPath: 'assets/brown_planet.glb', orbitRadius: 36, atmosphereColor: '#D2691E', rotationSpeed: 0.0012, name: 'Contact', info: 'Details on how to reach out via email, LinkedIn, or to view my work on GitHub.', detailPage: 'contact.html', modelScale: 1.0 }
];

const planetGroups = [];
planetData.forEach(data => {
    const planetGroup = new THREE.Group();
    const orbit = new THREE.Mesh(new THREE.TorusGeometry(data.orbitRadius, 0.02, 16, 100), new THREE.MeshBasicMaterial({ color: 0xaaaaaa, transparent: true, opacity: 0.3 }));
    orbit.rotation.x = Math.PI / 2;
    scene.add(planetGroup, orbit);

    gltfLoader.load(data.modelPath, (gltf) => {
        const model = gltf.scene;
        const scale = data.modelScale || 1.0;
        model.scale.set(scale, scale, scale);
        
        model.position.x = data.orbitRadius;
        
        let planetMesh;
        model.traverse((child) => { if (child.isMesh && !planetMesh) planetMesh = child; });

        const clickableTarget = planetMesh || model;
        clickableTarget.userData = { name: data.name, info: data.info, color: data.atmosphereColor, detailPage: data.detailPage, isPlanet: true };
        clickableObjects.push(clickableTarget);
        
        const atmosphere = new THREE.Mesh( new THREE.SphereGeometry(1, 32, 32), new THREE.ShaderMaterial({ vertexShader: atmosphereVertexShader, fragmentShader: atmosphereFragmentShader, blending: THREE.AdditiveBlending, side: THREE.BackSide, uniforms: { u_color: { value: new THREE.Color(data.atmosphereColor) } } }) );
        atmosphere.scale.set(1.15, 1.15, 1.15);
        model.add(atmosphere);

        planetGroup.add(model);
        planetGroups.push({ group: planetGroup, planet: model, speed: data.rotationSpeed });
    });
});

let stars, originalStarColors;
generateStars();
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 2.0, 0.5, 0.0);
composer.addPass(bloomPass);

if (rocketTutorialCloseBtn) {
    rocketTutorialCloseBtn.addEventListener('click', () => {
        rocketTutorialPanel.classList.add('hidden');
    });
}

let focusedPlanet = null;
function focusOnPlanet(planet) {
    if (!planet) return;
    const previouslyFocused = focusedPlanet;
    focusedPlanet = planet;
    
    if (!previouslyFocused) { controls.enabled = false; }

    const targetPosition = new THREE.Vector3();
    planet.getWorldPosition(targetPosition);
    
    const boundingSphere = new THREE.Box3().setFromObject(planet).getBoundingSphere(new THREE.Sphere());
    const planetRadius = boundingSphere.radius;

    const offsetMultiplier = isMobile ? 8 : 5;
    const desiredPosition = new THREE.Vector3(targetPosition.x - (planetRadius * offsetMultiplier), targetPosition.y + (planetRadius * 2), targetPosition.z);

    gsap.to(camera.position, { duration: 1.5, x: desiredPosition.x, y: desiredPosition.y, z: desiredPosition.z, ease: 'power2.inOut' });
    gsap.to(controls.target, { duration: 1.5, x: targetPosition.x, y: targetPosition.y, z: targetPosition.z, ease: 'power2.inOut' });

    if (!isMobile) {
        const screenPosition = targetPosition.clone().project(camera);
        if (screenPosition.x < -0.2) { infoBox.classList.add('position-right'); infoBox.classList.remove('position-left'); } 
        else { infoBox.classList.add('position-left'); infoBox.classList.remove('position-right'); }
    }

    document.getElementById('info-title').innerText = planet.userData.name;
    document.getElementById('info-content').innerText = planet.userData.info;
    infoBox.style.setProperty('--planet-color', planet.userData.color);
    
    if (planet.userData.detailPage && planet.userData.detailPage !== '#') {
        readMoreBtn.href = planet.userData.detailPage;
        readMoreBtn.style.display = 'inline-block';
    } else {
        readMoreBtn.style.display = 'none';
    }
    
    infoBox.classList.remove('hidden');
    updateNavActiveState(planet.userData.name, planet.userData.color);
    hideTooltip();
    hideTutorial();
}

function resetCameraView() {
    focusedPlanet = null;
    controls.enabled = true;
    gsap.to(camera.position, { duration: 1.5, x: defaultCameraPosition.x, y: defaultCameraPosition.y, z: defaultCameraPosition.z, ease: 'power2.inOut' });
    gsap.to(controls.target, { duration: 1.5, x: 0, y: 0, z: 0, ease: 'power2.inOut' });
    infoBox.classList.add('hidden');
    updateNavActiveState(null, '#ffffff');
}

function updateNavActiveState(activePlanetName, activeColor) {
    nav.style.setProperty('--planet-color', activeColor);
    navButtons.forEach(button => {
        button.classList.toggle('is-active', button.dataset.planetName === activePlanetName);
    });
}

function animate() {
    requestAnimationFrame(animate);
    const elapsedTime = clock.getElapsedTime();
    sun.material.uniforms.u_time.value = elapsedTime;
    
    planetGroups.forEach(p => {
        p.group.rotation.y += p.speed;
        p.planet.rotation.y += 0.005;
    });
    
    if (focusedPlanet) {
        const targetPosition = new THREE.Vector3();
        focusedPlanet.getWorldPosition(targetPosition);
        const boundingSphere = new THREE.Box3().setFromObject(focusedPlanet).getBoundingSphere(new THREE.Sphere());
        const planetRadius = boundingSphere.radius;
        const offsetMultiplier = isMobile ? 8 : 5;
        const desiredPosition = new THREE.Vector3(targetPosition.x - (planetRadius * offsetMultiplier), targetPosition.y + (planetRadius * 2), targetPosition.z);
        camera.position.lerp(desiredPosition, 0.04);
        controls.target.lerp(targetPosition, 0.04);
    }

    controls.update();
    composer.render();

    if (stars) {
        const colorAttribute = stars.geometry.attributes.color;
        for (let i = 0; i < 10; i++) { const starIndex = Math.floor(Math.random() * colorAttribute.count); const pulse = Math.sin(elapsedTime * 2 + starIndex) * 0.5 + 0.5; colorAttribute.setX(starIndex, originalStarColors[starIndex * 3] * pulse); colorAttribute.setY(starIndex, originalStarColors[starIndex * 3 + 1] * pulse); colorAttribute.setZ(starIndex, originalStarColors[starIndex * 3 + 2] * pulse); }
        colorAttribute.needsUpdate = true;
    }

    if (rocket && rocketControlsEnabled) {
        const rotationSpeed = 0.03;
        const maxSpeed = 0.5;
        const accelerationRate = 0.006;
        const decelerationRate = 0.005;

        if (keys['w']) rocketVelocity.z = Math.max(rocketVelocity.z - accelerationRate, -maxSpeed);
        else if (keys['s']) rocketVelocity.z = Math.min(rocketVelocity.z + accelerationRate, maxSpeed);
        else {
            if (rocketVelocity.z > 0) rocketVelocity.z = Math.max(rocketVelocity.z - decelerationRate, 0);
            else if (rocketVelocity.z < 0) rocketVelocity.z = Math.min(rocketVelocity.z + decelerationRate, 0);
        }

        if (keys['a']) rocket.rotation.y += rotationSpeed;
        if (keys['d']) rocket.rotation.y -= rotationSpeed;

        rocket.translateZ(rocketVelocity.z);

        if (rocket.userData.flameParticles) {
            const { positions, lifetimes, geometry, material } = rocket.userData.flameParticles;
            const speedFactor = Math.abs(rocketVelocity.z) / maxSpeed;
            material.visible = speedFactor > 0.01;
            for (let i = 0; i < positions.length / 3; i++) {
                lifetimes[i] -= (0.015 + speedFactor * 0.03);
                if (lifetimes[i] <= 0) {
                    if (rocketVelocity.z < 0 && Math.random() < speedFactor) {
                        positions[i * 3 + 0] = (Math.random() - 0.5) * 0.08;
                        positions[i * 3 + 1] = (Math.random() - 0.5) * 0.08;
                        positions[i * 3 + 2] = 0.01;
                        lifetimes[i] = Math.random();
                    } else {
                        positions[i * 3 + 2] = -1000;
                    }
                } else {
                    positions[i * 3 + 2] += (speedFactor * 0.05);
                }
            }
            geometry.attributes.position.needsUpdate = true;
        }
    }

    if (rocket && rocket.userData.hitboxMesh) {
        if (rocketHelper.visible) rocketHelper.box.setFromObject(rocket.userData.hitboxMesh);
        for (const { planet } of planetGroups) {
            const rocketBox = new THREE.Box3().setFromObject(rocket.userData.hitboxMesh);
            const planetBox = new THREE.Box3().setFromObject(planet);
            if (rocketBox.intersectsBox(planetBox)) {
                triggerRocketExplosion(rocket.position);
                removeRocket(false);
                break;
            }
        }
    }
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    composer.setSize(window.innerWidth, window.innerHeight);
});

window.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() === 'r') resetCameraView();
    if (event.key.toLowerCase() === 'h') controlsTooltip.classList.toggle('hidden');
    if (event.key.toLowerCase() === 't') showTutorial();
});

let touchStartTime = 0;
let touchStartX = 0;
let touchStartY = 0;

function handleInteraction(clientX, clientY) {
    if (infoBox && !infoBox.classList.contains('hidden')) {
        const rect = infoBox.getBoundingClientRect();
        if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
            return;
        }
    }
    if (nav) {
        const navLinks = nav.querySelector('.nav-links');
        if (navLinks) {
            const rect = navLinks.getBoundingClientRect();
             if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
                return;
            }
        }
    }

    pointer.x = (clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(clientY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(clickableObjects, true);

    if (intersects.length > 0) {
        let clickedObject = intersects[0].object;
        while(clickedObject.parent && !clickedObject.userData.isPlanet) {
            clickedObject = clickedObject.parent;
        }
        if (clickedObject.userData.isPlanet) {
             focusOnPlanet(clickedObject);
        }
    }
}

window.addEventListener('click', (event) => {
    if (event.target.closest('.nav-links button')) return;
    handleInteraction(event.clientX, event.clientY);
});

renderer.domElement.addEventListener('touchstart', (event) => {
    touchStartTime = Date.now();
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
}, { passive: true });

renderer.domElement.addEventListener('touchend', (event) => {
    const touchEndX = event.changedTouches[0].clientX;
    const touchEndY = event.changedTouches[0].clientY;

    const deltaX = Math.abs(touchEndX - touchStartX);
    const deltaY = Math.abs(touchEndY - touchStartY);
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (Date.now() - touchStartTime < 250 && distance < 10) {
        handleInteraction(touchEndX, touchEndY);
    }
});


document.getElementById('info-close').addEventListener('click', resetCameraView);
navButtons.forEach(button => button.addEventListener('click', () => { const planetName = button.dataset.planetName; const targetPlanet = clickableObjects.find(p => p.userData.name === planetName); focusOnPlanet(targetPlanet); }));
window.addEventListener('mousemove', (event) => { if (isMobile) return; pointer.x = (event.clientX / window.innerWidth) * 2 - 1; pointer.y = -(event.clientY / window.innerHeight) * 2 + 1; raycaster.setFromCamera(pointer, camera); const intersects = raycaster.intersectObjects(clickableObjects, true); document.body.style.cursor = (intersects.length > 0) ? 'pointer' : 'default'; });

function showTooltip() { setTimeout(() => controlsTooltip.classList.remove('hidden'), 100); }
function hideTooltip() { controlsTooltip.classList.add('hidden'); }
tooltipCloseBtn.addEventListener('click', hideTooltip);
showTooltip();

function showTutorial() { tutorialOverlay.classList.remove('hidden'); gsap.fromTo(tutorialOverlay, { opacity: 0 }, { opacity: 1, duration: 0.5 }); }
function hideTutorial() { gsap.to(tutorialOverlay, { opacity: 0, duration: 0.5, onComplete: () => tutorialOverlay.classList.add('hidden')}); }

function adaptUIToDevice() {
    const controlsList = document.querySelector('#controls-tooltip ul');
    const tutorialPanel = document.getElementById('tutorial-panel');

    if (isMobile) {
        if (controlsList) {
            controlsList.innerHTML = `
                <li><strong>Rotate:</strong> One Finger Drag</li>
                <li><strong>Pan:</strong> Two Finger Drag</li>
                <li><strong>Zoom:</strong> Pinch In/Out</li>
            `;
        }
        if (tutorialPanel) {
            tutorialPanel.querySelector('p').innerHTML = "I'm Adam Mhal, and this is my interactive portfolio. Think of it as a solar system of my work. Here's a quick guide for your mobile device:";
            tutorialPanel.querySelector('ol').innerHTML = `
                <li><span>1.</span> Explore by dragging with one finger to rotate, two to pan, and pinching to zoom.</li>
                <li><span>2.</span> Tap on any planet (or use the top navigation) to learn more about a section.</li>
            `;
             tutorialPanel.querySelector('.tutorial-footer').style.display = 'none';
        }
    } else {
        if (controlsList) {
            controlsList.innerHTML = `
                <li><strong>Drag:</strong> Left-Click + Move</li>
                <li><strong>Pan:</strong> Right-Click + Move</li>
                <li><strong>Zoom:</strong> Scroll Wheel</li>
                <li><strong>Reset View:</strong> 'R' Key</li>
                <li><strong>Toggle Help:</strong> 'H' Key</li>
                <li><strong>Show Tutorial:</strong> 'T' Key</li>
            `;
        }
        if (tutorialPanel) {
            tutorialPanel.querySelector('p').innerHTML = "I'm Adam Mhal, and this is my interactive portfolio. Think of it as a solar system of my work. Here's a quick guide to get you started:";
            tutorialPanel.querySelector('ol').innerHTML = `
                <li><span>1.</span> Explore the system by dragging, panning, and zooming.</li>
                <li><span>2.</span> Click on any planet (or use the top navigation) to learn more about a section.</li>
                <li><span>3.</span> Press 'R' at any time to return to this main view.</li>
                <li><span>4.</span> If you're bored, try pressing the rocket button in the bottom right!</li>
            `;
            tutorialPanel.querySelector('.tutorial-footer').style.display = 'block';
        }
    }
}

function initTutorial() { if (!localStorage.getItem('tutorialShown')) setTimeout(showTutorial, 1000); }
tutorialQuitBtn.addEventListener('click', () => { hideTutorial(); localStorage.setItem('tutorialShown', 'true'); });

adaptUIToDevice();
initTutorial();

function generateStars() {
    const starTexture = textureLoader.load('assets/star.png');
    const starsGeometry = new THREE.BufferGeometry();
    const starCount = 1500;
    const positions = [], colors = [];
    const starRadius = 200;
    for (let i = 0; i < starCount; i++) {
        const theta = 2 * Math.PI * Math.random(), phi = Math.acos(2 * Math.random() - 1), r = starRadius * Math.cbrt(Math.random());
        positions.push(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi));
        const color = new THREE.Color();
        color.setHSL(Math.random() * 0.2 + 0.5, 0.8, Math.random() * 0.5 + 0.5);
        colors.push(color.r, color.g, color.b);
    }
    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    starsGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    originalStarColors = [...colors];
    const starMaterial = new THREE.PointsMaterial({ map: starTexture, size: 0.5, sizeAttenuation: true, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, vertexColors: true });
    stars = new THREE.Points(starsGeometry, starMaterial);
    scene.add(stars);
}

const musicFrame = document.createElement('iframe');
musicFrame.src = 'music-player-main.html';
musicFrame.style.display = 'none';
musicFrame.allow = 'autoplay';
document.body.appendChild(musicFrame);
function startMusic() { musicFrame.contentWindow.postMessage('play', '*'); }
window.addEventListener('click', startMusic, { once: true });
window.addEventListener('keydown', startMusic, { once: true });

const hoverSound = new Audio('assets/sounds/hover.wav'), clickSound = new Audio('assets/sounds/click.wav');
hoverSound.volume = 0.2;
clickSound.volume = 0.3;
clickSound.playbackRate = 2.0;
const interactables = document.querySelectorAll('a, button, .nav-links button, #info-close');
interactables.forEach(el => {
    el.addEventListener('mouseenter', () => { if (!isMobile) { hoverSound.currentTime = 0; hoverSound.play(); } });
    el.addEventListener('click', (e) => {
        const isLink = el.tagName.toLowerCase() === 'a' && el.href;
        if (isLink) { e.preventDefault(); clickSound.currentTime = 0; clickSound.play(); clickSound.onended = () => window.location.href = el.href; }
        else { clickSound.currentTime = 0; clickSound.play(); }
    });
});

if (rocketToggle) {
    rocketToggle.addEventListener('click', () => { if (isRocketAnimating) return; if (rocket) removeRocket(true); else spawnRocket(); });
}

function removeRocket(isAnimated) {
    if (!rocket || isRocketAnimating) return;
    isRocketAnimating = true;
    rocketControlsEnabled = false;
    rocketIcon.src = 'assets/icons/rocket-filled.svg';
    rocketIcon.style.transform = 'scale(1.3)';
    setTimeout(() => rocketIcon.style.transform = 'scale(1)', 250);
    rocketVelocity.set(0, 0, 0);
    if (isAnimated) {
        gsap.to(rocket.scale, { duration: 0.7, x: 0, y: 0, z: 0, ease: 'power2.in', onComplete: () => { rocketHelper.visible = false; scene.remove(rocket); rocket = null; isRocketAnimating = false; } });
    } else {
        rocketHelper.visible = false;
        scene.remove(rocket);
        rocket = null;
        isRocketAnimating = false;
    }
}

function spawnRocket() {
  isRocketAnimating = true;
  gltfLoader.load('assets/rocket.glb', (gltf) => {
    rocket = gltf.scene;
    const finalScale = 15;
    rocket.position.set(50, 0, 0);
    rocket.rotation.y = Math.PI / 2;
    scene.add(rocket);
    if (!localStorage.getItem('rocketTutorialShown')) { setTimeout(() => { rocketTutorialPanel.classList.remove('hidden'); localStorage.setItem('rocketTutorialShown', 'true'); }, 1000); }
    gsap.to(rocket.scale, { duration: 1.0, x: finalScale, y: finalScale, z: finalScale, ease: 'back.out(1.7)', onComplete: () => isRocketAnimating = false });
    const hitboxMesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.2), new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true }));
    hitboxMesh.visible = false;
    rocket.add(hitboxMesh);
    rocket.userData.hitboxMesh = hitboxMesh;
    rocketControlsEnabled = true;
    rocketIcon.src = 'assets/icons/rocket-hollow.svg';
    rocketIcon.style.transform = 'scale(1.3)';
    setTimeout(() => rocketIcon.style.transform = 'scale(1)', 250);
    const flameTexture = textureLoader.load('assets/flame.png');
    const particleCount = 100, particleGeometry = new THREE.BufferGeometry(), positions = new Float32Array(particleCount * 3), lifetimes = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) { positions[i * 3] = 0; positions[i * 3 + 1] = 0; positions[i * 3 + 2] = 0; lifetimes[i] = Math.random(); }
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMaterial = new THREE.PointsMaterial({ size: 1.6, map: flameTexture, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xff6600 });
    const flameParticles = new THREE.Points(particleGeometry, particleMaterial);
    flameParticles.frustumCulled = false;
    rocket.add(flameParticles);
    rocket.userData.flameParticles = { geometry: particleGeometry, material: particleMaterial, positions, lifetimes };
  });
}

function triggerRocketExplosion(position) {
    const explosionMaterial = new THREE.ShaderMaterial({ uniforms: { u_time: { value: 0.0 }, u_color: { value: new THREE.Color(0xffa500) } }, vertexShader: `uniform float u_time; varying vec2 vUv; void main() { vUv = uv; vec3 displaced = position + normalize(position) * u_time * 2.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0); }`, fragmentShader: `uniform float u_time; uniform vec3 u_color; varying vec2 vUv; void main() { float dist = distance(vUv, vec2(0.5)); float core = smoothstep(0.5, 0.0, dist); vec3 hotColor = vec3(1.0, 1.0, 0.8); vec3 finalColor = mix(u_color, hotColor, core); float opacity = 1.0 - u_time; gl_FragColor = vec4(finalColor, opacity); }`, transparent: true, depthWrite: false });
    const explosionGeometry = new THREE.IcosahedronGeometry(1, 4);
    const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial);
    explosion.position.copy(position);
    explosion.scale.set(0, 0, 0);
    scene.add(explosion);
    gsap.to(explosion.scale, { duration: 0.7, x: 15, y: 15, z: 15, ease: 'power2.out' });
    gsap.to(explosion.material.uniforms.u_time, { duration: 0.7, value: 1.0, ease: 'power2.out', onComplete: () => { scene.remove(explosion); explosionGeometry.dispose(); explosionMaterial.dispose(); } });
}
