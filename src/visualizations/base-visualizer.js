/**
 * Base Visualizer Class
 * All visualization types extend this class
 */

class BaseVisualizer {
    constructor(canvas, audioProcessor) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.audioProcessor = audioProcessor;
        this.animationId = null;
        this.isRunning = false;

        this.settings = {
            sensitivity: 1.0,
            animationSpeed: 1.0,
            barCount: 64,
            barSpacing: 2,
            mirrorEffect: false,
            glowEffect: true,
            backgroundColor: "#0a0a0f",
            gradientBackground: true,
        };

        this.theme = "neon";
        this.colorSchemes = {
            neon: {
                primary: "#00ffff",
                secondary: "#ff00ff",
                tertiary: "#ffff00",
                gradient: ["#00ffff", "#ff00ff", "#ffff00"],
            },
            fire: {
                primary: "#ff0000",
                secondary: "#ff6600",
                tertiary: "#ffff00",
                gradient: ["#ff0000", "#ff6600", "#ffff00"],
            },
            ocean: {
                primary: "#0066ff",
                secondary: "#00ccff",
                tertiary: "#00ff99",
                gradient: ["#0066ff", "#00ccff", "#00ff99"],
            },
            sunset: {
                primary: "#ff6b35",
                secondary: "#ff8c42",
                tertiary: "#f7c59f",
                gradient: ["#ff6b35", "#ff8c42", "#f7c59f"],
            },
            forest: {
                primary: "#2d5a27",
                secondary: "#5d9b54",
                tertiary: "#8bc34a",
                gradient: ["#2d5a27", "#5d9b54", "#8bc34a"],
            },
            galaxy: {
                primary: "#9933ff",
                secondary: "#6600cc",
                tertiary: "#cc66ff",
                gradient: ["#1a0033", "#9933ff", "#cc66ff"],
            },
            monochrome: {
                primary: "#ffffff",
                secondary: "#aaaaaa",
                tertiary: "#666666",
                gradient: ["#333333", "#888888", "#ffffff"],
            },
            rainbow: {
                primary: "#ff0000",
                secondary: "#00ff00",
                tertiary: "#0000ff",
                gradient: [
                    "#ff0000",
                    "#ff7f00",
                    "#ffff00",
                    "#00ff00",
                    "#0000ff",
                    "#9400d3",
                ],
            },
        };

        this.time = 0;
        this.lastFrameTime = 0;

        // Bind resize handler
        this.handleResize = this.handleResize.bind(this);
        window.addEventListener("resize", this.handleResize);
        this.handleResize();
    }

    /**
     * Handle canvas resize
     */
    handleResize() {
        const container = this.canvas.parentElement;
        if (container) {
            const width = container.clientWidth || container.offsetWidth || 800;
            const height =
                container.clientHeight || container.offsetHeight || 600;

            // Only resize if dimensions are valid
            if (width > 0 && height > 0) {
                this.canvas.width = width;
                this.canvas.height = height;
            }
        }

        // Fallback to reasonable defaults if canvas has no size
        this.width = this.canvas.width || 800;
        this.height = this.canvas.height || 600;
        this.centerX = this.width / 2;
        this.centerY = this.height / 2;
    }

    /**
     * Get current color scheme
     */
    getColors() {
        return this.colorSchemes[this.theme] || this.colorSchemes.neon;
    }

    /**
     * Set color theme
     */
    setTheme(themeName) {
        if (this.colorSchemes[themeName]) {
            this.theme = themeName;
        }
    }

    /**
     * Update settings
     */
    updateSettings(newSettings) {
        // Clamp sensitive values to prevent rendering issues
        if (newSettings.sensitivity !== undefined) {
            newSettings.sensitivity = this.clamp(
                newSettings.sensitivity,
                0.1,
                5.0,
            );
        }
        if (newSettings.animationSpeed !== undefined) {
            newSettings.animationSpeed = this.clamp(
                newSettings.animationSpeed,
                0.1,
                5.0,
            );
        }
        if (newSettings.barCount !== undefined) {
            newSettings.barCount = this.clamp(newSettings.barCount, 8, 256);
        }
        Object.assign(this.settings, newSettings);
    }

    /**
     * Create gradient from color scheme
     */
    createGradient(x0, y0, x1, y1) {
        const colors = this.getColors();
        const gradient = this.ctx.createLinearGradient(x0, y0, x1, y1);
        const gradientColors = colors.gradient;

        for (let i = 0; i < gradientColors.length; i++) {
            gradient.addColorStop(
                i / (gradientColors.length - 1),
                gradientColors[i],
            );
        }

        return gradient;
    }

    /**
     * Create radial gradient
     */
    createRadialGradient(x, y, r0, r1) {
        const colors = this.getColors();
        const gradient = this.ctx.createRadialGradient(x, y, r0, x, y, r1);
        const gradientColors = colors.gradient;

        for (let i = 0; i < gradientColors.length; i++) {
            gradient.addColorStop(
                i / (gradientColors.length - 1),
                gradientColors[i],
            );
        }

        return gradient;
    }

    /**
     * Clear canvas with background
     */
    clear() {
        if (this.settings.gradientBackground) {
            const gradient = this.ctx.createRadialGradient(
                this.centerX,
                this.centerY,
                0,
                this.centerX,
                this.centerY,
                Math.max(this.width, this.height) / 2,
            );
            gradient.addColorStop(0, "#15151f");
            gradient.addColorStop(1, this.settings.backgroundColor);
            this.ctx.fillStyle = gradient;
        } else {
            this.ctx.fillStyle = this.settings.backgroundColor;
        }
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    /**
     * Apply glow effect
     */
    applyGlow(color, blur = 20) {
        if (this.settings.glowEffect) {
            this.ctx.shadowColor = color;
            // Clamp shadowBlur to prevent GPU strain - values over 100 cause severe lag
            this.ctx.shadowBlur = Math.min(blur, 100);
        } else {
            this.ctx.shadowColor = "transparent";
            this.ctx.shadowBlur = 0;
        }
    }

    /**
     * Reset glow effect
     */
    resetGlow() {
        this.ctx.shadowColor = "transparent";
        this.ctx.shadowBlur = 0;
    }

    /**
     * Interpolate between colors
     */
    interpolateColor(color1, color2, factor) {
        const c1 = this.hexToRgb(color1);
        const c2 = this.hexToRgb(color2);

        const r = Math.round(c1.r + (c2.r - c1.r) * factor);
        const g = Math.round(c1.g + (c2.g - c1.g) * factor);
        const b = Math.round(c1.b + (c2.b - c1.b) * factor);

        return `rgb(${r}, ${g}, ${b})`;
    }

    /**
     * Convert hex to RGB
     */
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result
            ? {
                  r: parseInt(result[1], 16),
                  g: parseInt(result[2], 16),
                  b: parseInt(result[3], 16),
              }
            : { r: 0, g: 0, b: 0 };
    }

    /**
     * Get color from spectrum position (0-1)
     */
    getSpectrumColor(position) {
        const colors = this.getColors().gradient;
        const index = position * (colors.length - 1);
        const lowerIndex = Math.floor(index);
        const upperIndex = Math.min(lowerIndex + 1, colors.length - 1);
        const factor = index - lowerIndex;

        return this.interpolateColor(
            colors[lowerIndex],
            colors[upperIndex],
            factor,
        );
    }

    /**
     * Map value to range
     */
    map(value, inMin, inMax, outMin, outMax) {
        return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
    }

    /**
     * Ease function
     */
    ease(t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }

    /**
     * Get processed frequency data with bar count
     */
    getProcessedData(barCount = null) {
        const count = barCount || this.settings.barCount;
        const rawData = this.audioProcessor.getFrequencyData();
        const processedData = new Array(count);

        const samplesPerBar = Math.floor(rawData.length / count);

        for (let i = 0; i < count; i++) {
            let sum = 0;
            const start = i * samplesPerBar;

            for (let j = 0; j < samplesPerBar; j++) {
                sum += rawData[start + j] || 0;
            }

            processedData[i] =
                (sum / samplesPerBar) * this.settings.sensitivity;
        }

        return processedData;
    }

    /**
     * Start visualization
     */
    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastFrameTime = performance.now();
        this.animate();
    }

    /**
     * Stop visualization
     */
    stop() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    /**
     * Animation loop
     */
    animate() {
        if (!this.isRunning) return;

        const now = performance.now();
        const deltaTime = Math.min((now - this.lastFrameTime) / 1000, 0.1); // Cap deltaTime to prevent huge jumps
        this.lastFrameTime = now;
        this.time += deltaTime * this.settings.animationSpeed;

        try {
            // Save context state before drawing
            this.ctx.save();

            // Reset any problematic state
            this.ctx.globalAlpha = 1;
            this.ctx.globalCompositeOperation = "source-over";
            this.ctx.setTransform(1, 0, 0, 1, 0, 0);

            this.clear();
            this.draw(deltaTime);

            // Restore context state
            this.ctx.restore();
        } catch (error) {
            console.error("Visualization draw error:", error);
            // Reset context on error
            this.ctx.restore();
            this.ctx.setTransform(1, 0, 0, 1, 0, 0);
            this.ctx.globalAlpha = 1;
            this.ctx.globalCompositeOperation = "source-over";
        }

        this.animationId = requestAnimationFrame(() => this.animate());
    }

    /**
     * Draw frame - Override in subclasses
     */
    draw(deltaTime) {
        // Override in subclass
    }

    /**
     * Clamp a value between min and max
     */
    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    /**
     * Check if a point is within canvas bounds
     */
    inBounds(x, y, margin = 0) {
        return (
            x >= -margin &&
            x <= this.width + margin &&
            y >= -margin &&
            y <= this.height + margin
        );
    }

    /**
     * Get clamped sensitivity - prevents extreme values from causing out-of-bounds drawing
     */
    getClampedSensitivity() {
        return this.clamp(this.settings.sensitivity, 0.1, 3.0);
    }

    /**
     * Apply sensitivity to a value with automatic clamping to prevent overflow
     */
    applySensitivity(value, maxResult) {
        const result = value * this.getClampedSensitivity();
        return Math.min(result, maxResult);
    }

    /**
     * Cleanup
     */
    destroy() {
        this.stop();
        window.removeEventListener("resize", this.handleResize);
    }
}

// Export
if (typeof module !== "undefined" && module.exports) {
    module.exports = BaseVisualizer;
}
