/**
 * Audio Processor - Web Audio API Handler
 * Manages audio input from files and microphone, performs FFT analysis
 */

class AudioProcessor {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.source = null;
        this.gainNode = null;
        this.audioElement = null;
        this.mediaStream = null;

        this.frequencyData = null;
        this.timeDomainData = null;

        this.isPlaying = false;
        this.isMicActive = false;
        this.currentSource = null; // 'file' or 'mic'

        this.settings = {
            fftSize: 2048,
            smoothingTimeConstant: 0.8,
            sensitivity: 1.0,
        };

        this.onTimeUpdate = null;
        this.onEnded = null;
        this.onError = null;
    }

    /**
     * Initialize the audio context and analyser
     */
    async init() {
        try {
            this.audioContext = new (
                window.AudioContext || window.webkitAudioContext
            )();

            // Create analyser node
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = this.settings.fftSize;
            this.analyser.smoothingTimeConstant =
                this.settings.smoothingTimeConstant;

            // Create gain node for volume control
            this.gainNode = this.audioContext.createGain();
            this.gainNode.connect(this.audioContext.destination);

            // Initialize data arrays
            this.frequencyData = new Uint8Array(
                this.analyser.frequencyBinCount,
            );
            this.timeDomainData = new Uint8Array(this.analyser.fftSize);

            console.log("Audio processor initialized");
            return true;
        } catch (error) {
            console.error("Failed to initialize audio context:", error);
            if (this.onError) this.onError(error);
            return false;
        }
    }

    /**
     * Load and play an audio file
     */
    async loadFile(filePath) {
        try {
            if (!this.audioContext) {
                await this.init();
            }

            // Resume context if suspended
            if (this.audioContext.state === "suspended") {
                await this.audioContext.resume();
            }

            // Stop any existing playback
            this.stop();

            // Create audio element
            this.audioElement = new Audio();
            this.audioElement.crossOrigin = "anonymous";
            this.audioElement.src = filePath;

            // Create source from audio element
            this.source = this.audioContext.createMediaElementSource(
                this.audioElement,
            );
            this.source.connect(this.analyser);
            this.analyser.connect(this.gainNode);

            // Set up event listeners
            this.audioElement.addEventListener("timeupdate", () => {
                if (this.onTimeUpdate) {
                    this.onTimeUpdate(
                        this.audioElement.currentTime,
                        this.audioElement.duration,
                    );
                }
            });

            this.audioElement.addEventListener("ended", () => {
                this.isPlaying = false;
                if (this.onEnded) this.onEnded();
            });

            this.audioElement.addEventListener("canplaythrough", () => {
                console.log("Audio loaded successfully");
            });

            this.currentSource = "file";

            return new Promise((resolve, reject) => {
                this.audioElement.addEventListener("loadedmetadata", () => {
                    resolve({
                        duration: this.audioElement.duration,
                        src: filePath,
                    });
                });
                this.audioElement.addEventListener("error", (e) => {
                    reject(new Error("Failed to load audio file"));
                });
            });
        } catch (error) {
            console.error("Failed to load audio file:", error);
            if (this.onError) this.onError(error);
            throw error;
        }
    }

    /**
     * Load audio from ArrayBuffer
     */
    async loadBuffer(arrayBuffer) {
        try {
            if (!this.audioContext) {
                await this.init();
            }

            if (this.audioContext.state === "suspended") {
                await this.audioContext.resume();
            }

            this.stop();

            const audioBuffer =
                await this.audioContext.decodeAudioData(arrayBuffer);

            this.source = this.audioContext.createBufferSource();
            this.source.buffer = audioBuffer;
            this.source.connect(this.analyser);
            this.analyser.connect(this.gainNode);

            this.source.onended = () => {
                this.isPlaying = false;
                if (this.onEnded) this.onEnded();
            };

            this.currentSource = "buffer";

            return {
                duration: audioBuffer.duration,
                sampleRate: audioBuffer.sampleRate,
            };
        } catch (error) {
            console.error("Failed to load audio buffer:", error);
            if (this.onError) this.onError(error);
            throw error;
        }
    }

    /**
     * Start microphone input
     */
    async startMicrophone() {
        try {
            if (!this.audioContext) {
                await this.init();
            }

            if (this.audioContext.state === "suspended") {
                await this.audioContext.resume();
            }

            // Stop any existing source
            this.stop();

            // Request microphone access
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                },
            });

            // Create source from microphone
            this.source = this.audioContext.createMediaStreamSource(
                this.mediaStream,
            );
            this.source.connect(this.analyser);
            // Don't connect to gain/destination to avoid feedback

            this.isMicActive = true;
            this.currentSource = "mic";

            console.log("Microphone started");
            return true;
        } catch (error) {
            console.error("Failed to start microphone:", error);
            if (this.onError) this.onError(error);
            return false;
        }
    }

    /**
     * Stop microphone input
     */
    stopMicrophone() {
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach((track) => track.stop());
            this.mediaStream = null;
        }
        this.isMicActive = false;
        this.currentSource = null;
        console.log("Microphone stopped");
    }

    /**
     * Play audio
     */
    play() {
        if (this.audioElement && this.currentSource === "file") {
            this.audioElement.play();
            this.isPlaying = true;
        } else if (this.source && this.currentSource === "buffer") {
            this.source.start(0);
            this.isPlaying = true;
        }
    }

    /**
     * Pause audio
     */
    pause() {
        if (this.audioElement && this.currentSource === "file") {
            this.audioElement.pause();
            this.isPlaying = false;
        }
    }

    /**
     * Toggle play/pause
     */
    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
        return this.isPlaying;
    }

    /**
     * Stop playback
     */
    stop() {
        if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement.currentTime = 0;
            this.audioElement = null;
        }

        if (this.source && this.currentSource === "buffer") {
            try {
                this.source.stop();
            } catch (e) {
                // Ignore if already stopped
            }
        }

        if (this.mediaStream) {
            this.stopMicrophone();
        }

        this.source = null;
        this.isPlaying = false;
    }

    /**
     * Seek to position (0-1)
     */
    seek(position) {
        if (this.audioElement) {
            this.audioElement.currentTime =
                position * this.audioElement.duration;
        }
    }

    /**
     * Set volume (0-1)
     */
    setVolume(volume) {
        if (this.gainNode) {
            this.gainNode.gain.value = volume;
        }
        if (this.audioElement) {
            this.audioElement.volume = volume;
        }
    }

    /**
     * Get frequency data
     */
    getFrequencyData() {
        if (this.analyser) {
            this.analyser.getByteFrequencyData(this.frequencyData);

            // Apply sensitivity
            if (this.settings.sensitivity !== 1.0) {
                for (let i = 0; i < this.frequencyData.length; i++) {
                    this.frequencyData[i] = Math.min(
                        255,
                        this.frequencyData[i] * this.settings.sensitivity,
                    );
                }
            }
        }
        return this.frequencyData;
    }

    /**
     * Get time domain data (waveform)
     */
    getTimeDomainData() {
        if (this.analyser) {
            this.analyser.getByteTimeDomainData(this.timeDomainData);
        }
        return this.timeDomainData;
    }

    /**
     * Get average frequency value
     */
    getAverageFrequency() {
        const data = this.getFrequencyData();
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
            sum += data[i];
        }
        return sum / data.length;
    }

    /**
     * Get frequency bands (bass, mid, treble)
     */
    getFrequencyBands() {
        const data = this.getFrequencyData();
        const third = Math.floor(data.length / 3);

        let bass = 0,
            mid = 0,
            treble = 0;

        for (let i = 0; i < third; i++) {
            bass += data[i];
        }
        for (let i = third; i < third * 2; i++) {
            mid += data[i];
        }
        for (let i = third * 2; i < data.length; i++) {
            treble += data[i];
        }

        return {
            bass: bass / third,
            mid: mid / third,
            treble: treble / third,
        };
    }

    /**
     * Update settings
     */
    updateSettings(settings) {
        Object.assign(this.settings, settings);

        if (this.analyser) {
            if (settings.fftSize) {
                this.analyser.fftSize = settings.fftSize;
                this.frequencyData = new Uint8Array(
                    this.analyser.frequencyBinCount,
                );
                this.timeDomainData = new Uint8Array(this.analyser.fftSize);
            }
            if (settings.smoothingTimeConstant !== undefined) {
                this.analyser.smoothingTimeConstant =
                    settings.smoothingTimeConstant;
            }
        }
    }

    /**
     * Get current time
     */
    getCurrentTime() {
        if (this.audioElement) {
            return this.audioElement.currentTime;
        }
        return 0;
    }

    /**
     * Get duration
     */
    getDuration() {
        if (this.audioElement) {
            return this.audioElement.duration || 0;
        }
        return 0;
    }

    /**
     * Get audio stream for recording/export
     * Creates a MediaStream from the audio output
     */
    getAudioStreamForRecording() {
        if (!this.audioContext) {
            return null;
        }

        try {
            // Create a media stream destination
            const streamDestination =
                this.audioContext.createMediaStreamDestination();

            // Connect the analyser to the stream destination (this captures processed audio)
            this.analyser.connect(streamDestination);

            // Store reference so we can disconnect later
            this._recordingDestination = streamDestination;

            return streamDestination.stream;
        } catch (error) {
            console.error(
                "Failed to create audio stream for recording:",
                error,
            );
            return null;
        }
    }

    /**
     * Stop audio stream recording
     */
    stopAudioStreamRecording() {
        if (this._recordingDestination) {
            try {
                this.analyser.disconnect(this._recordingDestination);
            } catch (e) {
                // Ignore if already disconnected
            }
            this._recordingDestination = null;
        }
    }

    /**
     * Cleanup
     */
    destroy() {
        this.stop();
        this.stopAudioStreamRecording();
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }
}

// Export for use
if (typeof module !== "undefined" && module.exports) {
    module.exports = AudioProcessor;
}
