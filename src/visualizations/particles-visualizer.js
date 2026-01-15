/**
 * Particles Visualizer
 * Advanced particle system with flow fields, physics, and reactive behaviors
 */

class ParticlesVisualizer extends BaseVisualizer {
    constructor(canvas, audioProcessor) {
        super(canvas, audioProcessor);
        this.particles = [];
        this.maxParticles = 600;
        this.gravityWells = [];
        this.lastBassHit = 0;
        this.bassThreshold = 160;
        this.flowField = [];
        this.flowFieldResolution = 20;
        this.flowFieldCols = 0;
        this.flowFieldRows = 0;
        this.flowPhase = 0;
        this.attractors = [];
        this.ringParticles = [];
    }

    initFlowField() {
        // Safety check for valid dimensions
        if (
            !this.width ||
            !this.height ||
            this.width <= 0 ||
            this.height <= 0
        ) {
            return;
        }
        this.flowFieldCols =
            Math.ceil(this.width / this.flowFieldResolution) || 1;
        this.flowFieldRows =
            Math.ceil(this.height / this.flowFieldResolution) || 1;
        this.flowField = new Array(
            this.flowFieldCols * this.flowFieldRows,
        ).fill(0);
    }

    updateFlowField(bands) {
        if (this.flowFieldCols === 0 || this.flowFieldRows === 0) {
            this.initFlowField();
            if (this.flowFieldCols === 0) return; // Still not ready
        }

        const bass = bands.bass / 255;
        const mid = bands.mid / 255;

        this.flowPhase += 0.02 * this.settings.animationSpeed;

        for (let y = 0; y < this.flowFieldRows; y++) {
            for (let x = 0; x < this.flowFieldCols; x++) {
                const index = y * this.flowFieldCols + x;

                // Create flowing noise pattern
                const nx = x * 0.05 + this.flowPhase;
                const ny = y * 0.05;

                const angle =
                    this.noise(nx, ny) * Math.PI * 4 +
                    Math.sin(this.flowPhase + x * 0.1) * bass * Math.PI;

                this.flowField[index] = angle;
            }
        }
    }

    // Simple noise function
    noise(x, y) {
        const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        return n - Math.floor(n);
    }

    draw(deltaTime) {
        // Safety check for canvas dimensions
        if (
            !this.width ||
            !this.height ||
            this.width <= 0 ||
            this.height <= 0
        ) {
            this.handleResize();
            this.clear();
            return;
        }

        const frequencyData = this.audioProcessor.getFrequencyData();
        const bands = this.audioProcessor.getFrequencyBands();
        const colors = this.getColors();
        const avg = this.audioProcessor.getAverageFrequency() / 255 || 0;
        const bass = bands.bass / 255 || 0;
        const mid = bands.mid / 255 || 0;
        const treble = bands.treble / 255 || 0;

        // Motion blur effect
        this.ctx.fillStyle = `rgba(10, 10, 15, ${0.1 + (1 - avg) * 0.15})`;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Update flow field
        this.updateFlowField(bands);

        // Detect bass hits
        const currentBass = bands.bass;
        const isBassHit =
            currentBass > this.bassThreshold &&
            this.time - this.lastBassHit > 0.12;
        if (isBassHit) {
            this.lastBassHit = this.time;
            this.createExplosion(colors, bass);
            this.createShockwave(colors, bass);
        }

        // Update attractors
        this.updateAttractors(bands);

        // Draw flow field visualization (subtle)
        this.drawFlowFieldVisualization(colors, avg);

        // Spawn particles
        this.spawnParticles(bands, colors, deltaTime);

        // Update gravity wells
        this.updateGravityWells(bands);

        // Update and draw particles
        this.updateParticles(deltaTime, colors, bands);
        this.drawParticles(colors);

        // Draw orbital ring particles
        this.updateRingParticles(colors, bass, mid);

        // Draw connecting constellation
        if (avg > 0.25) {
            this.drawConstellation(colors, avg);
        }

        // Draw frequency reactive core
        this.drawReactiveCore(frequencyData, colors, bands);

        // Draw frequency bars at bottom
        this.drawFrequencyBars(frequencyData, colors, avg);
    }

    createExplosion(colors, intensity) {
        const count = Math.floor(30 + intensity * 40);
        const x = this.centerX + (Math.random() - 0.5) * this.width * 0.3;
        const y = this.centerY + (Math.random() - 0.5) * this.height * 0.3;

        for (let i = 0; i < count; i++) {
            if (this.particles.length >= this.maxParticles) break;

            const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
            const speed = 3 + Math.random() * 8 * intensity;
            const size = 2 + Math.random() * 4;

            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                maxLife: 1,
                size: size,
                color: colors.gradient[
                    Math.floor(Math.random() * colors.gradient.length)
                ],
                type: "explosion",
                useFlowField: false,
                trail: [],
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.2,
            });
        }
    }

    createShockwave(colors, intensity) {
        // Add a temporary gravity well that expands
        this.gravityWells.push({
            x: this.centerX,
            y: this.centerY,
            strength: -1.5 * intensity,
            life: 0.3,
            radius: 0,
            maxRadius: Math.min(this.width, this.height) * 0.5,
            type: "shockwave",
        });
    }

    updateAttractors(bands) {
        const bass = bands.bass / 255;
        const mid = bands.mid / 255;

        // Dynamic attractors based on audio
        if (this.attractors.length < 3) {
            for (let i = this.attractors.length; i < 3; i++) {
                this.attractors.push({
                    x: this.width * (0.25 + i * 0.25),
                    y: this.height * 0.5,
                    baseX: this.width * (0.25 + i * 0.25),
                    baseY: this.height * 0.5,
                    strength: 0,
                    phase: i * Math.PI * 0.67,
                });
            }
        }

        // Animate attractors
        for (let i = 0; i < this.attractors.length; i++) {
            const a = this.attractors[i];
            a.phase += 0.02 * this.settings.animationSpeed;
            a.x = a.baseX + Math.cos(a.phase) * 100 * mid;
            a.y = a.baseY + Math.sin(a.phase * 1.5) * 80 * bass;
            a.strength = 0.3 + bass * 0.5;
        }
    }

    drawFlowFieldVisualization(colors, avg) {
        if (avg < 0.2) return;

        const spacing = this.flowFieldResolution * 2;
        const alpha = Math.floor(avg * 30)
            .toString(16)
            .padStart(2, "0");

        for (let y = 0; y < this.flowFieldRows; y += 2) {
            for (let x = 0; x < this.flowFieldCols; x += 2) {
                const index = y * this.flowFieldCols + x;
                const angle = this.flowField[index];

                const px =
                    x * this.flowFieldResolution + this.flowFieldResolution / 2;
                const py =
                    y * this.flowFieldResolution + this.flowFieldResolution / 2;
                const len = 8 + avg * 8;

                this.ctx.beginPath();
                this.ctx.moveTo(px, py);
                this.ctx.lineTo(
                    px + Math.cos(angle) * len,
                    py + Math.sin(angle) * len,
                );
                this.ctx.strokeStyle = `${colors.tertiary}${alpha}`;
                this.ctx.lineWidth = 0.5;
                this.ctx.stroke();
            }
        }
    }

    spawnParticles(bands, colors, deltaTime) {
        const bass = bands.bass / 255;
        const mid = bands.mid / 255;
        const treble = bands.treble / 255;
        const spawnRate = 3 + (bass + mid) * 6;

        for (
            let i = 0;
            i < spawnRate && this.particles.length < this.maxParticles;
            i++
        ) {
            const type = Math.random();
            let particle;

            if (type < 0.35) {
                // Flow field particles - spawn randomly
                particle = {
                    x: Math.random() * this.width,
                    y: Math.random() * this.height,
                    vx: 0,
                    vy: 0,
                    life: 1,
                    maxLife: 1,
                    size: 1.5 + bass * 2,
                    color: colors.primary,
                    type: "flow",
                    useFlowField: true,
                    trail: [],
                    flowStrength: 1 + mid,
                };
            } else if (type < 0.6) {
                // Bass particles - burst from center
                const angle = Math.random() * Math.PI * 2;
                const dist = 50 + Math.random() * 50;
                particle = {
                    x: this.centerX + Math.cos(angle) * dist,
                    y: this.centerY + Math.sin(angle) * dist,
                    vx: Math.cos(angle) * (2 + bass * 4),
                    vy: Math.sin(angle) * (2 + bass * 4),
                    life: 1,
                    maxLife: 1,
                    size: 3 + bass * 4,
                    color: colors.primary,
                    type: "bass",
                    useFlowField: false,
                    trail: [],
                };
            } else if (type < 0.8) {
                // Mid particles - orbital spawn
                const angle = Math.random() * Math.PI * 2;
                const radius =
                    Math.min(this.width, this.height) *
                    (0.2 + Math.random() * 0.2);
                particle = {
                    x: this.centerX + Math.cos(angle) * radius,
                    y: this.centerY + Math.sin(angle) * radius,
                    vx: Math.cos(angle + Math.PI / 2) * (1 + mid * 2),
                    vy: Math.sin(angle + Math.PI / 2) * (1 + mid * 2),
                    life: 1,
                    maxLife: 1,
                    size: 2 + mid * 2,
                    color: colors.secondary,
                    type: "orbital",
                    useFlowField: true,
                    trail: [],
                };
            } else {
                // Treble particles - sparkles
                particle = {
                    x: Math.random() * this.width,
                    y: Math.random() * this.height,
                    vx: (Math.random() - 0.5) * 2,
                    vy: (Math.random() - 0.5) * 2,
                    life: 0.5 + Math.random() * 0.5,
                    maxLife: 1,
                    size: 1 + treble * 1.5,
                    color: colors.tertiary,
                    type: "sparkle",
                    useFlowField: false,
                    trail: [],
                    twinkle: Math.random() * Math.PI * 2,
                };
            }

            this.particles.push(particle);
        }
    }

    updateGravityWells(bands) {
        const bass = bands.bass / 255;

        // Update existing wells
        for (let i = this.gravityWells.length - 1; i >= 0; i--) {
            const well = this.gravityWells[i];
            well.life -= 0.015;

            if (well.type === "shockwave") {
                well.radius += (well.maxRadius - well.radius) * 0.1;
            }

            if (well.life <= 0) {
                this.gravityWells.splice(i, 1);
            }
        }
    }

    updateParticles(deltaTime, colors, bands) {
        const speed = this.settings.animationSpeed;
        const bass = bands.bass / 255;

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            // Store trail
            if (p.trail.length > 15) p.trail.shift();
            p.trail.push({ x: p.x, y: p.y, life: p.life });

            // Apply flow field
            if (p.useFlowField && this.flowFieldCols > 0) {
                const col = Math.floor(p.x / this.flowFieldResolution);
                const row = Math.floor(p.y / this.flowFieldResolution);

                if (
                    col >= 0 &&
                    col < this.flowFieldCols &&
                    row >= 0 &&
                    row < this.flowFieldRows
                ) {
                    const index = row * this.flowFieldCols + col;
                    const angle = this.flowField[index];
                    const strength = (p.flowStrength || 1) * 0.3;

                    p.vx += Math.cos(angle) * strength;
                    p.vy += Math.sin(angle) * strength;
                }
            }

            // Apply gravity wells
            for (const well of this.gravityWells) {
                const dx = well.x - p.x;
                const dy = well.y - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (well.type === "shockwave") {
                    // Shockwave pushes outward
                    if (dist > 10 && dist < well.radius + 50) {
                        const force =
                            well.strength *
                            well.life *
                            (1 - Math.abs(dist - well.radius) / 50);
                        p.vx += (dx / dist) * force;
                        p.vy += (dy / dist) * force;
                    }
                } else if (dist > 10 && dist < 400) {
                    const force = well.strength / (dist * 0.08);
                    p.vx += (dx / dist) * force;
                    p.vy += (dy / dist) * force;
                }
            }

            // Apply attractors
            for (const attractor of this.attractors) {
                const dx = attractor.x - p.x;
                const dy = attractor.y - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist > 20 && dist < 300) {
                    const force = attractor.strength / (dist * 0.1);
                    p.vx += (dx / dist) * force * 0.5;
                    p.vy += (dy / dist) * force * 0.5;
                }
            }

            // Twinkle effect for sparkles
            if (p.type === "sparkle") {
                p.twinkle += 0.2;
            }

            // Apply friction and speed limit
            const maxSpeed = 8;
            const currentSpeed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            if (currentSpeed > maxSpeed) {
                p.vx = (p.vx / currentSpeed) * maxSpeed;
                p.vy = (p.vy / currentSpeed) * maxSpeed;
            }

            p.vx *= 0.98;
            p.vy *= 0.98;

            // Update position
            p.x += p.vx * speed;
            p.y += p.vy * speed;

            // Update life
            const lifeDecay = p.type === "sparkle" ? 0.015 : 0.006;
            p.life -= lifeDecay * speed;

            // Wrap around screen for flow particles
            if (p.type === "flow") {
                if (p.x < 0) p.x = this.width;
                if (p.x > this.width) p.x = 0;
                if (p.y < 0) p.y = this.height;
                if (p.y > this.height) p.y = 0;
            }

            // Remove dead or off-screen particles
            if (
                p.life <= 0 ||
                (p.type !== "flow" &&
                    (p.x < -100 ||
                        p.x > this.width + 100 ||
                        p.y < -100 ||
                        p.y > this.height + 100))
            ) {
                this.particles.splice(i, 1);
            }
        }
    }

    drawParticles(colors) {
        for (const p of this.particles) {
            const alpha = p.life;
            let size = p.size * (0.5 + p.life * 0.5);

            // Twinkle effect
            if (p.type === "sparkle") {
                size *= 0.5 + Math.sin(p.twinkle) * 0.5;
            }

            // Draw trail
            if (p.trail.length > 2 && p.type !== "sparkle") {
                this.ctx.beginPath();
                this.ctx.moveTo(p.trail[0].x, p.trail[0].y);

                for (let i = 1; i < p.trail.length; i++) {
                    this.ctx.lineTo(p.trail[i].x, p.trail[i].y);
                }

                const trailAlpha = Math.floor(alpha * 0.4 * 255)
                    .toString(16)
                    .padStart(2, "0");
                this.ctx.strokeStyle = `${p.color}${trailAlpha}`;
                this.ctx.lineWidth = size * 0.4;
                this.ctx.lineCap = "round";
                this.ctx.stroke();
            }

            // Draw glow
            if (size > 2) {
                const glowGradient = this.ctx.createRadialGradient(
                    p.x,
                    p.y,
                    0,
                    p.x,
                    p.y,
                    size * 3,
                );
                glowGradient.addColorStop(
                    0,
                    `${p.color}${Math.floor(alpha * 80)
                        .toString(16)
                        .padStart(2, "0")}`,
                );
                glowGradient.addColorStop(1, "transparent");

                this.ctx.fillStyle = glowGradient;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, size * 3, 0, Math.PI * 2);
                this.ctx.fill();
            }

            // Draw core
            const coreAlpha = Math.floor(alpha * 255)
                .toString(16)
                .padStart(2, "0");
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
            this.ctx.fillStyle = `${p.color}${coreAlpha}`;
            this.ctx.fill();
        }
    }

    updateRingParticles(colors, bass, mid) {
        const maxRingParticles = 40;

        // Spawn ring particles
        while (this.ringParticles.length < maxRingParticles) {
            const angle = Math.random() * Math.PI * 2;
            const radiusBase =
                Math.min(this.width, this.height) *
                (0.15 + Math.random() * 0.2);

            this.ringParticles.push({
                angle: angle,
                radius: radiusBase,
                speed:
                    (0.3 + Math.random() * 0.4) *
                    (Math.random() < 0.5 ? 1 : -1),
                size: 2 + Math.random() * 2,
                color: colors.gradient[
                    Math.floor(Math.random() * colors.gradient.length)
                ],
            });
        }

        // Update and draw
        this.ctx.save();
        this.ctx.translate(this.centerX, this.centerY);

        for (const rp of this.ringParticles) {
            rp.angle += rp.speed * 0.02 * this.settings.animationSpeed;

            const radiusMod = rp.radius * (1 + bass * 0.3);
            const x = Math.cos(rp.angle) * radiusMod;
            const y = Math.sin(rp.angle) * radiusMod;
            const sizeMod = rp.size * (0.8 + mid * 0.4);

            // Glow
            const glowGradient = this.ctx.createRadialGradient(
                x,
                y,
                0,
                x,
                y,
                sizeMod * 2,
            );
            glowGradient.addColorStop(0, `${rp.color}40`);
            glowGradient.addColorStop(1, "transparent");

            this.ctx.fillStyle = glowGradient;
            this.ctx.beginPath();
            this.ctx.arc(x, y, sizeMod * 2, 0, Math.PI * 2);
            this.ctx.fill();

            // Core
            this.ctx.beginPath();
            this.ctx.arc(x, y, sizeMod, 0, Math.PI * 2);
            this.ctx.fillStyle = rp.color;
            this.ctx.fill();
        }

        this.ctx.restore();
    }

    drawConstellation(colors, avg) {
        const maxDist = 100 + avg * 60;
        const minDist = 30;

        this.ctx.lineWidth = 0.5;

        // Connect nearby particles
        for (let i = 0; i < Math.min(this.particles.length, 150); i++) {
            const p1 = this.particles[i];

            for (let j = i + 1; j < Math.min(this.particles.length, 150); j++) {
                const p2 = this.particles[j];
                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist > minDist && dist < maxDist) {
                    const alpha =
                        (1 - (dist - minDist) / (maxDist - minDist)) *
                        0.2 *
                        Math.min(p1.life, p2.life);

                    this.ctx.beginPath();
                    this.ctx.moveTo(p1.x, p1.y);
                    this.ctx.lineTo(p2.x, p2.y);
                    this.ctx.strokeStyle = `${colors.primary}${Math.floor(
                        alpha * 255,
                    )
                        .toString(16)
                        .padStart(2, "0")}`;
                    this.ctx.stroke();
                }
            }
        }
    }

    drawReactiveCore(data, colors, bands) {
        const bass = bands.bass / 255;
        const mid = bands.mid / 255;
        const baseRadius = Math.min(this.width, this.height) * 0.08;
        const radius = baseRadius * (0.8 + bass * 0.5);

        // Outer glow
        const glowGradient = this.ctx.createRadialGradient(
            this.centerX,
            this.centerY,
            0,
            this.centerX,
            this.centerY,
            radius * 3,
        );
        glowGradient.addColorStop(0, `${colors.primary}30`);
        glowGradient.addColorStop(0.5, `${colors.secondary}15`);
        glowGradient.addColorStop(1, "transparent");

        this.ctx.fillStyle = glowGradient;
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, radius * 3, 0, Math.PI * 2);
        this.ctx.fill();

        // Core
        const coreGradient = this.ctx.createRadialGradient(
            this.centerX,
            this.centerY,
            0,
            this.centerX,
            this.centerY,
            radius,
        );
        coreGradient.addColorStop(0, colors.tertiary);
        coreGradient.addColorStop(0.5, colors.primary);
        coreGradient.addColorStop(1, `${colors.secondary}00`);

        this.ctx.fillStyle = coreGradient;
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, radius, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawFrequencyBars(data, colors, avg) {
        const barCount = 80;
        const barWidth = this.width / barCount;
        const maxHeight = 40 + avg * 30;
        const samplesPerBar = Math.floor(data.length / barCount);

        for (let i = 0; i < barCount; i++) {
            let sum = 0;
            for (let j = 0; j < samplesPerBar; j++) {
                sum += data[i * samplesPerBar + j] || 0;
            }
            const value = sum / samplesPerBar / 255;
            const height = value * maxHeight * this.settings.sensitivity;

            const gradient = this.ctx.createLinearGradient(
                0,
                this.height,
                0,
                this.height - height,
            );
            gradient.addColorStop(0, `${colors.primary}60`);
            gradient.addColorStop(1, `${colors.tertiary}20`);

            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(
                i * barWidth,
                this.height - height,
                barWidth - 1,
                height,
            );
        }
    }
}

// Export
if (typeof module !== "undefined" && module.exports) {
    module.exports = ParticlesVisualizer;
}
