# Interactive 3D Portfolio

![Portfolio Screenshot](assets/images/new-portfolio.jpg)

This repository contains the code for my personal portfolio website, designed as an interactive 3D solar system. The site showcases my skills and projects in a dynamic and engaging way, built from the ground up using modern web technologies.

**Live Site:** [adammhal.github.io](https://adammhal.github.io)

---

## Tech Stack

* **3D Rendering:** [Three.js](https://threejs.org/) (WebGL)
* **Animation:** [GSAP (GreenSock Animation Platform)](https://greensock.com/gsap/)
* **Shading:** Custom GLSL shaders
* **Core:** JavaScript, HTML5, CSS3

---

## Features

* **Interactive Solar System:** A fully interactive 3D scene where each planet represents a different section of the portfolio.
* **Custom Shaders:** The sun's fiery, animated surface is rendered using custom GLSL vertex and fragment shaders.
* **Post-Processing Effects:** Unreal Bloom pass is used to create a glowing effect for the sun and planetary atmospheres.
* **3D Models:** Planets are loaded as `.glb` models, allowing for detailed and unique geometry for each celestial body.
* **Dynamic Camera:** GSAP is used to create smooth, cinematic camera transitions when focusing on different planets.
* **Responsive Design:** The layout and controls adapt gracefully for both desktop and mobile devices.
* **Easter Egg:** A hidden rocket flight simulator mode, complete with particle effects and collision detection.

---

## How It Works

The main `script.js` file initializes a Three.js scene. It programmatically generates the starfield and the orbits for each planet. The planets themselves are loaded from GLTF files and positioned in orbit around a central sun, which is rendered with a custom shader material to create a dynamic, lava-like effect.

User interaction is handled via a raycaster to detect clicks on planets, triggering GSAP animations to move the camera smoothly to a focused view. The UI, including the navigation and info boxes, is dynamically updated based on the selected planet.

---

## Running Locally

1. Clone the repository:

    ```bash
    git clone [https://github.com/adammhal/adammhal.github.io.git](https://github.com/adammhal/adammhal.github.io.git)
    ```

2. Navigate to the project directory:

    ```bash
    cd adammhal.github.io
    ```

3. Since the project uses ES6 modules, you'll need to run it from a local server to avoid CORS issues. You can use the Live Server extension in VS Code or run a simple Python server:

    ```bash
    python -m http.server
    ```

4. Open your browser and navigate to `http://localhost:8000`.
