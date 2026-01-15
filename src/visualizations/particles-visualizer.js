/**
 * Particles Visualizer
 * Dynamic particle system driven by audio
 */

class ParticlesVisualizer extends BaseVisualizer {
  constructor(canvas, audioProcessor) {
    super(canvas, audioProcessor);
    this.particles = [];
    this.maxParticles = 500;
    this.emitters = [];
    this.gravityWells = [];
    this.lastBassHit = 0;
    this.bassThreshold = 180;
  }

  draw(deltaTime) {
    const frequencyData = this.audioProcessor.getFrequencyData();
    const bands = this.audioProcessor.getFrequencyBands();
    const colors = this.getColors();
    const avg = this.audioProcessor.getAverageFrequency() / 255;

    // Detect bass hits for explosions
    const currentBass = bands.bass;
    const isBassHit = currentBass > this.bassThreshold && this.time - this.lastBassHit > 0.15;
    if (isBassHit) {
      this.lastBassHit = this.time;
      this.createExplosion(colors, currentBass / 255);
    }

    // Spawn particles based on frequency bands
    this.spawnParticles(bands, colors, deltaTime);

    // Update gravity wells
    this.updateGravityWells(bands);

    // Update and draw particles
    this.updateParticles(deltaTime, colors);
    this.drawParticles(colors);

    // Draw frequency visualization at bottom
    this.drawFrequencyBars(frequencyData, colors);

    // Draw connecting lines between close particles
    if (avg > 0.3) {
      this.drawConnections(colors, avg);
    }
  }

  createExplosion(colors, intensity) {
    const count = Math.floor(20 + intensity * 30);
    const x = this.centerX + (Math.random() - 0.5) * this.width * 0.5;
    const y = this.centerY + (Math.random() - 0.5) * this.height * 0.5;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;
      const speed = 2 + Math.random() * 5 * intensity;

      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 1,
        size: 3 + Math.random() * 5,
        color: colors.gradient[Math.floor(Math.random() * colors.gradient.length)],
        type: 'explosion',
        trail: []
      });
    }

    // Add a gravity well at explosion point
    this.gravityWells.push({
      x: x,
      y: y,
      strength: -0.5 * intensity, // Repulsion
      life: 0.5
    });
  }

  spawnParticles(bands, colors, deltaTime) {
    const spawnRate = 2 + (bands.bass / 255) * 8;

    for (let i = 0; i < spawnRate && this.particles.length < this.maxParticles; i++) {
      const type = Math.random();
      let particle;

      if (type < 0.4) {
        // Bass particles - spawn from bottom
        particle = {
          x: Math.random() * this.width,
          y: this.height + 10,
          vx: (Math.random() - 0.5) * 2,
          vy: -2 - (bands.bass / 255) * 5,
          life: 1,
          maxLife: 1,
          size: 3 + (bands.bass / 255) * 5,
          color: colors.primary,
          type: 'bass',
          trail: []
        };
      } else if (type < 0.7) {
        // Mid particles - spawn from sides
        const fromLeft = Math.random() < 0.5;
        particle = {
          x: fromLeft ? -10 : this.width + 10,
          y: Math.random() * this.height,
          vx: (fromLeft ? 1 : -1) * (2 + (bands.mid / 255) * 3),
          vy: (Math.random() - 0.5) * 2,
          life: 1,
          maxLife: 1,
          size: 2 + (bands.mid / 255) * 3,
          color: colors.secondary,
          type: 'mid',
          trail: []
        };
      } else {
        // Treble particles - spawn from top
        particle = {
          x: Math.random() * this.width,
          y: -10,
          vx: (Math.random() - 0.5) * 3,
          vy: 1 + (bands.treble / 255) * 4,
          life: 1,
          maxLife: 1,
          size: 1 + (bands.treble / 255) * 2,
          color: colors.tertiary,
          type: 'treble',
          trail: []
        };
      }

      this.particles.push(particle);
    }
  }

  updateGravityWells(bands) {
    // Update existing gravity wells
    for (let i = this.gravityWells.length - 1; i >= 0; i--) {
      this.gravityWells[i].life -= 0.02;
      if (this.gravityWells[i].life <= 0) {
        this.gravityWells.splice(i, 1);
      }
    }

    // Center gravity well based on bass
    const centerStrength = (bands.bass / 255) * 0.3;
    if (centerStrength > 0.1) {
      // Check if center well exists
      let centerWell = this.gravityWells.find(w => w.isCenter);
      if (!centerWell) {
        centerWell = { x: this.centerX, y: this.centerY, strength: 0, isCenter: true, life: 1 };
        this.gravityWells.push(centerWell);
      }
      centerWell.strength = centerStrength;
      centerWell.life = 1;
    }
  }

  updateParticles(deltaTime, colors) {
    const speed = this.settings.animationSpeed;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // Store trail position
      if (p.trail.length > 10) p.trail.shift();
      p.trail.push({ x: p.x, y: p.y });

      // Apply gravity wells
      for (const well of this.gravityWells) {
        const dx = well.x - p.x;
        const dy = well.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 10 && dist < 300) {
          const force = well.strength / (dist * 0.1);
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
        }
      }

      // Apply friction
      p.vx *= 0.99;
      p.vy *= 0.99;

      // Update position
      p.x += p.vx * speed;
      p.y += p.vy * speed;

      // Update life
      p.life -= 0.008 * speed;

      // Remove dead or off-screen particles
      if (p.life <= 0 ||
          p.x < -50 || p.x > this.width + 50 ||
          p.y < -50 || p.y > this.height + 50) {
        this.particles.splice(i, 1);
      }
    }
  }

  drawParticles(colors) {
    for (const p of this.particles) {
      const alpha = p.life;
      const size = p.size * (0.5 + p.life * 0.5);

      // Draw trail
      if (p.trail.length > 2) {
        this.ctx.beginPath();
        this.ctx.moveTo(p.trail[0].x, p.trail[0].y);
        for (let i = 1; i < p.trail.length; i++) {
          this.ctx.lineTo(p.trail[i].x, p.trail[i].y);
        }
        this.ctx.strokeStyle = `${p.color}${Math.floor(alpha * 0.3 * 255).toString(16).padStart(2, '0')}`;
        this.ctx.lineWidth = size * 0.5;
        this.ctx.stroke();
      }

      // Draw particle
      this.applyGlow(p.color, size * 2);
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      this.ctx.fillStyle = `${p.color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
      this.ctx.fill();
    }

    this.resetGlow();
  }

  drawConnections(colors, intensity) {
    const maxDist = 80 + intensity * 40;

    this.ctx.strokeStyle = `${colors.primary}22`;
    this.ctx.lineWidth = 1;

    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const p1 = this.particles[i];
        const p2 = this.particles[j];
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < maxDist) {
          const alpha = (1 - dist / maxDist) * 0.3 * Math.min(p1.life, p2.life);
          this.ctx.strokeStyle = `${colors.primary}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
          this.ctx.beginPath();
          this.ctx.moveTo(p1.x, p1.y);
          this.ctx.lineTo(p2.x, p2.y);
          this.ctx.stroke();
        }
      }
    }
  }

  drawFrequencyBars(data, colors) {
    const barCount = 64;
    const barWidth = this.width / barCount;
    const maxHeight = 50;

    const samplesPerBar = Math.floor(data.length / barCount);

    for (let i = 0; i < barCount; i++) {
      let sum = 0;
      for (let j = 0; j < samplesPerBar; j++) {
        sum += data[i * samplesPerBar + j] || 0;
      }
      const avg = sum / samplesPerBar;
      const height = (avg / 255) * maxHeight * this.settings.sensitivity;

      const alpha = 0.2 + (avg / 255) * 0.3;
      this.ctx.fillStyle = `${colors.primary}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
      this.ctx.fillRect(i * barWidth, this.height - height, barWidth - 1, height);
    }
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ParticlesVisualizer;
}
