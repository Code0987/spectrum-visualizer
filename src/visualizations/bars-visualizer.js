/**
 * Bars Visualizer
 * Classic spectrum analyzer with vertical bars
 */

class BarsVisualizer extends BaseVisualizer {
    constructor(canvas, audioProcessor) {
        super(canvas, audioProcessor);
        this.smoothedData = [];
        this.peakData = [];
    }

    draw(deltaTime) {
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

        const data = this.getProcessedData();
        if (!data || data.length === 0) return;

        const colors = this.getColors();
        const barCount = data.length;

        // Initialize arrays
        if (this.smoothedData.length !== barCount) {
            this.smoothedData = new Array(barCount).fill(0);
            this.peakData = new Array(barCount).fill(0);
        }

        // Smooth data and update peaks
        for (let i = 0; i < barCount; i++) {
            this.smoothedData[i] += (data[i] - this.smoothedData[i]) * 0.3;
            if (this.smoothedData[i] > this.peakData[i]) {
                this.peakData[i] = this.smoothedData[i];
            } else {
                this.peakData[i] *= 0.98;
            }
        }

        const totalWidth = this.width * 0.9;
        const spacing = this.settings.barSpacing;
        const barWidth = Math.max(
            1,
            (totalWidth - (barCount - 1) * spacing) / barCount,
        );
        const startX = (this.width - totalWidth) / 2;
        const maxHeight = this.height * 0.8;
        const baseY = this.height * 0.9;

        // Calculate average for single glow application (more efficient)
        const avgValue =
            this.smoothedData.reduce((a, b) => a + b, 0) /
            this.smoothedData.length /
            255;
        if (avgValue > 0.3 && this.settings.glowEffect) {
            this.applyGlow(colors.primary, Math.min(avgValue * 15, 30));
        }

        // Draw bars
        for (let i = 0; i < barCount; i++) {
            const value = this.clamp(this.smoothedData[i] / 255, 0, 1);
            // Clamp height to prevent out-of-bounds drawing
            const height = Math.min(value * maxHeight, maxHeight);
            const x = startX + i * (barWidth + spacing);
            const y = baseY - height;

            // Color gradient
            const gradient = this.ctx.createLinearGradient(x, y, x, baseY);
            gradient.addColorStop(0, colors.primary);
            gradient.addColorStop(0.5, colors.secondary);
            gradient.addColorStop(1, colors.tertiary);

            // Draw bar
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(x, y, barWidth, height);

            // Peak indicator - clamp peak position
            const peakValue = this.clamp(this.peakData[i] / 255, 0, 1);
            const peakY = baseY - peakValue * maxHeight;
            this.ctx.fillStyle = colors.primary;
            this.ctx.fillRect(x, peakY - 2, barWidth, 2);

            // Mirror effect
            if (this.settings.mirrorEffect) {
                this.ctx.globalAlpha = 0.3;
                const mirrorHeight = Math.min(
                    height * 0.4,
                    this.height - baseY,
                );
                const mirrorGradient = this.ctx.createLinearGradient(
                    x,
                    baseY,
                    x,
                    baseY + mirrorHeight,
                );
                mirrorGradient.addColorStop(0, colors.primary);
                mirrorGradient.addColorStop(1, "transparent");
                this.ctx.fillStyle = mirrorGradient;
                this.ctx.fillRect(x, baseY, barWidth, mirrorHeight);
                this.ctx.globalAlpha = 1;
            }
        }

        this.resetGlow();

        // Floor line
        this.ctx.strokeStyle = `${colors.primary}40`;
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(startX, baseY);
        this.ctx.lineTo(startX + totalWidth, baseY);
        this.ctx.stroke();
    }
}

// Export
if (typeof module !== "undefined" && module.exports) {
    module.exports = BarsVisualizer;
}
