/**
 * Circular Visualizer
 * Clean, modern radial frequency visualization with layered elements
 */

class CircularVisualizer extends BaseVisualizer {
    constructor(canvas, audioProcessor) {
        super(canvas, audioProcessor);
        this.rotation = 0;
        this.smoothedData = [];
        this.particles = [];
        this.innerRingData = [];
        this.orbitParticles = [];
        this.pulsePhase = 0;
        this.wavePhase = 0;
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

        const data = this.getProcessedData(128);
        const colors = this.getColors();
        const avg = this.audioProcessor.getAverageFrequency() / 255 || 0;
        const bands = this.audioProcessor.getFrequencyBands();
        const bass = bands.bass / 255 || 0;
        const mid = bands.mid / 255 || 0;
        const treble = bands.treble / 255 || 0;

        // Update animations
        this.rotation +=
            deltaTime * 0.5 * this.settings.animationSpeed * (0.5 + avg);
        this.pulsePhase += deltaTime * 3 * (1 + bass);
        this.wavePhase += deltaTime * 2;

        // Initialize smoothed data
        if (this.smoothedData.length !== data.length) {
            this.smoothedData = new Array(data.length).fill(0);
            this.innerRingData = new Array(data.length).fill(0);
        }

        // Smooth data with different rates
        for (let i = 0; i < data.length; i++) {
            this.smoothedData[i] += (data[i] - this.smoothedData[i]) * 0.15;
            this.innerRingData[i] += (data[i] - this.innerRingData[i]) * 0.08;
        }

        // Draw subtle background pulse
        this.drawBackgroundPulse(colors, bass);

        // Draw concentric guide rings
        this.drawGuideRings(colors, avg);

        // Draw waveform ring
        this.drawWaveformRing(data, colors, mid);

        // Draw orbital particles
        this.updateOrbitParticles(colors, bass, mid, treble);

        // Draw outer frequency arcs
        this.drawFrequencyArcs(this.smoothedData, colors, bass);

        // Draw main circular bars
        this.drawCircularBars(this.smoothedData, colors, avg);

        // Draw inner waveform
        this.drawInnerWaveform(this.innerRingData, colors, mid);

        // Draw reactive center
        this.drawReactiveCenter(colors, bands);

        // Mirror effect
        if (this.settings.mirrorEffect) {
            this.drawMirroredBars(this.smoothedData, colors, avg);
        }

        // Draw burst particles
        this.updateAndDrawParticles(colors, bass);

        // Draw connecting web
        this.drawConnectingWeb(colors, avg);
    }

    drawBackgroundPulse(colors, bass) {
        const maxRadius = Math.max(this.width, this.height) * 0.6;
        const pulseRadius =
            maxRadius * (0.5 + Math.sin(this.pulsePhase) * 0.1 * bass);

        const gradient = this.ctx.createRadialGradient(
            this.centerX,
            this.centerY,
            0,
            this.centerX,
            this.centerY,
            pulseRadius,
        );
        gradient.addColorStop(0, `${colors.primary}08`);
        gradient.addColorStop(0.5, `${colors.secondary}04`);
        gradient.addColorStop(1, "transparent");

        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    drawGuideRings(colors, intensity) {
        const ringCount = 6;
        const maxRadius = Math.min(this.width, this.height) * 0.45;

        this.ctx.save();
        this.ctx.translate(this.centerX, this.centerY);

        for (let i = 0; i < ringCount; i++) {
            const radius = maxRadius * (0.2 + (i / ringCount) * 0.8);
            const alpha = 0.03 + ((ringCount - i) / ringCount) * 0.05;

            // Dashed rings for visual interest
            this.ctx.setLineDash([4, 8]);
            this.ctx.beginPath();
            this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
            this.ctx.strokeStyle = `${colors.primary}${Math.floor(alpha * 255)
                .toString(16)
                .padStart(2, "0")}`;
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
        }

        this.ctx.setLineDash([]);
        this.ctx.restore();
    }

    drawWaveformRing(data, colors, mid) {
        const radius = Math.min(this.width, this.height) * 0.38;
        const points = data.length;

        this.ctx.save();
        this.ctx.translate(this.centerX, this.centerY);
        this.ctx.rotate(this.rotation * 0.2);

        this.ctx.beginPath();
        for (let i = 0; i <= points; i++) {
            const angle = (i / points) * Math.PI * 2;
            const value = (data[i % points] || 0) / 255;
            const wave = Math.sin(angle * 8 + this.wavePhase) * 5 * mid;
            const r = radius + value * 30 + wave;

            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;

            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }

        this.ctx.closePath();
        this.ctx.strokeStyle = `${colors.tertiary}40`;
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

        // Fill with subtle gradient
        const fillGradient = this.ctx.createRadialGradient(
            0,
            0,
            radius * 0.8,
            0,
            0,
            radius + 30,
        );
        fillGradient.addColorStop(0, "transparent");
        fillGradient.addColorStop(1, `${colors.tertiary}08`);
        this.ctx.fillStyle = fillGradient;
        this.ctx.fill();

        this.ctx.restore();
    }

    updateOrbitParticles(colors, bass, mid, treble) {
        // Spawn orbit particles
        if (this.orbitParticles.length < 30) {
            const orbit = Math.floor(Math.random() * 3);
            const radius =
                Math.min(this.width, this.height) * (0.2 + orbit * 0.1);
            const speed =
                (0.5 + Math.random() * 0.5) * (orbit % 2 === 0 ? 1 : -1);

            this.orbitParticles.push({
                angle: Math.random() * Math.PI * 2,
                radius: radius,
                speed: speed,
                size: 2 + Math.random() * 3,
                orbit: orbit,
                color: colors.gradient[orbit % colors.gradient.length],
            });
        }

        // Draw orbit particles
        this.ctx.save();
        this.ctx.translate(this.centerX, this.centerY);

        for (const p of this.orbitParticles) {
            p.angle += p.speed * 0.02 * this.settings.animationSpeed;

            const audioMod =
                p.orbit === 0 ? bass : p.orbit === 1 ? mid : treble;
            const currentRadius = p.radius * (1 + audioMod * 0.2);

            const x = Math.cos(p.angle) * currentRadius;
            const y = Math.sin(p.angle) * currentRadius;

            // Glow effect
            this.ctx.beginPath();
            this.ctx.arc(x, y, p.size * 2, 0, Math.PI * 2);
            const glowGradient = this.ctx.createRadialGradient(
                x,
                y,
                0,
                x,
                y,
                p.size * 2,
            );
            glowGradient.addColorStop(0, `${p.color}60`);
            glowGradient.addColorStop(1, "transparent");
            this.ctx.fillStyle = glowGradient;
            this.ctx.fill();

            // Core
            this.ctx.beginPath();
            this.ctx.arc(x, y, p.size * (0.8 + audioMod * 0.4), 0, Math.PI * 2);
            this.ctx.fillStyle = p.color;
            this.ctx.fill();
        }

        this.ctx.restore();
    }

    drawFrequencyArcs(data, colors, bass) {
        const innerRadius = Math.min(this.width, this.height) * 0.42;
        const arcCount = 32;
        const arcGap = (Math.PI * 2) / arcCount;
        const arcWidth = arcGap * 0.7;

        this.ctx.save();
        this.ctx.translate(this.centerX, this.centerY);
        this.ctx.rotate(this.rotation * 0.5);

        for (let i = 0; i < arcCount; i++) {
            const dataIndex = Math.floor((i / arcCount) * data.length);
            const value = (data[dataIndex] || 0) / 255;
            const startAngle = i * arcGap;
            const endAngle = startAngle + arcWidth;
            const arcLength = value * 25 + 5;

            const gradient = this.ctx.createLinearGradient(
                Math.cos(startAngle) * innerRadius,
                Math.sin(startAngle) * innerRadius,
                Math.cos(startAngle) * (innerRadius + arcLength),
                Math.sin(startAngle) * (innerRadius + arcLength),
            );
            gradient.addColorStop(
                0,
                `${colors.secondary}${Math.floor(value * 200)
                    .toString(16)
                    .padStart(2, "0")}`,
            );
            gradient.addColorStop(
                1,
                `${colors.tertiary}${Math.floor(value * 100)
                    .toString(16)
                    .padStart(2, "0")}`,
            );

            this.ctx.beginPath();
            this.ctx.arc(0, 0, innerRadius + arcLength, startAngle, endAngle);
            this.ctx.arc(0, 0, innerRadius, endAngle, startAngle, true);
            this.ctx.closePath();
            this.ctx.fillStyle = gradient;
            this.ctx.fill();
        }

        this.ctx.restore();
    }

    drawCircularBars(data, colors, intensity) {
        const innerRadius = Math.min(this.width, this.height) * 0.14;
        const maxBarLength = Math.min(this.width, this.height) * 0.22;
        const barCount = data.length;

        this.ctx.save();
        this.ctx.translate(this.centerX, this.centerY);
        this.ctx.rotate(this.rotation);

        for (let i = 0; i < barCount; i++) {
            const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2;
            const value = data[i] / 255;
            const barLength = value * maxBarLength * this.settings.sensitivity;

            const x1 = Math.cos(angle) * innerRadius;
            const y1 = Math.sin(angle) * innerRadius;
            const x2 = Math.cos(angle) * (innerRadius + barLength);
            const y2 = Math.sin(angle) * (innerRadius + barLength);

            // Create gradient for bar
            const gradient = this.ctx.createLinearGradient(x1, y1, x2, y2);
            gradient.addColorStop(0, colors.primary);
            gradient.addColorStop(0.6, colors.secondary);
            gradient.addColorStop(1, colors.tertiary);

            // Apply glow for high values
            if (value > 0.5) {
                this.applyGlow(colors.primary, 8 + value * 12);
            }

            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.strokeStyle = gradient;
            this.ctx.lineWidth = Math.max(2, (360 / barCount) * 0.5);
            this.ctx.lineCap = "round";
            this.ctx.stroke();

            // Draw peak dot
            if (value > 0.6) {
                this.ctx.beginPath();
                this.ctx.arc(x2, y2, 2 + value * 2, 0, Math.PI * 2);
                this.ctx.fillStyle = colors.tertiary;
                this.ctx.fill();
            }
        }

        this.ctx.restore();
        this.resetGlow();
    }

    drawInnerWaveform(data, colors, mid) {
        const radius = Math.min(this.width, this.height) * 0.11;
        const barCount = data.length;

        this.ctx.save();
        this.ctx.translate(this.centerX, this.centerY);
        this.ctx.rotate(-this.rotation * 0.7);

        // Draw smooth curve
        this.ctx.beginPath();
        for (let i = 0; i <= barCount; i++) {
            const angle = (i / barCount) * Math.PI * 2;
            const value = data[i % barCount] / 255;
            const wave = Math.sin(angle * 6 + this.wavePhase * 2) * 8 * mid;
            const r = radius + value * 25 + wave;

            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;

            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                // Smooth curve using quadratic bezier
                const prevAngle = ((i - 1) / barCount) * Math.PI * 2;
                const midAngle = (angle + prevAngle) / 2;
                const prevValue = data[(i - 1) % barCount] / 255;
                const midR = radius + ((value + prevValue) / 2) * 25;
                const cpX = Math.cos(midAngle) * midR;
                const cpY = Math.sin(midAngle) * midR;
                this.ctx.quadraticCurveTo(cpX, cpY, x, y);
            }
        }

        this.ctx.closePath();

        // Gradient stroke
        const strokeGradient = this.ctx.createRadialGradient(
            0,
            0,
            radius * 0.5,
            0,
            0,
            radius + 25,
        );
        strokeGradient.addColorStop(0, colors.secondary);
        strokeGradient.addColorStop(1, colors.primary);

        this.applyGlow(colors.secondary, 15);
        this.ctx.strokeStyle = strokeGradient;
        this.ctx.lineWidth = 2.5;
        this.ctx.stroke();

        // Subtle fill
        const fillGradient = this.ctx.createRadialGradient(
            0,
            0,
            0,
            0,
            0,
            radius + 25,
        );
        fillGradient.addColorStop(0, `${colors.primary}15`);
        fillGradient.addColorStop(0.7, `${colors.secondary}08`);
        fillGradient.addColorStop(1, "transparent");
        this.ctx.fillStyle = fillGradient;
        this.ctx.fill();

        this.ctx.restore();
        this.resetGlow();
    }

    drawReactiveCenter(colors, bands) {
        const bass = bands.bass / 255;
        const mid = bands.mid / 255;
        const treble = bands.treble / 255;
        const avg = (bass + mid + treble) / 3;

        const maxRadius = Math.min(this.width, this.height) * 0.07;
        const pulseScale = 1 + Math.sin(this.pulsePhase) * 0.15 * bass;
        const radius = maxRadius * (0.6 + avg * 0.4) * pulseScale;

        this.ctx.save();
        this.ctx.translate(this.centerX, this.centerY);

        // Outer glow rings
        for (let i = 3; i >= 0; i--) {
            const ringRadius = radius * (1.5 + i * 0.3);
            const alpha = ((3 - i) / 10) * bass;

            this.ctx.beginPath();
            this.ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
            this.ctx.strokeStyle = `${colors.primary}${Math.floor(alpha * 255)
                .toString(16)
                .padStart(2, "0")}`;
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
        }

        // Main gradient circle
        const mainGradient = this.ctx.createRadialGradient(
            0,
            0,
            0,
            0,
            0,
            radius,
        );
        mainGradient.addColorStop(0, colors.tertiary);
        mainGradient.addColorStop(0.3, colors.primary);
        mainGradient.addColorStop(0.7, colors.secondary);
        mainGradient.addColorStop(1, `${colors.primary}00`);

        this.applyGlow(colors.primary, 25 + bass * 20);
        this.ctx.beginPath();
        this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = mainGradient;
        this.ctx.fill();

        // Inner bright core
        const coreRadius = radius * 0.35;
        const coreGradient = this.ctx.createRadialGradient(
            0,
            0,
            0,
            0,
            0,
            coreRadius,
        );
        coreGradient.addColorStop(0, "#ffffff");
        coreGradient.addColorStop(0.5, colors.tertiary);
        coreGradient.addColorStop(1, colors.primary);

        this.ctx.beginPath();
        this.ctx.arc(0, 0, coreRadius, 0, Math.PI * 2);
        this.ctx.fillStyle = coreGradient;
        this.ctx.fill();

        this.ctx.restore();
        this.resetGlow();
    }

    drawMirroredBars(data, colors, intensity) {
        const innerRadius = Math.min(this.width, this.height) * 0.14;
        const maxBarLength = Math.min(this.width, this.height) * 0.08;
        const barCount = data.length;

        this.ctx.save();
        this.ctx.translate(this.centerX, this.centerY);
        this.ctx.rotate(-this.rotation * 0.5);
        this.ctx.globalAlpha = 0.4;

        for (let i = 0; i < barCount; i++) {
            const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2;
            const value = data[i] / 255;
            const barLength = value * maxBarLength;

            const x1 = Math.cos(angle) * innerRadius;
            const y1 = Math.sin(angle) * innerRadius;
            const x2 = Math.cos(angle) * (innerRadius - barLength);
            const y2 = Math.sin(angle) * (innerRadius - barLength);

            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.strokeStyle = colors.tertiary;
            this.ctx.lineWidth = Math.max(1.5, (360 / barCount) * 0.4);
            this.ctx.lineCap = "round";
            this.ctx.stroke();
        }

        this.ctx.restore();
    }

    updateAndDrawParticles(colors, bass) {
        // Spawn burst particles on bass hits
        if (bass > 0.7 && Math.random() < bass * 0.5) {
            const count = Math.floor(3 + bass * 5);
            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 2 + Math.random() * 4 * bass;
                this.particles.push({
                    x: this.centerX,
                    y: this.centerY,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: 1,
                    size: 1.5 + Math.random() * 2.5,
                    color: colors.gradient[
                        Math.floor(Math.random() * colors.gradient.length)
                    ],
                });
            }
        }

        // Limit particles
        if (this.particles.length > 80) {
            this.particles.splice(0, this.particles.length - 80);
        }

        // Update and draw
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * this.settings.animationSpeed;
            p.y += p.vy * this.settings.animationSpeed;
            p.vx *= 0.98;
            p.vy *= 0.98;
            p.life -= 0.015;

            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }

            const alpha = Math.floor(p.life * 255)
                .toString(16)
                .padStart(2, "0");

            // Trail
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            this.ctx.fillStyle = `${p.color}${alpha}`;
            this.ctx.fill();
        }
    }

    drawConnectingWeb(colors, avg) {
        if (avg < 0.3 || this.orbitParticles.length < 2) return;

        this.ctx.save();
        this.ctx.translate(this.centerX, this.centerY);

        const maxDist = 150;

        for (let i = 0; i < this.orbitParticles.length; i++) {
            const p1 = this.orbitParticles[i];
            const x1 = Math.cos(p1.angle) * p1.radius;
            const y1 = Math.sin(p1.angle) * p1.radius;

            // Connect to center
            const distToCenter = p1.radius;
            if (distToCenter < maxDist) {
                const alpha = (1 - distToCenter / maxDist) * 0.1 * avg;
                this.ctx.beginPath();
                this.ctx.moveTo(0, 0);
                this.ctx.lineTo(x1, y1);
                this.ctx.strokeStyle = `${colors.primary}${Math.floor(
                    alpha * 255,
                )
                    .toString(16)
                    .padStart(2, "0")}`;
                this.ctx.lineWidth = 0.5;
                this.ctx.stroke();
            }
        }

        this.ctx.restore();
    }
}

// Export
if (typeof module !== "undefined" && module.exports) {
    module.exports = CircularVisualizer;
}
