/**
 * Psychedelic Visualizer
 * Trippy, colorful patterns with mandala effects
 */

class PsychedelicVisualizer extends BaseVisualizer {
  constructor(canvas, audioProcessor) {
    super(canvas, audioProcessor);
    this.hueOffset = 0;
    this.kaleidoscopeAngle = 0;
    this.layers = [];
    this.spiralAngle = 0;
    this.tunnelPhase = 0;
    this.initLayers();
  }

  initLayers() {
    this.layers = [];
    for (let i = 0; i < 5; i++) {
      this.layers.push({
        rotation: Math.random() * Math.PI * 2,
        scale: 0.5 + Math.random() * 0.5,
        hueShift: Math.random() * 360,
        segments: 6 + Math.floor(Math.random() * 6),
        type: ['mandala', 'spiral', 'tunnel', 'wave'][Math.floor(Math.random() * 4)]
      });
    }
  }

  draw(deltaTime) {
    const frequencyData = this.audioProcessor.getFrequencyData();
    const timeDomainData = this.audioProcessor.getTimeDomainData();
    const bands = this.audioProcessor.getFrequencyBands();
    const colors = this.getColors();
    const avg = this.audioProcessor.getAverageFrequency() / 255;

    const speed = this.settings.animationSpeed;

    // Update animation values
    this.hueOffset += deltaTime * 30 * speed * (0.5 + avg);
    this.kaleidoscopeAngle += deltaTime * 0.3 * speed;
    this.spiralAngle += deltaTime * speed * (1 + avg);
    this.tunnelPhase += deltaTime * 2 * speed;

    // Draw psychedelic background
    this.drawBackground(colors, avg);

    // Draw tunnel effect
    this.drawTunnel(frequencyData, colors, avg);

    // Draw mandala patterns
    this.drawMandala(frequencyData, colors, bands);

    // Draw spiral waves
    this.drawSpiralWaves(frequencyData, colors, avg);

    // Draw kaleidoscope overlay
    this.drawKaleidoscope(timeDomainData, colors, avg);

    // Draw pulsing rings
    this.drawPulsingRings(bands, colors);

    // Apply color shift overlay
    this.applyColorShift(avg);
  }

  drawBackground(colors, intensity) {
    // Animated gradient background
    const time = this.time;

    for (let i = 0; i < 3; i++) {
      const x = this.centerX + Math.sin(time * 0.5 + i * 2) * this.width * 0.3;
      const y = this.centerY + Math.cos(time * 0.3 + i * 2) * this.height * 0.3;
      const radius = Math.max(this.width, this.height) * (0.3 + intensity * 0.2);

      const hue = (this.hueOffset + i * 120) % 360;
      const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, `hsla(${hue}, 100%, 50%, ${0.15 + intensity * 0.1})`);
      gradient.addColorStop(0.5, `hsla(${(hue + 60) % 360}, 100%, 50%, ${0.05 + intensity * 0.05})`);
      gradient.addColorStop(1, 'transparent');

      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(0, 0, this.width, this.height);
    }
  }

  drawTunnel(data, colors, intensity) {
    const ringCount = 15;
    const maxRadius = Math.min(this.width, this.height) * 0.6;

    this.ctx.save();
    this.ctx.translate(this.centerX, this.centerY);

    for (let i = ringCount - 1; i >= 0; i--) {
      const progress = (i + this.tunnelPhase) % ringCount;
      const t = progress / ringCount;
      const radius = t * maxRadius;

      if (radius < 10) continue;

      const dataIndex = Math.floor(t * data.length);
      const audioValue = (data[dataIndex] || 128) / 255;

      const hue = (this.hueOffset + i * 25) % 360;
      const alpha = (1 - t) * (0.3 + audioValue * 0.3);

      this.ctx.beginPath();

      const segments = 12;
      for (let j = 0; j <= segments; j++) {
        const angle = (j / segments) * Math.PI * 2 + this.kaleidoscopeAngle;
        const wobble = Math.sin(angle * 6 + this.time * 3) * audioValue * 20;
        const r = radius + wobble;

        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;

        if (j === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
      }

      this.ctx.closePath();
      this.ctx.strokeStyle = `hsla(${hue}, 100%, 60%, ${alpha})`;
      this.ctx.lineWidth = 2 + audioValue * 3;
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  drawMandala(data, colors, bands) {
    const segments = 12;
    const layers = 5;
    const maxRadius = Math.min(this.width, this.height) * 0.35;

    this.ctx.save();
    this.ctx.translate(this.centerX, this.centerY);
    this.ctx.rotate(this.kaleidoscopeAngle * 0.5);

    for (let layer = 0; layer < layers; layer++) {
      const layerRadius = maxRadius * ((layer + 1) / layers);
      const layerData = [];

      // Sample audio data for this layer
      for (let i = 0; i < segments; i++) {
        const dataIndex = Math.floor((i / segments) * data.length * 0.5 + layer * 20);
        layerData.push((data[dataIndex] || 0) / 255);
      }

      this.ctx.beginPath();

      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const audioMod = layerData[i % segments];
        const radius = layerRadius * (0.8 + audioMod * 0.4);

        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        if (i === 0) {
          this.ctx.moveTo(x, y);
        } else {
          // Curved segments
          const prevAngle = ((i - 1) / segments) * Math.PI * 2;
          const cpAngle = (angle + prevAngle) / 2;
          const cpRadius = layerRadius * (1 + audioMod * 0.2);
          const cpX = Math.cos(cpAngle) * cpRadius;
          const cpY = Math.sin(cpAngle) * cpRadius;
          this.ctx.quadraticCurveTo(cpX, cpY, x, y);
        }
      }

      this.ctx.closePath();

      const hue = (this.hueOffset + layer * 60) % 360;
      const avgAudio = layerData.reduce((a, b) => a + b, 0) / layerData.length;

      // Fill with gradient
      const fillGradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, layerRadius);
      fillGradient.addColorStop(0, `hsla(${hue}, 100%, 50%, 0)`);
      fillGradient.addColorStop(0.8, `hsla(${hue}, 100%, 50%, ${avgAudio * 0.2})`);
      fillGradient.addColorStop(1, `hsla(${hue}, 100%, 50%, 0)`);

      this.ctx.fillStyle = fillGradient;
      this.ctx.fill();

      // Stroke
      this.ctx.strokeStyle = `hsla(${hue}, 100%, 70%, ${0.5 + avgAudio * 0.5})`;
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  drawSpiralWaves(data, colors, intensity) {
    const spirals = 3;

    this.ctx.save();
    this.ctx.translate(this.centerX, this.centerY);

    for (let s = 0; s < spirals; s++) {
      this.ctx.rotate((Math.PI * 2 / spirals));

      this.ctx.beginPath();

      const points = 100;
      for (let i = 0; i < points; i++) {
        const t = i / points;
        const angle = this.spiralAngle + t * Math.PI * 4 + s;
        const radiusBase = t * Math.min(this.width, this.height) * 0.4;

        const dataIndex = Math.floor(t * data.length);
        const audioMod = (data[dataIndex] || 0) / 255;
        const radius = radiusBase + audioMod * 30;

        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        if (i === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
      }

      const hue = (this.hueOffset + s * 120) % 360;
      this.ctx.strokeStyle = `hsla(${hue}, 100%, 60%, ${0.3 + intensity * 0.4})`;
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  drawKaleidoscope(data, colors, intensity) {
    if (intensity < 0.3) return;

    const segments = 8;
    const sliceAngle = (Math.PI * 2) / segments;

    this.ctx.save();
    this.ctx.translate(this.centerX, this.centerY);
    this.ctx.rotate(this.kaleidoscopeAngle);

    for (let i = 0; i < segments; i++) {
      this.ctx.save();
      this.ctx.rotate(sliceAngle * i);

      if (i % 2 === 1) {
        this.ctx.scale(1, -1);
      }

      // Draw slice content
      this.ctx.beginPath();
      this.ctx.moveTo(0, 0);

      const radius = Math.min(this.width, this.height) * 0.4;

      for (let j = 0; j <= 20; j++) {
        const t = j / 20;
        const angle = t * sliceAngle;
        const dataIndex = Math.floor(t * data.length);
        const audioMod = (data[dataIndex] - 128) / 128;
        const r = radius * (0.8 + audioMod * 0.2 * intensity);

        this.ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
      }

      this.ctx.closePath();

      const hue = (this.hueOffset + i * 45) % 360;
      this.ctx.fillStyle = `hsla(${hue}, 80%, 50%, ${intensity * 0.1})`;
      this.ctx.fill();

      this.ctx.restore();
    }

    this.ctx.restore();
  }

  drawPulsingRings(bands, colors) {
    const ringCount = 5;
    const maxRadius = Math.min(this.width, this.height) * 0.45;
    const bassNorm = bands.bass / 255;
    const midNorm = bands.mid / 255;

    this.ctx.save();
    this.ctx.translate(this.centerX, this.centerY);

    for (let i = 0; i < ringCount; i++) {
      const baseRadius = (i + 1) / ringCount * maxRadius;
      const pulseAmount = (i % 2 === 0 ? bassNorm : midNorm) * 20;
      const radius = baseRadius + Math.sin(this.time * 2 + i) * pulseAmount;

      const hue = (this.hueOffset + i * 72) % 360;
      const alpha = 0.3 + (1 - i / ringCount) * 0.3;

      this.applyGlow(`hsl(${hue}, 100%, 50%)`, 10 + bassNorm * 15);

      this.ctx.beginPath();
      this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
      this.ctx.strokeStyle = `hsla(${hue}, 100%, 60%, ${alpha})`;
      this.ctx.lineWidth = 2 + bassNorm * 3;
      this.ctx.stroke();
    }

    this.ctx.restore();
    this.resetGlow();
  }

  applyColorShift(intensity) {
    // Subtle color overlay that shifts with time
    const hue = this.hueOffset % 360;

    this.ctx.globalCompositeOperation = 'overlay';
    this.ctx.fillStyle = `hsla(${hue}, 100%, 50%, ${intensity * 0.05})`;
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.ctx.globalCompositeOperation = 'source-over';
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PsychedelicVisualizer;
}
