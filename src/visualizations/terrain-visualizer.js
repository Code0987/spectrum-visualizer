/**
 * 3D Terrain Visualizer
 * Uses canvas-based 3D rendering for terrain effect
 * (Can be enhanced with Three.js if available)
 */

class TerrainVisualizer extends BaseVisualizer {
    constructor(canvas, audioProcessor) {
        super(canvas, audioProcessor);
        this.terrainWidth = 60;
        this.terrainDepth = 40;
        this.terrain = [];
        this.zOffset = 0;
        this.perspective = 400;
        this.cameraHeight = 150;
        this.initTerrain();
    }

    initTerrain() {
        this.terrain = [];
        for (let z = 0; z < this.terrainDepth; z++) {
            this.terrain[z] = [];
            for (let x = 0; x < this.terrainWidth; x++) {
                this.terrain[z][x] = 0;
            }
        }
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
        const bands = this.audioProcessor.getFrequencyBands();
        const colors = this.getColors();
        const avg = this.audioProcessor.getAverageFrequency() / 255 || 0;

        const speed = this.settings.animationSpeed;

        // Move terrain forward
        this.zOffset += deltaTime * 80 * speed * (0.5 + avg * 0.5);

        // Update terrain heights based on audio
        this.updateTerrain(frequencyData);

        // Draw background
        this.drawSkybox(colors, avg);

        // Draw 3D terrain
        this.drawTerrain(colors, avg);

        // Draw sun/orb
        this.drawSun(colors, bands);

        // Draw particles
        this.drawTerrainParticles(colors, avg);

        // Draw grid overlay
        this.drawGrid(colors, avg);
    }

    updateTerrain(data) {
        // Shift terrain back
        for (let z = this.terrainDepth - 1; z > 0; z--) {
            for (let x = 0; x < this.terrainWidth; x++) {
                this.terrain[z][x] = this.terrain[z - 1][x] * 0.95;
            }
        }

        const clampedSensitivity = this.clamp(
            this.settings.sensitivity,
            0.1,
            3.0,
        );
        const maxTerrainHeight = 200; // Prevent extreme terrain heights

        // Add new row based on frequency data
        for (let x = 0; x < this.terrainWidth; x++) {
            const dataIndex = Math.floor((x / this.terrainWidth) * data.length);
            const value = this.clamp((data[dataIndex] || 0) / 255, 0, 1);

            // Center has more height
            const centerFactor =
                1 -
                Math.abs(x - this.terrainWidth / 2) / (this.terrainWidth / 2);
            // Clamp height to prevent rendering issues
            const height = Math.min(
                value * 150 * centerFactor * clampedSensitivity,
                maxTerrainHeight,
            );

            this.terrain[0][x] = height;
        }
    }

    drawSkybox(colors, intensity) {
        // Gradient sky
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, "#000011");
        gradient.addColorStop(0.3, "#110022");
        gradient.addColorStop(0.6, "#220033");
        gradient.addColorStop(1, "#000000");

        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Stars
        const starCount = 100;
        for (let i = 0; i < starCount; i++) {
            const x = (Math.sin(i * 123.456) * 0.5 + 0.5) * this.width;
            const y = (Math.cos(i * 789.012) * 0.5 + 0.5) * this.height * 0.6;
            const size = 1 + Math.sin(this.time * 2 + i) * 0.5;
            const alpha = 0.5 + Math.sin(this.time * 3 + i * 0.5) * 0.3;

            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            this.ctx.fill();
        }
    }

    drawTerrain(colors, intensity) {
        const cellWidth = this.width / this.terrainWidth;
        const cellDepth = 30;
        const horizon = this.height * 0.4;

        // Draw from back to front
        for (let z = this.terrainDepth - 1; z >= 0; z--) {
            for (let x = 0; x < this.terrainWidth - 1; x++) {
                // Get corner heights
                const h00 = this.terrain[z][x];
                const h10 = this.terrain[z][x + 1];
                const h01 =
                    z < this.terrainDepth - 1 ? this.terrain[z + 1][x] : 0;
                const h11 =
                    z < this.terrainDepth - 1 ? this.terrain[z + 1][x + 1] : 0;

                // Project to 2D
                const p00 = this.project(x, h00, z);
                const p10 = this.project(x + 1, h10, z);
                const p01 = this.project(x, h01, z + 1);
                const p11 = this.project(x + 1, h11, z + 1);

                if (!p00 || !p10 || !p01 || !p11) continue;

                // Calculate color based on height and position
                const avgHeight = (h00 + h10 + h01 + h11) / 4;
                const heightFactor = avgHeight / 150;
                const depthFactor = 1 - z / this.terrainDepth;

                // Draw quad
                this.ctx.beginPath();
                this.ctx.moveTo(p00.x, p00.y);
                this.ctx.lineTo(p10.x, p10.y);
                this.ctx.lineTo(p11.x, p11.y);
                this.ctx.lineTo(p01.x, p01.y);
                this.ctx.closePath();

                // Fill with gradient based on height
                const fillAlpha = depthFactor * 0.8;
                const hue = heightFactor * 60; // 0-60 degrees (red to yellow)

                if (heightFactor > 0.1) {
                    const gradient = this.ctx.createLinearGradient(
                        p00.x,
                        p00.y,
                        p01.x,
                        p01.y,
                    );
                    gradient.addColorStop(
                        0,
                        `hsla(${280 + hue}, 100%, ${40 + heightFactor * 30}%, ${fillAlpha})`,
                    );
                    gradient.addColorStop(
                        1,
                        `hsla(${200 + hue}, 100%, ${20 + heightFactor * 20}%, ${fillAlpha * 0.5})`,
                    );
                    this.ctx.fillStyle = gradient;
                    this.ctx.fill();
                }

                // Draw wireframe
                this.ctx.strokeStyle = `hsla(${180 + hue * 2}, 100%, 50%, ${depthFactor * (0.3 + heightFactor * 0.5)})`;
                this.ctx.lineWidth = 1;
                this.ctx.stroke();
            }
        }
    }

    project(x, y, z) {
        // Adjust coordinates to center
        const px = (x - this.terrainWidth / 2) * 20;
        const py = y;
        const pz = z * 30 + 50;

        if (pz <= 0) return null;

        // Simple perspective projection
        const scale = this.perspective / pz;
        const screenX = this.centerX + px * scale;
        const screenY =
            this.height * 0.7 - (py + this.cameraHeight) * scale + pz * 0.5;

        return { x: screenX, y: screenY, scale: scale };
    }

    drawSun(colors, bands) {
        const sunX = this.centerX;
        const sunY = this.height * 0.25;
        const baseRadius = 60;
        const pulseRadius = baseRadius + (bands.bass / 255) * 30;

        // Sun glow
        const glowGradient = this.ctx.createRadialGradient(
            sunX,
            sunY,
            0,
            sunX,
            sunY,
            pulseRadius * 3,
        );
        glowGradient.addColorStop(0, "rgba(255, 100, 255, 0.5)");
        glowGradient.addColorStop(0.3, "rgba(255, 50, 150, 0.2)");
        glowGradient.addColorStop(1, "transparent");

        this.ctx.fillStyle = glowGradient;
        this.ctx.fillRect(0, 0, this.width, this.height * 0.6);

        // Sun core
        const coreGradient = this.ctx.createRadialGradient(
            sunX,
            sunY,
            0,
            sunX,
            sunY,
            pulseRadius,
        );
        coreGradient.addColorStop(0, "#ffffff");
        coreGradient.addColorStop(0.3, colors.primary);
        coreGradient.addColorStop(0.7, colors.secondary);
        coreGradient.addColorStop(1, "transparent");

        this.applyGlow(colors.primary, 30);
        this.ctx.beginPath();
        this.ctx.arc(sunX, sunY, pulseRadius, 0, Math.PI * 2);
        this.ctx.fillStyle = coreGradient;
        this.ctx.fill();
        this.resetGlow();

        // Sun rings
        for (let i = 0; i < 3; i++) {
            const ringRadius =
                pulseRadius + 20 + i * 15 + Math.sin(this.time * 2 + i) * 5;
            const alpha = 0.3 - i * 0.08;

            this.ctx.beginPath();
            this.ctx.arc(sunX, sunY, ringRadius, 0, Math.PI * 2);
            this.ctx.strokeStyle = `${colors.secondary}${Math.floor(alpha * 255)
                .toString(16)
                .padStart(2, "0")}`;
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }
    }

    drawTerrainParticles(colors, intensity) {
        // Floating particles
        const particleCount = 30;

        for (let i = 0; i < particleCount; i++) {
            const t = (this.time * 0.2 + i * 0.1) % 1;
            const x = (Math.sin(i * 12.34) * 0.5 + 0.5) * this.width;
            const baseY =
                this.height * 0.5 +
                Math.cos(i * 56.78) * 0.5 * this.height * 0.3;
            const y = baseY - t * this.height * 0.5;

            const size = 2 + Math.sin(this.time * 3 + i) * 1;
            const alpha = (1 - t) * intensity;

            if (alpha > 0.05) {
                const colorIndex = i % colors.gradient.length;
                this.ctx.beginPath();
                this.ctx.arc(x, y, size, 0, Math.PI * 2);
                this.ctx.fillStyle = `${colors.gradient[colorIndex]}${Math.floor(
                    alpha * 255,
                )
                    .toString(16)
                    .padStart(2, "0")}`;
                this.ctx.fill();
            }
        }
    }

    drawGrid(colors, intensity) {
        // Horizontal grid lines
        const horizon = this.height * 0.7;
        const lineCount = 15;

        this.ctx.strokeStyle = `${colors.primary}22`;
        this.ctx.lineWidth = 1;

        for (let i = 0; i < lineCount; i++) {
            const t = i / lineCount;
            const y = horizon + t * this.height * 0.3;
            const perspectiveScale = 1 - t * 0.5;

            this.ctx.beginPath();
            this.ctx.moveTo(
                this.centerX - this.width * 0.5 * perspectiveScale,
                y,
            );
            this.ctx.lineTo(
                this.centerX + this.width * 0.5 * perspectiveScale,
                y,
            );
            this.ctx.stroke();
        }

        // Vertical lines
        const vLineCount = 20;
        for (let i = 0; i < vLineCount; i++) {
            const t = (i / vLineCount - 0.5) * 2;
            const topX = this.centerX + t * this.width * 0.1;
            const bottomX = this.centerX + t * this.width * 0.5;

            this.ctx.beginPath();
            this.ctx.moveTo(topX, horizon);
            this.ctx.lineTo(bottomX, this.height);
            this.ctx.stroke();
        }
    }

    handleResize() {
        super.handleResize();
        this.initTerrain();
    }
}

// Export
if (typeof module !== "undefined" && module.exports) {
    module.exports = TerrainVisualizer;
}
