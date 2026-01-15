/**
 * Psychedelic Visualizer
 * Trippy kaleidoscope and mandala effects
 */

class PsychedelicVisualizer extends BaseVisualizer {
    constructor(canvas, audioProcessor) {
        super(canvas, audioProcessor);
        this.hueOffset = 0;
        this.rotation = 0;
    }

    draw(deltaTime) {
        if (!this.width || !this.height) {
            this.handleResize();
            return;
        }

        const data = this.audioProcessor.getFrequencyData();
        if (!data) return;

        const bands = this.audioProcessor.getFrequencyBands() || {
            bass: 0,
            mid: 0,
            treble: 0,
        };
        const avg = (this.audioProcessor.getAverageFrequency() || 0) / 255;
        const bass = (bands.bass || 0) / 255;
        const mid = (bands.mid || 0) / 255;

        const speed = this.settings.animationSpeed;
        this.hueOffset += deltaTime * 30 * speed;
        this.rotation += deltaTime * 0.5 * speed * (1 + bass);

        // Motion blur background
        this.ctx.fillStyle = `rgba(10, 10, 15, 0.15)`;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Draw kaleidoscope
        this.drawKaleidoscope(data, bass, mid);

        // Draw center mandala
        this.drawMandala(data, bass, mid);

        // Draw pulsing rings
        this.drawRings(bass, mid);
    }

    drawKaleidoscope(data, bass, mid) {
        const segments = 8;
        const radius = Math.min(this.width, this.height) * 0.45;

        this.ctx.save();
        this.ctx.translate(this.centerX, this.centerY);
        this.ctx.rotate(this.rotation);

        for (let s = 0; s < segments; s++) {
            this.ctx.save();
            this.ctx.rotate((s / segments) * Math.PI * 2);
            if (s % 2 === 1) this.ctx.scale(1, -1);

            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);

            const points = 20;
            for (let i = 0; i <= points; i++) {
                const t = i / points;
                const angle = t * (Math.PI / segments);
                const idx = Math.floor(t * data.length * 0.5);
                const val = (data[idx] || 0) / 255;
                const r = radius * (0.3 + t * 0.7) + val * 40;
                this.ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
            }
            this.ctx.closePath();

            const hue = (this.hueOffset + s * 45) % 360;
            this.ctx.fillStyle = `hsla(${hue}, 80%, 50%, ${0.1 + bass * 0.1})`;
            this.ctx.fill();
            this.ctx.strokeStyle = `hsla(${hue}, 100%, 60%, 0.5)`;
            this.ctx.lineWidth = 1;
            this.ctx.stroke();

            this.ctx.restore();
        }
        this.ctx.restore();
    }

    drawMandala(data, bass, mid) {
        const layers = 4;
        const baseRadius = Math.min(this.width, this.height) * 0.1;

        this.ctx.save();
        this.ctx.translate(this.centerX, this.centerY);
        this.ctx.rotate(-this.rotation * 0.5);

        for (let layer = 0; layer < layers; layer++) {
            const petals = 6 + layer * 2;
            const layerRadius =
                baseRadius * (1 + layer * 0.6) * (1 + bass * 0.3);

            for (let p = 0; p < petals; p++) {
                const angle = (p / petals) * Math.PI * 2;
                const idx = (layer * 10 + p * 3) % data.length;
                const val = (data[idx] || 0) / 255;

                this.ctx.save();
                this.ctx.rotate(angle);

                const len = layerRadius * (0.5 + val * 0.5);
                const hue = (this.hueOffset + layer * 40 + p * 20) % 360;

                this.ctx.beginPath();
                this.ctx.moveTo(0, 0);
                this.ctx.quadraticCurveTo(len * 0.3, len * 0.5, 0, len);
                this.ctx.quadraticCurveTo(-len * 0.3, len * 0.5, 0, 0);

                this.ctx.fillStyle = `hsla(${hue}, 100%, 50%, ${0.4 + val * 0.3})`;
                this.ctx.fill();

                this.ctx.restore();
            }
        }

        // Center glow
        const gradient = this.ctx.createRadialGradient(
            0,
            0,
            0,
            0,
            0,
            baseRadius,
        );
        gradient.addColorStop(
            0,
            `hsla(${this.hueOffset % 360}, 100%, 80%, 0.8)`,
        );
        gradient.addColorStop(1, "transparent");
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, baseRadius * (1 + bass * 0.5), 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.restore();
    }

    drawRings(bass, mid) {
        const ringCount = 5;
        const maxRadius = Math.min(this.width, this.height) * 0.4;

        this.ctx.save();
        this.ctx.translate(this.centerX, this.centerY);

        for (let i = 0; i < ringCount; i++) {
            const radius = maxRadius * ((i + 1) / ringCount) * (1 + bass * 0.2);
            const hue = (this.hueOffset + i * 50) % 360;

            this.ctx.beginPath();
            this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
            this.ctx.strokeStyle = `hsla(${hue}, 100%, 60%, ${0.2 + mid * 0.2})`;
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }

        this.ctx.restore();
    }
}

// Export
if (typeof module !== "undefined" && module.exports) {
    module.exports = PsychedelicVisualizer;
}
