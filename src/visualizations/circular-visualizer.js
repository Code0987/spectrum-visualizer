/**
 * Circular Visualizer
 * Radial frequency visualization with rotating elements
 */

class CircularVisualizer extends BaseVisualizer {
  constructor(canvas, audioProcessor) {
    super(canvas, audioProcessor);
    this.rotation = 0;
    this.smoothedData = [];
    this.particles = [];
    this.innerRingData = [];
  }

  draw(deltaTime) {
    const data = this.getProcessedData(128);
    const colors = this.getColors();
    const avg = this.audioProcessor.getAverageFrequency() / 255;
    const bands = this.audioProcessor.getFrequencyBands();

    // Update rotation
    this.rotation += deltaTime * 0.5 * this.settings.animationSpeed * (0.5 + avg);

    // Initialize smoothed data
    if (this.smoothedData.length !== data.length) {
      this.smoothedData = new Array(data.length).fill(0);
      this.innerRingData = new Array(data.length).fill(0);
    }

    // Smooth data
    for (let i = 0; i < data.length; i++) {
      this.smoothedData[i] += (data[i] - this.smoothedData[i]) * 0.2;
      this.innerRingData[i] += (data[i] - this.innerRingData[i]) * 0.1;
    }

    // Draw background rings
    this.drawBackgroundRings(colors, avg);

    // Draw outer ring
    this.drawOuterRing(data, colors, avg);

    // Draw main circular bars
    this.drawCircularBars(this.smoothedData, colors, avg);

    // Draw inner ring
    this.drawInnerRing(this.innerRingData, colors, avg);

    // Draw center
    this.drawCenter(colors, avg, bands);

    // Mirror effect - draw second ring
    if (this.settings.mirrorEffect) {
      this.drawMirroredRing(this.smoothedData, colors, avg);
    }

    // Draw decorative particles
    this.updateAndDrawParticles(colors, avg);
  }

  drawBackgroundRings(colors, intensity) {
    const ringCount = 4;
    const maxRadius = Math.min(this.width, this.height) * 0.45;

    for (let i = 0; i < ringCount; i++) {
      const radius = maxRadius * (0.3 + (i / ringCount) * 0.7);
      const alpha = 0.05 + intensity * 0.05;

      this.ctx.beginPath();
      this.ctx.arc(this.centerX, this.centerY, radius, 0, Math.PI * 2);
      this.ctx.strokeStyle = `${colors.primary}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    }
  }

  drawOuterRing(data, colors, intensity) {
    const radius = Math.min(this.width, this.height) * 0.42;
    const barCount = data.length;

    this.ctx.save();
    this.ctx.translate(this.centerX, this.centerY);
    this.ctx.rotate(this.rotation * 0.3);

    for (let i = 0; i < barCount; i++) {
      const angle = (i / barCount) * Math.PI * 2;
      const value = data[i] / 255;
      const barLength = value * 20;

      this.ctx.beginPath();
      this.ctx.moveTo(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius
      );
      this.ctx.lineTo(
        Math.cos(angle) * (radius + barLength),
        Math.sin(angle) * (radius + barLength)
      );

      this.ctx.strokeStyle = `${colors.tertiary}${Math.floor((0.3 + value * 0.7) * 255).toString(16).padStart(2, '0')}`;
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  drawCircularBars(data, colors, intensity) {
    const innerRadius = Math.min(this.width, this.height) * 0.15;
    const maxBarLength = Math.min(this.width, this.height) * 0.25;
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
      gradient.addColorStop(0.5, colors.secondary);
      gradient.addColorStop(1, colors.tertiary);

      this.applyGlow(colors.primary, 10 + value * 15);

      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.strokeStyle = gradient;
      this.ctx.lineWidth = Math.max(2, 360 / barCount * 0.6);
      this.ctx.lineCap = 'round';
      this.ctx.stroke();
    }

    this.ctx.restore();
    this.resetGlow();
  }

  drawInnerRing(data, colors, intensity) {
    const radius = Math.min(this.width, this.height) * 0.12;
    const barCount = data.length;

    this.ctx.save();
    this.ctx.translate(this.centerX, this.centerY);
    this.ctx.rotate(-this.rotation * 0.5);

    this.ctx.beginPath();

    for (let i = 0; i <= barCount; i++) {
      const angle = (i / barCount) * Math.PI * 2;
      const value = data[i % barCount] / 255;
      const r = radius + value * 20;

      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;

      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }

    this.ctx.closePath();
    this.ctx.strokeStyle = colors.secondary;
    this.ctx.lineWidth = 2;
    this.applyGlow(colors.secondary, 10);
    this.ctx.stroke();

    // Fill with gradient
    const fillGradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, radius + 20);
    fillGradient.addColorStop(0, `${colors.primary}00`);
    fillGradient.addColorStop(1, `${colors.secondary}22`);
    this.ctx.fillStyle = fillGradient;
    this.ctx.fill();

    this.ctx.restore();
    this.resetGlow();
  }

  drawCenter(colors, intensity, bands) {
    const maxRadius = Math.min(this.width, this.height) * 0.08;
    const radius = maxRadius * (0.6 + intensity * 0.4);

    // Pulsing center circle
    const gradient = this.ctx.createRadialGradient(
      this.centerX, this.centerY, 0,
      this.centerX, this.centerY, radius
    );
    gradient.addColorStop(0, colors.primary);
    gradient.addColorStop(0.5, colors.secondary);
    gradient.addColorStop(1, 'transparent');

    this.applyGlow(colors.primary, 30 * intensity);

    this.ctx.beginPath();
    this.ctx.arc(this.centerX, this.centerY, radius, 0, Math.PI * 2);
    this.ctx.fillStyle = gradient;
    this.ctx.fill();

    // Inner core
    this.ctx.beginPath();
    this.ctx.arc(this.centerX, this.centerY, radius * 0.3, 0, Math.PI * 2);
    this.ctx.fillStyle = colors.tertiary;
    this.ctx.fill();

    this.resetGlow();
  }

  drawMirroredRing(data, colors, intensity) {
    const innerRadius = Math.min(this.width, this.height) * 0.15;
    const maxBarLength = Math.min(this.width, this.height) * 0.12;
    const barCount = data.length;

    this.ctx.save();
    this.ctx.translate(this.centerX, this.centerY);
    this.ctx.rotate(-this.rotation);
    this.ctx.globalAlpha = 0.5;

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
      this.ctx.lineWidth = Math.max(2, 360 / barCount * 0.6);
      this.ctx.lineCap = 'round';
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  updateAndDrawParticles(colors, intensity) {
    // Spawn new particles
    if (intensity > 0.5 && Math.random() < intensity * 0.3) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.min(this.width, this.height) * 0.15;
      this.particles.push({
        x: this.centerX + Math.cos(angle) * radius,
        y: this.centerY + Math.sin(angle) * radius,
        vx: Math.cos(angle) * (1 + intensity * 3),
        vy: Math.sin(angle) * (1 + intensity * 3),
        life: 1,
        size: 2 + Math.random() * 3,
        color: colors.gradient[Math.floor(Math.random() * colors.gradient.length)]
      });
    }

    // Limit particles
    if (this.particles.length > 100) {
      this.particles.splice(0, this.particles.length - 100);
    }

    // Update and draw particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.02;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      this.ctx.fillStyle = `${p.color}${Math.floor(p.life * 255).toString(16).padStart(2, '0')}`;
      this.ctx.fill();
    }
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CircularVisualizer;
}
