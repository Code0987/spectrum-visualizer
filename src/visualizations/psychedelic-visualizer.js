/**
 * Psychedelic Visualizer
 * Advanced trippy visuals with sacred geometry, fractals, and fluid dynamics
 */

class PsychedelicVisualizer extends BaseVisualizer {
    constructor(canvas, audioProcessor) {
        super(canvas, audioProcessor);
        this.hueOffset = 0;
        this.phase = 0;
        this.warpPhase = 0;
        this.flowerRotation = 0;
        this.breathScale = 1;
        this.noiseOffset = 0;
        this.trails = [];
        this.maxTrails = 8;
        this.lastFrameData = null;
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
        const timeDomainData = this.audioProcessor.getTimeDomainData();

        if (!frequencyData || !timeDomainData) {
            this.clear();
            return;
        }

        const bands = this.audioProcessor.getFrequencyBands() || {
            bass: 0,
            mid: 0,
            treble: 0,
        };
        const avg = (this.audioProcessor.getAverageFrequency() || 0) / 255;
        const bass = (bands.bass || 0) / 255;
        const mid = (bands.mid || 0) / 255;
        const treble = (bands.treble || 0) / 255;

        const speed = this.settings.animationSpeed;

        // Update animation phases
        this.hueOffset += deltaTime * 25 * speed * (0.3 + avg * 0.7);
        this.phase += deltaTime * speed * (1 + bass * 2);
        this.warpPhase += deltaTime * 0.5 * speed;
        this.flowerRotation += deltaTime * 0.2 * speed * (1 + mid);
        this.breathScale = 1 + Math.sin(this.time * 2) * 0.1 * (1 + bass);
        this.noiseOffset += deltaTime * 50;

        // Create motion blur / trail effect
        this.ctx.fillStyle = `rgba(10, 10, 15, ${0.12 + (1 - avg) * 0.18})`;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Layer 1: Deep space warp background
        this.drawWarpField(bass, mid);

        // Layer 2: Flowing energy ribbons
        this.drawEnergyRibbons(frequencyData, bass, mid, treble);

        // Layer 3: Sacred geometry flower of life
        this.drawSacredGeometry(frequencyData, bass, mid);

        // Layer 4: Fractal spirograph
        this.drawFractalSpirograph(frequencyData, avg);

        // Layer 5: Reactive kaleidoscope
        this.drawKaleidoscope(timeDomainData, bass, mid, treble);

        // Layer 6: Central mandala
        this.drawCentralMandala(frequencyData, bands);

        // Layer 7: Particle aurora
        this.drawAurora(frequencyData, bass, treble);

        // Layer 8: Chromatic aberration effect
        this.applyChromaEffect(avg);

        // Store frame for next iteration
        this.lastFrameData = { bass, mid, treble, avg };
    }

    drawWarpField(bass, mid) {
        const lineCount = 60;
        const maxLen = Math.max(this.width, this.height) * 0.8;

        this.ctx.save();
        this.ctx.translate(this.centerX, this.centerY);
        this.ctx.rotate(this.warpPhase * 0.1);

        for (let i = 0; i < lineCount; i++) {
            const angle = (i / lineCount) * Math.PI * 2;
            const waveOffset = Math.sin(angle * 3 + this.phase) * 50 * bass;
            const len = maxLen * (0.3 + mid * 0.7) + waveOffset;

            const hue = (this.hueOffset + i * 6) % 360;
            const alpha = 0.1 + bass * 0.2;

            const gradient = this.ctx.createLinearGradient(
                0,
                0,
                Math.cos(angle) * len,
                Math.sin(angle) * len,
            );
            gradient.addColorStop(0, "transparent");
            gradient.addColorStop(0.3, `hsla(${hue}, 100%, 60%, ${alpha})`);
            gradient.addColorStop(
                0.7,
                `hsla(${(hue + 60) % 360}, 100%, 50%, ${alpha * 0.5})`,
            );
            gradient.addColorStop(1, "transparent");

            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);

            // Curved warp lines
            const cp1x = Math.cos(angle + 0.2) * len * 0.5;
            const cp1y = Math.sin(angle + 0.2) * len * 0.5;
            const cp2x = Math.cos(angle - 0.1) * len * 0.8;
            const cp2y = Math.sin(angle - 0.1) * len * 0.8;
            const endX = Math.cos(angle) * len;
            const endY = Math.sin(angle) * len;

            this.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);

            this.ctx.strokeStyle = gradient;
            this.ctx.lineWidth = 1 + bass * 2;
            this.ctx.stroke();
        }

        this.ctx.restore();
    }

    drawEnergyRibbons(data, bass, mid, treble) {
        const ribbonCount = 5;
        const points = 80;

        this.ctx.save();
        this.ctx.translate(this.centerX, this.centerY);

        for (let r = 0; r < ribbonCount; r++) {
            const ribbonPhase = this.phase + r * Math.PI * 0.4;
            const baseRadius =
                Math.min(this.width, this.height) * (0.2 + r * 0.08);

            this.ctx.beginPath();

            let avgAudioMod = 0;

            for (let i = 0; i <= points; i++) {
                const t = i / points;
                const angle = t * Math.PI * 4 + ribbonPhase;

                const dataIdx = Math.floor(t * data.length * 0.8);
                const audioMod = (data[dataIdx] || 0) / 255;
                avgAudioMod += audioMod;

                const radiusWave =
                    Math.sin(angle * 3 + this.time * 2) * 30 * mid;
                const audioWave = audioMod * 50;
                const radius = baseRadius + radiusWave + audioWave;

                const x = Math.cos(angle) * radius * Math.cos(t * Math.PI);
                const y = Math.sin(angle) * radius;

                if (i === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }

            avgAudioMod /= points;
            const hue = (this.hueOffset + r * 72) % 360;
            const alpha = 0.4 + avgAudioMod * 0.4;

            this.ctx.strokeStyle = `hsla(${hue}, 90%, 60%, ${alpha})`;
            this.ctx.lineWidth = 2 + bass * 3;
            this.ctx.lineCap = "round";
            this.ctx.lineJoin = "round";
            this.ctx.stroke();
        }

        this.ctx.restore();
    }

    drawSacredGeometry(data, bass, mid) {
        const rings = 6;
        const petals = 6;
        const baseRadius = Math.min(this.width, this.height) * 0.12;

        this.ctx.save();
        this.ctx.translate(this.centerX, this.centerY);
        this.ctx.rotate(this.flowerRotation);
        this.ctx.scale(this.breathScale, this.breathScale);

        // Flower of life pattern
        for (let ring = 0; ring < rings; ring++) {
            const ringRadius = baseRadius * (ring + 1) * 0.5;
            const circleCount = ring === 0 ? 1 : ring * 6;

            for (let i = 0; i < circleCount; i++) {
                const angle =
                    (i / circleCount) * Math.PI * 2 +
                    ((ring % 2) * Math.PI) / circleCount;
                const cx = ring === 0 ? 0 : Math.cos(angle) * ringRadius;
                const cy = ring === 0 ? 0 : Math.sin(angle) * ringRadius;

                const dataIdx = Math.floor(
                    (i / circleCount) * data.length * 0.5,
                );
                const audioMod = (data[dataIdx] || 0) / 255;

                const circleRadius = baseRadius * (0.8 + audioMod * 0.4);
                const hue = (this.hueOffset + ring * 30 + i * 10) % 360;
                const alpha = 0.15 + audioMod * 0.2;

                this.ctx.beginPath();
                this.ctx.arc(cx, cy, circleRadius, 0, Math.PI * 2);
                this.ctx.strokeStyle = `hsla(${hue}, 80%, 60%, ${alpha})`;
                this.ctx.lineWidth = 1 + bass;
                this.ctx.stroke();
            }
        }

        // Seed of life (inner pattern)
        this.ctx.globalCompositeOperation = "lighter";
        for (let i = 0; i < 7; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const cx = i === 0 ? 0 : Math.cos(angle) * baseRadius * 0.5;
            const cy = i === 0 ? 0 : Math.sin(angle) * baseRadius * 0.5;

            const hue = (this.hueOffset + i * 51) % 360;

            this.ctx.beginPath();
            this.ctx.arc(cx, cy, baseRadius * 0.5, 0, Math.PI * 2);

            const gradient = this.ctx.createRadialGradient(
                cx,
                cy,
                0,
                cx,
                cy,
                baseRadius * 0.5,
            );
            gradient.addColorStop(
                0,
                `hsla(${hue}, 100%, 70%, ${0.3 + bass * 0.3})`,
            );
            gradient.addColorStop(1, "transparent");

            this.ctx.fillStyle = gradient;
            this.ctx.fill();
        }
        this.ctx.globalCompositeOperation = "source-over";

        this.ctx.restore();
    }

    drawFractalSpirograph(data, avg) {
        const arms = 8;
        const points = 150;
        const maxRadius = Math.min(this.width, this.height) * 0.35;

        this.ctx.save();
        this.ctx.translate(this.centerX, this.centerY);

        for (let arm = 0; arm < arms; arm++) {
            this.ctx.rotate((Math.PI * 2) / arms);

            this.ctx.beginPath();

            for (let i = 0; i < points; i++) {
                const t = i / points;
                const dataIdx = Math.floor(t * data.length);
                const audioMod = (data[dataIdx] || 0) / 255;

                // Complex spirograph formula
                const a = maxRadius * 0.5;
                const b = maxRadius * 0.3 * (1 + audioMod * 0.5);
                const c = maxRadius * 0.15;
                const tAngle = t * Math.PI * 8 + this.phase;

                const x =
                    (a - b) * Math.cos(tAngle) +
                    c * Math.cos(((a - b) / b) * tAngle + this.time);
                const y =
                    (a - b) * Math.sin(tAngle) -
                    c * Math.sin(((a - b) / b) * tAngle + this.time);

                if (i === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }

            const hue = (this.hueOffset + arm * 45) % 360;
            this.ctx.strokeStyle = `hsla(${hue}, 100%, 65%, ${0.3 + avg * 0.4})`;
            this.ctx.lineWidth = 1.5;
            this.ctx.stroke();
        }

        this.ctx.restore();
    }

    drawKaleidoscope(data, bass, mid, treble) {
        const segments = 12;
        const sliceAngle = (Math.PI * 2) / segments;
        const radius = Math.min(this.width, this.height) * 0.4;

        this.ctx.save();
        this.ctx.translate(this.centerX, this.centerY);
        this.ctx.rotate(this.phase * 0.1);

        for (let seg = 0; seg < segments; seg++) {
            this.ctx.save();
            this.ctx.rotate(sliceAngle * seg);

            if (seg % 2 === 1) {
                this.ctx.scale(1, -1);
            }

            // Create slice path
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);

            const slicePoints = 30;
            for (let i = 0; i <= slicePoints; i++) {
                const t = i / slicePoints;
                const angle = t * sliceAngle;
                const dataIdx = Math.floor(t * data.length);
                const audioMod = (data[dataIdx] - 128) / 128;

                const wave = Math.sin(t * Math.PI * 4 + this.phase) * 20 * mid;
                const r = radius * (0.5 + t * 0.5) + audioMod * 30 + wave;

                this.ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
            }
            this.ctx.closePath();

            // Gradient fill
            const hue = (this.hueOffset + seg * 30) % 360;
            const gradient = this.ctx.createLinearGradient(0, 0, radius, 0);
            gradient.addColorStop(0, `hsla(${hue}, 100%, 50%, 0.05)`);
            gradient.addColorStop(
                0.5,
                `hsla(${(hue + 30) % 360}, 100%, 60%, ${0.1 + bass * 0.1})`,
            );
            gradient.addColorStop(
                1,
                `hsla(${(hue + 60) % 360}, 100%, 50%, 0.05)`,
            );

            this.ctx.fillStyle = gradient;
            this.ctx.fill();

            // Edge glow
            this.ctx.strokeStyle = `hsla(${hue}, 100%, 70%, ${0.3 + treble * 0.3})`;
            this.ctx.lineWidth = 1;
            this.ctx.stroke();

            this.ctx.restore();
        }

        this.ctx.restore();
    }

    drawCentralMandala(data, bands) {
        const bass = bands.bass / 255;
        const mid = bands.mid / 255;
        const layers = 8;
        const baseRadius = Math.min(this.width, this.height) * 0.08;

        this.ctx.save();
        this.ctx.translate(this.centerX, this.centerY);
        this.ctx.rotate(-this.flowerRotation * 0.5);

        for (let layer = 0; layer < layers; layer++) {
            const layerRadius =
                baseRadius * (1 + layer * 0.5) * (1 + bass * 0.3);
            const petalCount = 6 + layer * 2;
            const dataOffset = layer * 20;

            for (let p = 0; p < petalCount; p++) {
                const angle = (p / petalCount) * Math.PI * 2;
                const dataIdx = (dataOffset + p * 5) % data.length;
                const audioMod = (data[dataIdx] || 0) / 255;

                // Petal shape
                this.ctx.save();
                this.ctx.rotate(angle);

                const petalLength = layerRadius * (0.8 + audioMod * 0.6);
                const petalWidth = layerRadius * 0.3 * (1 + mid * 0.5);

                this.ctx.beginPath();
                this.ctx.moveTo(0, 0);
                this.ctx.quadraticCurveTo(
                    petalWidth,
                    petalLength * 0.5,
                    0,
                    petalLength,
                );
                this.ctx.quadraticCurveTo(-petalWidth, petalLength * 0.5, 0, 0);

                const hue = (this.hueOffset + layer * 25 + p * 15) % 360;
                const gradient = this.ctx.createLinearGradient(
                    0,
                    0,
                    0,
                    petalLength,
                );
                gradient.addColorStop(
                    0,
                    `hsla(${hue}, 100%, 50%, ${0.5 + audioMod * 0.3})`,
                );
                gradient.addColorStop(
                    1,
                    `hsla(${(hue + 40) % 360}, 100%, 60%, 0.1)`,
                );

                this.ctx.fillStyle = gradient;
                this.ctx.fill();

                this.ctx.restore();
            }
        }

        // Central core
        const coreGradient = this.ctx.createRadialGradient(
            0,
            0,
            0,
            0,
            0,
            baseRadius,
        );
        const coreHue = this.hueOffset % 360;
        coreGradient.addColorStop(
            0,
            `hsla(${coreHue}, 100%, 90%, ${0.8 + bass * 0.2})`,
        );
        coreGradient.addColorStop(
            0.5,
            `hsla(${(coreHue + 60) % 360}, 100%, 60%, 0.6)`,
        );
        coreGradient.addColorStop(
            1,
            `hsla(${(coreHue + 120) % 360}, 100%, 50%, 0)`,
        );

        this.ctx.beginPath();
        this.ctx.arc(0, 0, baseRadius * (1 + bass * 0.5), 0, Math.PI * 2);
        this.ctx.fillStyle = coreGradient;
        this.ctx.fill();

        this.ctx.restore();
    }

    drawAurora(data, bass, treble) {
        const waveCount = 5;
        const points = 100;

        this.ctx.save();
        this.ctx.globalCompositeOperation = "lighter";

        for (let w = 0; w < waveCount; w++) {
            const yBase = this.height * (0.2 + w * 0.15);
            const amplitude = 50 + bass * 80;
            const phaseOffset = w * 0.5 + this.phase * 0.3;

            this.ctx.beginPath();
            this.ctx.moveTo(0, yBase);

            for (let i = 0; i <= points; i++) {
                const t = i / points;
                const x = t * this.width;
                const dataIdx = Math.floor(t * data.length);
                const audioMod = (data[dataIdx] || 0) / 255;

                const wave1 =
                    Math.sin(t * Math.PI * 2 + phaseOffset) * amplitude;
                const wave2 =
                    Math.sin(t * Math.PI * 4 + phaseOffset * 1.5) *
                    amplitude *
                    0.5;
                const audioWave = audioMod * 40;

                const y = yBase + wave1 + wave2 + audioWave;
                this.ctx.lineTo(x, y);
            }

            // Close the path for fill
            this.ctx.lineTo(this.width, this.height);
            this.ctx.lineTo(0, this.height);
            this.ctx.closePath();

            const hue = (this.hueOffset + w * 40) % 360;
            const gradient = this.ctx.createLinearGradient(
                0,
                yBase - amplitude,
                0,
                this.height,
            );
            gradient.addColorStop(
                0,
                `hsla(${hue}, 100%, 60%, ${0.1 + treble * 0.15})`,
            );
            gradient.addColorStop(
                0.5,
                `hsla(${(hue + 30) % 360}, 100%, 50%, 0.05)`,
            );
            gradient.addColorStop(1, "transparent");

            this.ctx.fillStyle = gradient;
            this.ctx.fill();
        }

        this.ctx.globalCompositeOperation = "source-over";
        this.ctx.restore();
    }

    applyChromaEffect(intensity) {
        if (intensity < 0.4) return;

        const offset = intensity * 3;

        // Subtle RGB shift effect
        this.ctx.globalCompositeOperation = "lighter";
        this.ctx.globalAlpha = intensity * 0.1;

        // Red channel shift
        this.ctx.drawImage(this.canvas, -offset, 0);

        // Blue channel shift
        this.ctx.drawImage(this.canvas, offset, 0);

        this.ctx.globalAlpha = 1;
        this.ctx.globalCompositeOperation = "source-over";

        // Vignette
        const vignetteGradient = this.ctx.createRadialGradient(
            this.centerX,
            this.centerY,
            0,
            this.centerX,
            this.centerY,
            Math.max(this.width, this.height) * 0.7,
        );
        vignetteGradient.addColorStop(0, "transparent");
        vignetteGradient.addColorStop(0.7, "transparent");
        vignetteGradient.addColorStop(
            1,
            `rgba(0, 0, 0, ${0.3 + (1 - intensity) * 0.2})`,
        );

        this.ctx.fillStyle = vignetteGradient;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }
}

// Export
if (typeof module !== "undefined" && module.exports) {
    module.exports = PsychedelicVisualizer;
}
