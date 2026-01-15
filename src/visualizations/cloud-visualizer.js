/**
 * Cloud Visualizer
 * Soft, flowing cloud-like visualization
 */

class CloudVisualizer extends BaseVisualizer {
  constructor(canvas, audioProcessor) {
    super(canvas, audioProcessor);
    this.clouds = [];
    this.noiseOffset = 0;
    this.maxClouds = 30;
    this.flowField = [];
    this.flowResolution = 20;
    this.initFlowField();
  }

  initFlowField() {
    const cols = Math.ceil(this.width / this.flowResolution) + 1;
    const rows = Math.ceil(this.height / this.flowResolution) + 1;

    this.flowField = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        this.flowField.push({
          angle: Math.random() * Math.PI * 2,
          strength: 0.5 + Math.random() * 0.5
        });
      }
    }
  }

  draw(deltaTime) {
    const frequencyData = this.audioProcessor.getFrequencyData();
    const bands = this.audioProcessor.getFrequencyBands();
    const colors = this.getColors();
    const avg = this.audioProcessor.getAverageFrequency() / 255;

    // Update noise offset
    this.noiseOffset += deltaTime * 0.3 * this.settings.animationSpeed;

    // Update flow field based on audio
    this.updateFlowField(bands, deltaTime);

    // Draw background gradient
    this.drawBackground(colors, avg);

    // Spawn and update clouds
    this.spawnClouds(bands, colors);
    this.updateClouds(deltaTime);

    // Draw clouds
    this.drawClouds(colors);

    // Draw flow field visualization
    this.drawFlowVisualization(colors, avg);

    // Draw aurora effect
    this.drawAurora(frequencyData, colors);
  }

  updateFlowField(bands, deltaTime) {
    const cols = Math.ceil(this.width / this.flowResolution) + 1;
    const rows = Math.ceil(this.height / this.flowResolution) + 1;
    const speed = this.settings.animationSpeed;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const index = y * cols + x;
        const field = this.flowField[index];

        // Perlin-like noise simulation
        const noiseX = x * 0.1 + this.noiseOffset;
        const noiseY = y * 0.1 + this.noiseOffset * 0.5;
        const noise = Math.sin(noiseX) * Math.cos(noiseY) * Math.sin(this.noiseOffset);

        // Audio influence
        const bassInfluence = (bands.bass / 255) * 0.5;
        const midInfluence = (bands.mid / 255) * 0.3;

        field.angle += noise * deltaTime * speed + bassInfluence * Math.sin(this.time + x * 0.1);
        field.strength = 0.3 + midInfluence + Math.abs(Math.sin(this.time * 0.5 + y * 0.1)) * 0.3;
      }
    }
  }

  drawBackground(colors, intensity) {
    // Animated gradient background
    const gradient = this.ctx.createRadialGradient(
      this.centerX + Math.sin(this.time * 0.5) * 100,
      this.centerY + Math.cos(this.time * 0.3) * 50,
      0,
      this.centerX, this.centerY,
      Math.max(this.width, this.height)
    );

    const alpha = Math.floor((0.1 + intensity * 0.1) * 255).toString(16).padStart(2, '0');
    gradient.addColorStop(0, `${colors.primary}${alpha}`);
    gradient.addColorStop(0.5, `${colors.secondary}${Math.floor(parseInt(alpha, 16) * 0.5).toString(16).padStart(2, '0')}`);
    gradient.addColorStop(1, this.settings.backgroundColor);

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  spawnClouds(bands, colors) {
    const spawnChance = 0.02 + (bands.bass / 255) * 0.1;

    if (Math.random() < spawnChance && this.clouds.length < this.maxClouds) {
      const colorIndex = Math.floor(Math.random() * colors.gradient.length);

      this.clouds.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: 50 + Math.random() * 150,
        life: 1,
        maxLife: 1,
        color: colors.gradient[colorIndex],
        blobs: this.generateBlobs(5 + Math.floor(Math.random() * 5)),
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.5
      });
    }
  }

  generateBlobs(count) {
    const blobs = [];
    for (let i = 0; i < count; i++) {
      blobs.push({
        offsetX: (Math.random() - 0.5) * 0.8,
        offsetY: (Math.random() - 0.5) * 0.8,
        size: 0.3 + Math.random() * 0.7,
        phase: Math.random() * Math.PI * 2
      });
    }
    return blobs;
  }

  updateClouds(deltaTime) {
    const speed = this.settings.animationSpeed;
    const cols = Math.ceil(this.width / this.flowResolution) + 1;

    for (let i = this.clouds.length - 1; i >= 0; i--) {
      const cloud = this.clouds[i];

      // Get flow field influence
      const gridX = Math.floor(cloud.x / this.flowResolution);
      const gridY = Math.floor(cloud.y / this.flowResolution);
      const index = gridY * cols + gridX;
      const field = this.flowField[index] || { angle: 0, strength: 0.5 };

      // Move based on flow field
      cloud.x += Math.cos(field.angle) * field.strength * speed * 50 * deltaTime;
      cloud.y += Math.sin(field.angle) * field.strength * speed * 50 * deltaTime;

      // Wrap around
      if (cloud.x < -cloud.size) cloud.x = this.width + cloud.size;
      if (cloud.x > this.width + cloud.size) cloud.x = -cloud.size;
      if (cloud.y < -cloud.size) cloud.y = this.height + cloud.size;
      if (cloud.y > this.height + cloud.size) cloud.y = -cloud.size;

      // Rotate
      cloud.rotation += cloud.rotationSpeed * deltaTime * speed;

      // Update life
      cloud.life -= 0.002 * speed;

      // Remove dead clouds
      if (cloud.life <= 0) {
        this.clouds.splice(i, 1);
      }
    }
  }

  drawClouds(colors) {
    for (const cloud of this.clouds) {
      const alpha = cloud.life;

      this.ctx.save();
      this.ctx.translate(cloud.x, cloud.y);
      this.ctx.rotate(cloud.rotation);

      // Draw each blob
      for (const blob of cloud.blobs) {
        const blobX = blob.offsetX * cloud.size;
        const blobY = blob.offsetY * cloud.size;
        const blobSize = blob.size * cloud.size * (0.8 + Math.sin(this.time + blob.phase) * 0.2);

        const gradient = this.ctx.createRadialGradient(
          blobX, blobY, 0,
          blobX, blobY, blobSize
        );

        const colorAlpha = Math.floor(alpha * 0.6 * 255).toString(16).padStart(2, '0');
        gradient.addColorStop(0, `${cloud.color}${colorAlpha}`);
        gradient.addColorStop(0.5, `${cloud.color}${Math.floor(parseInt(colorAlpha, 16) * 0.5).toString(16).padStart(2, '0')}`);
        gradient.addColorStop(1, `${cloud.color}00`);

        this.ctx.beginPath();
        this.ctx.arc(blobX, blobY, blobSize, 0, Math.PI * 2);
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
      }

      this.ctx.restore();
    }
  }

  drawFlowVisualization(colors, intensity) {
    if (intensity < 0.2) return;

    const cols = Math.ceil(this.width / this.flowResolution) + 1;
    const rows = Math.ceil(this.height / this.flowResolution) + 1;

    this.ctx.strokeStyle = `${colors.primary}${Math.floor(intensity * 0.15 * 255).toString(16).padStart(2, '0')}`;
    this.ctx.lineWidth = 1;

    for (let y = 0; y < rows; y += 3) {
      for (let x = 0; x < cols; x += 3) {
        const index = y * cols + x;
        const field = this.flowField[index];

        const px = x * this.flowResolution;
        const py = y * this.flowResolution;
        const length = field.strength * 15;

        this.ctx.beginPath();
        this.ctx.moveTo(px, py);
        this.ctx.lineTo(
          px + Math.cos(field.angle) * length,
          py + Math.sin(field.angle) * length
        );
        this.ctx.stroke();
      }
    }
  }

  drawAurora(data, colors) {
    const points = 50;
    const amplitude = this.height * 0.3;

    this.ctx.globalCompositeOperation = 'screen';

    for (let layer = 0; layer < 3; layer++) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, this.centerY);

      for (let i = 0; i <= points; i++) {
        const x = (i / points) * this.width;
        const dataIndex = Math.floor((i / points) * data.length);
        const value = (data[dataIndex] || 0) / 255;

        const baseY = this.centerY + Math.sin(this.time + i * 0.1 + layer) * 50;
        const audioOffset = value * amplitude * Math.sin(this.time * 0.5 + i * 0.2);
        const y = baseY + audioOffset * (layer + 1) * 0.3;

        if (i === 0) {
          this.ctx.moveTo(x, y);
        } else {
          const prevX = ((i - 1) / points) * this.width;
          const cpX = (prevX + x) / 2;
          this.ctx.quadraticCurveTo(prevX, baseY + audioOffset, cpX, y);
        }
      }

      this.ctx.lineTo(this.width, this.height);
      this.ctx.lineTo(0, this.height);
      this.ctx.closePath();

      const gradient = this.ctx.createLinearGradient(0, this.centerY - amplitude, 0, this.height);
      const alpha = Math.floor((0.1 - layer * 0.025) * 255).toString(16).padStart(2, '0');
      gradient.addColorStop(0, `${colors.gradient[layer % colors.gradient.length]}${alpha}`);
      gradient.addColorStop(1, 'transparent');

      this.ctx.fillStyle = gradient;
      this.ctx.fill();
    }

    this.ctx.globalCompositeOperation = 'source-over';
  }

  handleResize() {
    super.handleResize();
    this.initFlowField();
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CloudVisualizer;
}
