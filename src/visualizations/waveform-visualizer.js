/**
 * Waveform Visualizer
 * Displays audio waveform with smooth curves
 */

class WaveformVisualizer extends BaseVisualizer {
    constructor(canvas, audioProcessor) {
        super(canvas, audioProcessor);
        this.historyLength = 5;
        this.waveHistory = [];
        this.phase = 0;
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

        const timeDomainData = this.audioProcessor.getTimeDomainData();
        const frequencyData = this.audioProcessor.getFrequencyData();
        const colors = this.getColors();

        // Update phase for animation
        this.phase += deltaTime * Math.PI * 0.5 * this.settings.animationSpeed;

        // Get average for intensity
        const avg = this.audioProcessor.getAverageFrequency() / 255 || 0;

        // Store waveform history for trailing effect
        this.waveHistory.unshift([...timeDomainData]);
        if (this.waveHistory.length > this.historyLength) {
            this.waveHistory.pop();
        }

        // Draw historical waves with fade
        for (let h = this.waveHistory.length - 1; h >= 0; h--) {
            const alpha = 1 - h / this.waveHistory.length;
            const waveData = this.waveHistory[h];

            this.drawWave(waveData, alpha * 0.5, h * 2, colors, "bottom");
        }

        // Draw main waveform
        this.drawMainWaveform(timeDomainData, colors, avg);

        // Draw frequency-based decorations
        this.drawFrequencyDecorations(frequencyData, colors, avg);

        // Mirror effect
        if (this.settings.mirrorEffect) {
            this.drawMirroredWaveform(timeDomainData, colors, avg);
        }
    }

    drawWave(data, alpha, offset, colors, position) {
        const sliceWidth = this.width / data.length;

        this.ctx.beginPath();
        this.ctx.globalAlpha = alpha;
        this.ctx.strokeStyle = colors.primary;
        this.ctx.lineWidth = 2;

        const baseY =
            position === "bottom"
                ? this.centerY + offset
                : this.centerY - offset;

        for (let i = 0; i < data.length; i++) {
            const v = data[i] / 128.0;
            const y = baseY + (v - 1) * (this.height * 0.25);
            const x = i * sliceWidth;

            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }

        this.ctx.stroke();
        this.ctx.globalAlpha = 1;
    }

    drawMainWaveform(data, colors, intensity) {
        const sliceWidth = this.width / data.length;
        const gradient = this.createGradient(0, 0, this.width, 0);

        // Draw filled area
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.centerY);

        for (let i = 0; i < data.length; i++) {
            const v = data[i] / 128.0;
            const y = this.centerY + (v - 1) * (this.height * 0.35);
            const x = i * sliceWidth;
            this.ctx.lineTo(x, y);
        }

        this.ctx.lineTo(this.width, this.centerY);
        this.ctx.closePath();

        // Fill with gradient
        const fillGradient = this.ctx.createLinearGradient(
            0,
            this.centerY - this.height * 0.35,
            0,
            this.centerY + this.height * 0.35,
        );
        fillGradient.addColorStop(0, `${colors.primary}33`);
        fillGradient.addColorStop(0.5, `${colors.secondary}55`);
        fillGradient.addColorStop(1, `${colors.tertiary}33`);

        this.ctx.fillStyle = fillGradient;
        this.ctx.fill();

        // Draw stroke
        this.applyGlow(colors.primary, 15 + intensity * 20);
        this.ctx.beginPath();

        for (let i = 0; i < data.length; i++) {
            const v = data[i] / 128.0;
            const y = this.centerY + (v - 1) * (this.height * 0.35);
            const x = i * sliceWidth;

            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                // Use smooth curves
                const prevV = data[i - 1] / 128.0;
                const prevY = this.centerY + (prevV - 1) * (this.height * 0.35);
                const prevX = (i - 1) * sliceWidth;
                const cpX = (prevX + x) / 2;
                this.ctx.quadraticCurveTo(prevX, prevY, cpX, (prevY + y) / 2);
            }
        }

        this.ctx.strokeStyle = gradient;
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
        this.resetGlow();
    }

    drawMirroredWaveform(data, colors, intensity) {
        const sliceWidth = this.width / data.length;

        this.ctx.globalAlpha = 0.3;
        this.ctx.beginPath();

        for (let i = 0; i < data.length; i++) {
            const v = data[i] / 128.0;
            const y = this.centerY - (v - 1) * (this.height * 0.35);
            const x = i * sliceWidth;

            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }

        this.ctx.strokeStyle = colors.secondary;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        this.ctx.globalAlpha = 1;
    }

    drawFrequencyDecorations(data, colors, intensity) {
        // Draw subtle frequency bars at the bottom
        const barCount = 32;
        const barWidth = this.width / barCount;
        const maxHeight = 30;
        const clampedSensitivity = this.clamp(
            this.settings.sensitivity,
            0.1,
            3.0,
        );

        const samplesPerBar = Math.floor(data.length / barCount);

        for (let i = 0; i < barCount; i++) {
            let sum = 0;
            for (let j = 0; j < samplesPerBar; j++) {
                sum += data[i * samplesPerBar + j] || 0;
            }
            const avg = sum / samplesPerBar;
            // Clamp height to prevent out-of-bounds drawing
            const height = Math.min(
                (avg / 255) * maxHeight * clampedSensitivity,
                maxHeight * 2,
            );

            const alpha = this.clamp(0.3 + (avg / 255) * 0.4, 0, 1);
            this.ctx.fillStyle = `${colors.tertiary}${Math.floor(alpha * 255)
                .toString(16)
                .padStart(2, "0")}`;
            this.ctx.fillRect(
                i * barWidth,
                this.height - height,
                barWidth - 1,
                height,
            );

            // Top decorations
            this.ctx.fillRect(i * barWidth, 0, barWidth - 1, height * 0.5);
        }
    }
}

// Export
if (typeof module !== "undefined" && module.exports) {
    module.exports = WaveformVisualizer;
}
