/**
 * Bars Visualizer
 * Modern spectrum analyzer with glowing bars and reactive effects
 */

class BarsVisualizer extends BaseVisualizer {
    constructor(canvas, audioProcessor) {
        super(canvas, audioProcessor);
        this.smoothedData = [];
        this.peakData = [];
        this.peakVelocity = [];
        this.peakDecay = 0.97;
        this.smoothingFactor = 0.25;
        this.particles = [];
        this.waveOffset = 0;
        this.lastBass = 0;
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

        // Clear canvas first
        this.clear();

        const data = this.getProcessedData();
        if (!data || data.length === 0) return;

        const colors = this.getColors();
        const barCount = data.length;
        const bands = this.audioProcessor.getFrequencyBands() || {
            bass: 0,
            mid: 0,
            treble: 0,
        };
        const bass = (bands.bass || 0) / 255;
        const avg = (this.audioProcessor.getAverageFrequency() || 0) / 255;

        this.waveOffset += deltaTime * 2 * this.settings.animationSpeed;

        // Initialize arrays if needed
        if (this.smoothedData.length !== barCount) {
            this.smoothedData = new Array(barCount).fill(0);
            this.peakData = new Array(barCount).fill(0);
            this.peakVelocity = new Array(barCount).fill(0);
        }

        // Smooth data and update peaks with physics
        for (let i = 0; i < barCount; i++) {
            this.smoothedData[i] +=
                (data[i] - this.smoothedData[i]) * this.smoothingFactor;

            if (this.smoothedData[i] > this.peakData[i]) {
                this.peakData[i] = this.smoothedData[i];
                this.peakVelocity[i] = 0;
            } else {
                this.peakVelocity[i] += 0.5; // Gravity
                this.peakData[i] -= this.peakVelocity[i] * 0.5;
                this.peakData[i] = Math.max(
                    this.peakData[i],
                    this.smoothedData[i],
                );
            }
        }

        const totalWidth = this.width * 0.92;
        const barWidth =
            (totalWidth - (barCount - 1) * this.settings.barSpacing) / barCount;
        const startX = (this.width - totalWidth) / 2;
        const maxHeight = this.height * 0.75;
        const baseY = this.height * 0.88;

        // Draw ambient background glow
        this.drawAmbientGlow(colors, bass, baseY);

        // Draw background wave
        this.drawBackgroundWave(colors, avg, baseY, maxHeight);

        // Draw reflecting floor
        this.drawReflectingFloor(colors, baseY);

        // Draw bars with effects
        for (let i = 0; i < barCount; i++) {
            const value = this.smoothedData[i] / 255;
            const height = value * maxHeight;
            const x = startX + i * (barWidth + this.settings.barSpacing);
            const y = baseY - height;

            // Draw bar shadow/glow on floor
            this.drawBarGlow(x, baseY, barWidth, value, colors, i / barCount);

            // Draw main bar
            this.drawBar(
                x,
                y,
                barWidth,
                height,
                baseY,
                value,
                colors,
                i / barCount,
            );

            // Draw peak indicator
            this.drawPeakIndicator(x, barWidth, baseY, maxHeight, i, colors);

            // Mirror effect
            if (this.settings.mirrorEffect) {
                this.drawMirrorBar(
                    x,
                    barWidth,
                    height,
                    baseY,
                    value,
                    colors,
                    i / barCount,
                );
            }

            // Spawn particles on high values
            if (value > 0.8 && Math.random() < value * 0.3) {
                this.spawnParticle(x + barWidth / 2, y, colors, value);
            }
        }

        // Draw and update particles
        this.updateParticles(deltaTime);

        // Draw frequency labels
        this.drawFrequencyLabels(startX, baseY, totalWidth, barCount, colors);

        // Draw level indicator
        this.drawLevelIndicator(colors, avg, bass);

        this.lastBass = bass;
    }

    drawAmbientGlow(colors, bass, baseY) {
        const gradient = this.ctx.createRadialGradient(
            this.centerX,
            baseY,
            0,
            this.centerX,
            baseY,
            this.width * 0.6,
        );
        gradient.addColorStop(0, `${colors.primary}15`);
        gradient.addColorStop(0.5, `${colors.secondary}08`);
        gradient.addColorStop(1, "transparent");

        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    drawBackgroundWave(colors, avg, baseY, maxHeight) {
        const points = 100;

        this.ctx.beginPath();
        this.ctx.moveTo(0, baseY);

        for (let i = 0; i <= points; i++) {
            const t = i / points;
            const x = t * this.width;
            const wave = Math.sin(t * Math.PI * 4 + this.waveOffset) * 20 * avg;
            const y = baseY - maxHeight * 0.1 - wave;
            this.ctx.lineTo(x, y);
        }

        this.ctx.lineTo(this.width, baseY);
        this.ctx.closePath();

        const gradient = this.ctx.createLinearGradient(
            0,
            baseY - maxHeight * 0.3,
            0,
            baseY,
        );
        gradient.addColorStop(0, `${colors.tertiary}05`);
        gradient.addColorStop(1, `${colors.primary}02`);
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
    }

    drawReflectingFloor(colors, baseY) {
        const gradient = this.ctx.createLinearGradient(
            0,
            baseY,
            0,
            this.height,
        );
        gradient.addColorStop(0, `${colors.primary}20`);
        gradient.addColorStop(0.02, `${colors.primary}10`);
        gradient.addColorStop(1, "transparent");

        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, baseY, this.width, this.height - baseY);

        // Floor line
        this.ctx.beginPath();
        this.ctx.moveTo(0, baseY);
        this.ctx.lineTo(this.width, baseY);
        this.ctx.strokeStyle = `${colors.primary}40`;
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
    }

    drawBarGlow(x, baseY, barWidth, value, colors, position) {
        if (value < 0.3) return;

        const glowWidth = barWidth * 3;
        const glowHeight = value * 30;

        const gradient = this.ctx.createRadialGradient(
            x + barWidth / 2,
            baseY,
            0,
            x + barWidth / 2,
            baseY,
            glowWidth,
        );

        const color = this.getSpectrumColor(position);
        gradient.addColorStop(
            0,
            `${color}${Math.floor(value * 60)
                .toString(16)
                .padStart(2, "0")}`,
        );
        gradient.addColorStop(1, "transparent");

        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(
            x - glowWidth / 2,
            baseY - glowHeight / 2,
            glowWidth + barWidth,
            glowHeight,
        );
    }

    drawBar(x, y, barWidth, height, baseY, value, colors, position) {
        if (height < 1) return;

        const color = this.getSpectrumColor(position);

        // Main bar gradient
        const gradient = this.ctx.createLinearGradient(x, y, x, baseY);
        gradient.addColorStop(0, colors.tertiary);
        gradient.addColorStop(0.3, colors.primary);
        gradient.addColorStop(0.7, colors.secondary);
        gradient.addColorStop(1, `${colors.secondary}80`);

        // Apply glow for high values
        if (value > 0.5) {
            this.applyGlow(color, 10 + value * 15);
        }

        // Draw rounded bar
        const radius = Math.min(barWidth / 2, 4);
        this.ctx.beginPath();
        this.ctx.moveTo(x + radius, y);
        this.ctx.lineTo(x + barWidth - radius, y);
        this.ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
        this.ctx.lineTo(x + barWidth, baseY);
        this.ctx.lineTo(x, baseY);
        this.ctx.lineTo(x, y + radius);
        this.ctx.quadraticCurveTo(x, y, x + radius, y);
        this.ctx.closePath();

        this.ctx.fillStyle = gradient;
        this.ctx.fill();

        // Highlight on left edge
        this.ctx.beginPath();
        this.ctx.moveTo(x + 1, y + radius);
        this.ctx.lineTo(x + 1, baseY);
        this.ctx.strokeStyle = `${colors.tertiary}60`;
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

        // Top cap glow
        if (value > 0.4) {
            const capGradient = this.ctx.createLinearGradient(x, y, x, y + 10);
            capGradient.addColorStop(0, colors.tertiary);
            capGradient.addColorStop(1, "transparent");

            this.ctx.fillStyle = capGradient;
            this.ctx.fillRect(x, y, barWidth, Math.min(10, height));
        }

        this.resetGlow();
    }

    drawPeakIndicator(x, barWidth, baseY, maxHeight, index, colors) {
        const peakY = baseY - (this.peakData[index] / 255) * maxHeight;
        const value = this.peakData[index] / 255;

        if (value < 0.05) return;

        // Glowing peak line
        const peakGradient = this.ctx.createLinearGradient(
            x,
            peakY - 2,
            x,
            peakY + 2,
        );
        peakGradient.addColorStop(0, "transparent");
        peakGradient.addColorStop(0.5, colors.tertiary);
        peakGradient.addColorStop(1, "transparent");

        this.ctx.fillStyle = peakGradient;
        this.ctx.fillRect(x - 1, peakY - 2, barWidth + 2, 4);

        // Peak dot
        this.ctx.beginPath();
        this.ctx.arc(x + barWidth / 2, peakY, 2, 0, Math.PI * 2);
        this.ctx.fillStyle = colors.tertiary;
        this.ctx.fill();
    }

    drawMirrorBar(x, barWidth, height, baseY, value, colors, position) {
        const mirrorHeight = height * 0.4;

        this.ctx.save();
        this.ctx.globalAlpha = 0.25;

        const gradient = this.ctx.createLinearGradient(
            x,
            baseY,
            x,
            baseY + mirrorHeight,
        );
        gradient.addColorStop(0, this.getSpectrumColor(position));
        gradient.addColorStop(0.3, `${colors.secondary}40`);
        gradient.addColorStop(1, "transparent");

        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(x, baseY + 2, barWidth, mirrorHeight);

        this.ctx.restore();
    }

    spawnParticle(x, y, colors, intensity) {
        this.particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 3,
            vy: -Math.random() * 4 * intensity - 2,
            life: 1,
            size: 1.5 + Math.random() * 2,
            color: colors.gradient[
                Math.floor(Math.random() * colors.gradient.length)
            ],
        });
    }

    updateParticles(deltaTime) {
        const gravity = 0.15;

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            p.vy += gravity;
            p.x += p.vx * this.settings.animationSpeed;
            p.y += p.vy * this.settings.animationSpeed;
            p.life -= 0.02;

            if (p.life <= 0 || p.y > this.height) {
                this.particles.splice(i, 1);
                continue;
            }

            // Draw particle with trail
            const alpha = Math.floor(p.life * 255)
                .toString(16)
                .padStart(2, "0");

            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            this.ctx.fillStyle = `${p.color}${alpha}`;
            this.ctx.fill();
        }

        // Limit particles
        if (this.particles.length > 100) {
            this.particles.splice(0, this.particles.length - 100);
        }
    }

    drawFrequencyLabels(startX, baseY, totalWidth, barCount, colors) {
        this.ctx.font = "10px -apple-system, BlinkMacSystemFont, sans-serif";
        this.ctx.textAlign = "center";
        this.ctx.fillStyle = `${colors.primary}60`;

        const labels = [
            "20",
            "50",
            "100",
            "200",
            "500",
            "1k",
            "2k",
            "5k",
            "10k",
            "20k",
        ];
        const positions = [0, 0.05, 0.1, 0.15, 0.25, 0.35, 0.5, 0.65, 0.8, 1];

        for (let i = 0; i < labels.length; i++) {
            const x = startX + positions[i] * totalWidth;
            this.ctx.fillText(labels[i], x, baseY + 18);
        }

        // Hz label
        this.ctx.fillStyle = `${colors.primary}40`;
        this.ctx.font = "8px -apple-system, BlinkMacSystemFont, sans-serif";
        this.ctx.fillText("Hz", startX + totalWidth + 15, baseY + 18);
    }

    drawLevelIndicator(colors, avg, bass) {
        const x = 20;
        const y = 30;
        const width = 4;
        const height = 100;

        // Background
        this.ctx.fillStyle = `${colors.primary}20`;
        this.ctx.fillRect(x, y, width, height);

        // Level fill
        const levelHeight = avg * height;
        const gradient = this.ctx.createLinearGradient(
            x,
            y + height,
            x,
            y + height - levelHeight,
        );
        gradient.addColorStop(0, colors.secondary);
        gradient.addColorStop(0.5, colors.primary);
        gradient.addColorStop(1, colors.tertiary);

        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(x, y + height - levelHeight, width, levelHeight);

        // Peak marker
        const peakY = y + height - avg * height;
        this.ctx.fillStyle = colors.tertiary;
        this.ctx.fillRect(x - 2, peakY - 1, width + 4, 2);

        // Labels
        this.ctx.font = "8px -apple-system, BlinkMacSystemFont, sans-serif";
        this.ctx.fillStyle = `${colors.primary}60`;
        this.ctx.textAlign = "left";
        this.ctx.fillText("dB", x + 8, y + 8);
        this.ctx.fillText("0", x + 8, y + height);
    }
}

// Export
if (typeof module !== "undefined" && module.exports) {
    module.exports = BarsVisualizer;
}
