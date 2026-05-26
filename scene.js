let scene, camera, renderer, particles;
let speedMultiplier = 1.0;
let particleDirection = 'bottom';
let particleStyle = 'linear';
let time = 0;

function createCircularGlowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
    grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.3)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);
    
    return new THREE.CanvasTexture(canvas);
}

export function init3DScene() {
    const canvas = document.getElementById('webgl-canvas');
    
    // Scene setup
    scene = new THREE.Scene();

    // Camera setup
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 15;

    // Renderer setup
    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Subtle ambient dust particles
    const particleGeo = new THREE.BufferGeometry();
    const particleCount = 500; // Maximum particle buffer size
    
    const posArray = new Float32Array(particleCount * 3);
    for(let i = 0; i < particleCount * 3; i++) {
        posArray[i] = (Math.random() - 0.5) * 15; // Spread
    }
    
    particleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    
    // Create glowing firefly material
    const particleMaterial = new THREE.PointsMaterial({
        size: 0.22, // Larger size for smooth glowing appearance
        map: createCircularGlowTexture(),
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending, // Makes them glow when overlapping
        depthWrite: false
    });
    
    particles = new THREE.Points(particleGeo, particleMaterial);
    scene.add(particles);

    // Animation Loop
    function animate() {
        requestAnimationFrame(animate);
        time += 0.01 * speedMultiplier;
        
        if (particles.visible && speedMultiplier > 0) {
            const positions = particles.geometry.attributes.position.array;
            for (let i = 0; i < particleCount; i++) {
                let ix = i * 3;
                let iy = i * 3 + 1;
                let iz = i * 3 + 2;
                
                let speed = 0.01 * speedMultiplier;
                
                // Direction Logic
                if (particleDirection === 'bottom') {
                    positions[iy] += speed;
                    if (positions[iy] > 15) positions[iy] = -15;
                } else if (particleDirection === 'top') {
                    positions[iy] -= speed;
                    if (positions[iy] < -15) positions[iy] = 15;
                } else if (particleDirection === 'left') {
                    positions[ix] += speed;
                    if (positions[ix] > 15) positions[ix] = -15;
                } else if (particleDirection === 'right') {
                    positions[ix] -= speed;
                    if (positions[ix] < -15) positions[ix] = 15;
                } else if (particleDirection === 'center') {
                    // Expand outwards from center slightly (simple approximation)
                    positions[ix] += Math.sign(positions[ix]) * speed * 0.5;
                    positions[iy] += Math.sign(positions[iy]) * speed * 0.5;
                    
                    if (Math.abs(positions[ix]) > 15 || Math.abs(positions[iy]) > 15) {
                        positions[ix] = (Math.random() - 0.5) * 2;
                        positions[iy] = (Math.random() - 0.5) * 2;
                    }
                }
                
                // Style Logic (add sway or jitter)
                if (particleStyle === 'wavy') {
                    if (particleDirection === 'bottom' || particleDirection === 'top') {
                        positions[ix] += Math.sin(time + i) * 0.02 * speedMultiplier;
                    } else if (particleDirection === 'left' || particleDirection === 'right') {
                        positions[iy] += Math.cos(time + i) * 0.02 * speedMultiplier;
                    }
                } else if (particleStyle === 'chaotic') {
                    positions[ix] += (Math.random() - 0.5) * 0.05 * speedMultiplier;
                    positions[iy] += (Math.random() - 0.5) * 0.05 * speedMultiplier;
                }
            }
            particles.geometry.attributes.position.needsUpdate = true;
        }

        renderer.render(scene, camera);
    }
    
    animate();

    // Handle Resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

// Animation triggers for the app
export function triggerInteractionAnimation() {
    // Subtle swoop in dust when interacting
    gsap.to(particles.rotation, {
        y: particles.rotation.y + Math.PI / 4,
        duration: 2,
        ease: "power2.inOut"
    });
}

export function triggerRevealAnimation(colorHex) {
    // Swirl the dust around
    gsap.to(particles.rotation, {
        y: particles.rotation.y + Math.PI * 2,
        duration: 4,
        ease: "power3.inOut"
    });

    // Color shift the particles to the department color
    const color = new THREE.Color(colorHex);
    gsap.to(particles.material.color, {
        r: color.r,
        g: color.g,
        b: color.b,
        duration: 3,
        ease: "power2.out"
    });
    
    gsap.to(particles.material, {
        size: 0.08,
        opacity: 0.8,
        duration: 2,
        yoyo: true,
        repeat: 1
    });
}

export function updateGraphicsSettings(density, speedKey, colorKey, directionKey = 'bottom', styleKey = 'linear') {
    if (!particles) return;

    particleDirection = directionKey;
    particleStyle = styleKey;

    // Density setup
    let drawCount = 250;
    if (density === 'none') {
        particles.visible = false;
    } else {
        particles.visible = true;
        if (density === 'low') drawCount = 100;
        else if (density === 'medium') drawCount = 250;
        else if (density === 'high') drawCount = 500;
        particles.geometry.setDrawRange(0, drawCount);
    }

    // Speed setup
    if (speedKey === 'still') speedMultiplier = 0.0;
    else if (speedKey === 'slow') speedMultiplier = 0.3;
    else if (speedKey === 'normal') speedMultiplier = 1.0;
    else if (speedKey === 'fast') speedMultiplier = 2.0;

    // Color setup
    if (colorKey && particles.material) {
        let hexColor = 0xffd700; // Gold
        if (colorKey === 'green') hexColor = 0x00ff88;
        else if (colorKey === 'blue') hexColor = 0x00bfff;
        else if (colorKey === 'red') hexColor = 0xff3366;
        else if (colorKey === 'purple') hexColor = 0xbf00ff;
        
        particles.material.color.setHex(hexColor);
    }
}
