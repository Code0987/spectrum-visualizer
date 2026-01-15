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
        if (!this.width || !this.height) {
            this.handleResize();
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

        // Draw bars
        for (let i = 0; i < barCount; i++) {
            const value = this.smoothedData[i] / 255;
            const height = value * maxHeight;
            const x = startX + i * (barWidth + spacing);
            const y = baseY - height;

            // Color gradient
            const gradient = this.ctx.createLinearGradient(x, y, x, baseY);
            gradient.addColorStop(0, colors.primary);
            gradient.addColorStop(0.5, colors.secondary);
            gradient.addColorStop(1, colors.tertiary);

            // Glow for high values
            if (value > 0.5 && this.settings.glowEffect) {
                this.applyGlow(colors.primary, value * 15);
            }

            // Draw bar
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(x, y, barWidth, height);

            // Peak indicator
            const peakY = baseY - (this.peakData[i] / 255) * maxHeight;
            this.ctx.fillStyle = colors.primary;
            this.ctx.fillRect(x, peakY - 2, barWidth, 2);

            // Mirror effect
            if (this.settings.mirrorEffect) {
                this.ctx.globalAlpha = 0.3;
                const mirrorGradient = this.ctx.createLinearGradient(
                    x,
                    baseY,
                    x,
                    baseY + height * 0.4,
                );
                mirrorGradient.addColorStop(0, colors.primary);
                mirrorGradient.addColorStop(1, "transparent");
                this.ctx.fillStyle = mirrorGradient;
                this.ctx.fillRect(x, baseY, barWidth, height * 0.4);
                this.ctx.globalAlpha = 1;
            }

            this.resetGlow();
        }

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
