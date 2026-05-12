
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// -----------------------------
// SCENE
// -----------------------------

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050816);

// -----------------------------
// CAMERA
// -----------------------------

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

camera.position.set(0, 0, 5);

// -----------------------------
// RENDERER
// -----------------------------

const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// -----------------------------
// BACKGROUND IMAGE
// -----------------------------

const textureLoader = new THREE.TextureLoader();

let backgroundMesh = null;

const backgroundDistance = 20;

function resizeBackground() {
    if (!backgroundMesh) return;

    const texture = backgroundMesh.material.map;

    const imageAspect = texture.image.width / texture.image.height;
    const screenAspect = window.innerWidth / window.innerHeight;

    const visibleHeight =
    2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * backgroundDistance;

    const visibleWidth = visibleHeight * camera.aspect;

    let planeWidth;
    let planeHeight;

    if (screenAspect > imageAspect) {
    planeWidth = visibleWidth;
    planeHeight = visibleWidth / imageAspect;
    } else {
    planeHeight = visibleHeight;
    planeWidth = visibleHeight * imageAspect;
    }

    backgroundMesh.geometry.dispose();
    backgroundMesh.geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
}

// -----------------------------
// LIGHTS
// -----------------------------
const accentLight = new THREE.PointLight(0xffffff, 30, 10, 2);
accentLight.position.set(-2.8, 1.5, 2.8);
scene.add(accentLight);

const violetLight = new THREE.PointLight(0xa66cff, 90, 10, 2);
violetLight.position.set(2.8, -1.2, 2.6);
scene.add(violetLight);

// -----------------------------
// LOAD EYEBALL MODEL
// -----------------------------

const loader = new GLTFLoader();

let eyeball = null;
let mixer = null;

const normalScale = 1;
const eyePivot = new THREE.Group();
scene.add(eyePivot);

loader.load(
    './models/fog_eye.glb',

    function (gltf) {
    eyeball = gltf.scene;

    eyeball.position.set(0, 0, 0);
    eyeball.scale.set(normalScale, normalScale, normalScale);

    eyePivot.add(eyeball);

    console.log('Eyeball loaded:', eyeball);
    console.log('Animations found:', gltf.animations);

    if (gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(eyeball);

        gltf.animations.forEach(function (clip) {
        const blinkOnlyClip = clip.clone();

        blinkOnlyClip.tracks = blinkOnlyClip.tracks.filter(function (track) {
            const isTransformTrack =
            track.name.includes('.position') ||
            track.name.includes('.rotation') ||
            track.name.includes('.quaternion') ||
            track.name.includes('.scale');

            return !isTransformTrack;
        });

        if (blinkOnlyClip.tracks.length > 0) {
            const action = mixer.clipAction(blinkOnlyClip);
            action.play();
        }
        });
    }
    },

    function (xhr) {
    if (xhr.total > 0) {
        console.log((xhr.loaded / xhr.total * 100).toFixed(1) + '% loaded');
    }
    },

    function (error) {
    console.error('Error loading eyeball:', error);
    }
);

// -----------------------------
// MOUSE TRACKING
// -----------------------------

const mouse = new THREE.Vector2();
const target = new THREE.Vector3();

window.addEventListener('mousemove', function (event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

// -----------------------------
// CLICK / DODGE BEHAVIOR
// -----------------------------

const raycaster = new THREE.Raycaster();

let isDodging = false;
let dodgeStartTime = 0;

const dodgeDuration = 0.45;

const basePosition = new THREE.Vector3(0, 0, 0);
const startPosition = new THREE.Vector3();
const endPosition = new THREE.Vector3();

function getVisibleBoundsAtZ(z = 0) {
    const distance = camera.position.z - z;

    const height =
    2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * distance;

    const width = height * camera.aspect;

    return {
    minX: -width / 2,
    maxX: width / 2,
    minY: -height / 2,
    maxY: height / 2
    };
}

function getResponsiveX() {
    return window.innerWidth < 980 ? 0 : 1.15;
}

function getResponsiveY() {
    return window.innerWidth < 980 ? -0.45 : -0.1;
}

function clampEyeBasePosition(position) {
    const bounds = getVisibleBoundsAtZ(0);

    const margin = 0.9;

    const responsiveX = getResponsiveX();
    const responsiveY = getResponsiveY();

    position.x = THREE.MathUtils.clamp(
    position.x,
    bounds.minX + margin - responsiveX,
    bounds.maxX - margin - responsiveX
    );

    position.y = THREE.MathUtils.clamp(
    position.y,
    bounds.minY + margin - responsiveY,
    bounds.maxY - margin - responsiveY
    );

    position.z = 0;

    return position;
}

function getRandomEyePosition() {
    const bounds = getVisibleBoundsAtZ(0);

    const margin = 0.9;

    const responsiveX = getResponsiveX();
    const responsiveY = getResponsiveY();

    const x = THREE.MathUtils.randFloat(
    bounds.minX + margin - responsiveX,
    bounds.maxX - margin - responsiveX
    );

    const y = THREE.MathUtils.randFloat(
    bounds.minY + margin - responsiveY,
    bounds.maxY - margin - responsiveY
    );

    return new THREE.Vector3(x, y, 0);
}

window.addEventListener('click', function (event) {
    if (!eyeball) return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObject(eyeball, true);

    if (intersects.length > 0) {
    isDodging = true;

    dodgeStartTime = clock.getElapsedTime();

    startPosition.copy(basePosition);
    endPosition.copy(getRandomEyePosition());
    }
});

// -----------------------------
// SCROLL EFFECT
// -----------------------------

let scrollProgress = 0;

window.addEventListener('scroll', function () {
    const maxScroll = document.body.scrollHeight - window.innerHeight;
    scrollProgress = maxScroll > 0 ? window.scrollY / maxScroll : 0;
});

// -----------------------------
// ANIMATION LOOP
// -----------------------------

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const time = clock.getElapsedTime();

    if (mixer) {
    mixer.update(delta);
    }

    if (backgroundMesh) {
    backgroundMesh.position.copy(camera.position);
    backgroundMesh.position.z -= backgroundDistance;
    }

    if (eyeball) {
    const responsiveX = getResponsiveX();
    const responsiveY = getResponsiveY();

    const floatingOffset = Math.sin(time * 1.5) * 0.12;

    if (isDodging) {
        const elapsed = time - dodgeStartTime;
        const progress = Math.min(elapsed / dodgeDuration, 1);
        const easedProgress = 1 - Math.pow(1 - progress, 3);

        basePosition.lerpVectors(
        startPosition,
        endPosition,
        easedProgress
        );

        clampEyeBasePosition(basePosition);

        if (progress >= 1) {
        isDodging = false;
        basePosition.copy(clampEyeBasePosition(endPosition));
        }
    }

    const finalX = responsiveX + basePosition.x;
    const finalY =
        responsiveY + basePosition.y + floatingOffset - scrollProgress * 0.4;

    const bounds = getVisibleBoundsAtZ(0);

    const margin = 0.9;

    eyePivot.position.set(
        THREE.MathUtils.clamp(
        finalX,
        bounds.minX + margin,
        bounds.maxX - margin
        ),
        THREE.MathUtils.clamp(
        finalY,
        bounds.minY + margin,
        bounds.maxY - margin
        ),
        basePosition.z
    );

    target.set(
        mouse.x * 3,
        mouse.y * 2,
        2
    );

    eyePivot.lookAt(target);
    }

    renderer.render(scene, camera);
}

animate();

// -----------------------------
// RESIZE
// -----------------------------

window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    resizeBackground();
    clampEyeBasePosition(basePosition);
});
