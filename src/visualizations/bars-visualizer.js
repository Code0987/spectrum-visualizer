/**
 * Bars Visualizer
 * Classic spectrum analyzer with vertical bars
 */

class BarsVisualizer extends BaseVisualizer {
  constructor(canvas, audioProcessor) {
    super(canvas, audioProcessor);
    this.smoothedData = [];
    this.peakData = [];
    this.peakDecay = 0.99;
    this.smoothingFactor = 0.3;
  }

  draw(deltaTime) {
    const data = this.getProcessedData();
    const colors = this.getColors();
    const barCount = data.length;

    // Initialize arrays if needed
    if (this.smoothedData.length !== barCount) {
      this.smoothedData = new Array(barCount).fill(0);
      this.peakData = new Array(barCount).fill(0);
    }

    // Smooth data and update peaks
    for (let i = 0; i < barCount; i++) {
      this.smoothedData[i] += (data[i] - this.smoothedData[i]) * this.smoothingFactor;
      if (this.smoothedData[i] > this.peakData[i]) {
        this.peakData[i] = this.smoothedData[i];
      } else {
        this.peakData[i] *= this.peakDecay;
      }
    }

    const totalWidth = this.width * 0.9;
    const barWidth = (totalWidth - (barCount - 1) * this.settings.barSpacing) / barCount;
    const startX = (this.width - totalWidth) / 2;
    const maxHeight = this.height * 0.8;
    const baseY = this.height * 0.9;

    // Draw bars
    for (let i = 0; i < barCount; i++) {
      const value = this.smoothedData[i] / 255;
      const height = value * maxHeight;
      const x = startX + i * (barWidth + this.settings.barSpacing);
      const y = baseY - height;

      // Color based on position
      const colorPosition = i / barCount;
      const barColor = this.getSpectrumColor(colorPosition);

      // Gradient for bar
      const gradient = this.ctx.createLinearGradient(x, y, x, baseY);
      gradient.addColorStop(0, colors.primary);
      gradient.addColorStop(0.5, colors.secondary);
      gradient.addColorStop(1, colors.tertiary);

      // Apply glow
      this.applyGlow(barColor, 15 * value);

      // Draw main bar
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();

      // Rounded top
      const radius = Math.min(barWidth / 2, 5);
      this.ctx.moveTo(x + radius, y);
      this.ctx.lineTo(x + barWidth - radius, y);
      this.ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
      this.ctx.lineTo(x + barWidth, baseY);
      this.ctx.lineTo(x, baseY);
      this.ctx.lineTo(x, y + radius);
      this.ctx.quadraticCurveTo(x, y, x + radius, y);
      this.ctx.fill();

      // Draw peak
      const peakY = baseY - (this.peakData[i] / 255) * maxHeight;
      this.ctx.fillStyle = colors.primary;
      this.ctx.fillRect(x, peakY - 3, barWidth, 3);

      // Mirror effect
      if (this.settings.mirrorEffect) {
        this.ctx.globalAlpha = 0.3;
        this.ctx.save();
        this.ctx.scale(1, -1);
        this.ctx.translate(0, -(baseY * 2));

        const mirrorGradient = this.ctx.createLinearGradient(x, baseY, x, baseY + height * 0.5);
        mirrorGradient.addColorStop(0, colors.primary);
        mirrorGradient.addColorStop(1, 'transparent');

        this.ctx.fillStyle = mirrorGradient;
        this.ctx.fillRect(x, baseY, barWidth, height * 0.5);

        this.ctx.restore();
        this.ctx.globalAlpha = 1;
      }
    }

    this.resetGlow();

    // Draw frequency labels
    this.drawFrequencyLabels(startX, baseY, totalWidth, barCount);
  }

  drawFrequencyLabels(startX, baseY, totalWidth, barCount) {
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.font = '10px sans-serif';
    this.ctx.textAlign = 'center';

    const labels = ['20Hz', '100Hz', '500Hz', '1kHz', '5kHz', '10kHz', '20kHz'];
    const labelPositions = [0, 0.1, 0.25, 0.4, 0.6, 0.8, 1];

    for (let i = 0; i < labels.length; i++) {
      const x = startX + labelPositions[i] * totalWidth;
      this.ctx.fillText(labels[i], x, baseY + 20);
    }
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BarsVisualizer;
}
