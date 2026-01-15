/**
 * Video Exporter
 * Exports canvas visualization as video files
 */

class VideoExporter {
  constructor() {
    this.isExporting = false;
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.canvas = null;
    this.stream = null;

    this.settings = {
      resolution: '1080',
      fps: 30,
      format: 'webm',
      bitrate: 8000000 // 8 Mbps
    };

    this.onProgress = null;
    this.onComplete = null;
    this.onError = null;

    this.resolutions = {
      '720': { width: 1280, height: 720 },
      '1080': { width: 1920, height: 1080 },
      '1440': { width: 2560, height: 1440 },
      '2160': { width: 3840, height: 2160 }
    };

    this.mimeTypes = {
      'webm': 'video/webm;codecs=vp9',
      'mp4': 'video/webm;codecs=h264', // Will be converted
      'gif': 'image/gif'
    };
  }

  /**
   * Update export settings
   */
  updateSettings(newSettings) {
    Object.assign(this.settings, newSettings);
  }

  /**
   * Get supported MIME type
   */
  getSupportedMimeType() {
    const preferredTypes = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4'
    ];

    for (const type of preferredTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return 'video/webm';
  }

  /**
   * Create export canvas with specified resolution
   */
  createExportCanvas(sourceCanvas) {
    const resolution = this.resolutions[this.settings.resolution];
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = resolution.width;
    exportCanvas.height = resolution.height;
    return exportCanvas;
  }

  /**
   * Start recording from canvas
   */
  async startRecording(canvas, duration = null) {
    if (this.isExporting) {
      throw new Error('Export already in progress');
    }

    try {
      this.isExporting = true;
      this.recordedChunks = [];
      this.canvas = canvas;

      // Get canvas stream
      const fps = parseInt(this.settings.fps);
      this.stream = canvas.captureStream(fps);

      // Get supported MIME type
      const mimeType = this.getSupportedMimeType();

      // Create media recorder
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: mimeType,
        videoBitsPerSecond: this.settings.bitrate
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onerror = (error) => {
        console.error('MediaRecorder error:', error);
        if (this.onError) this.onError(error);
        this.stopRecording();
      };

      // Start recording
      this.mediaRecorder.start(100); // Collect data every 100ms

      console.log('Recording started');

      // If duration specified, auto-stop
      if (duration) {
        this.recordingTimer = setTimeout(() => {
          this.stopRecording();
        }, duration * 1000);
      }

      return true;

    } catch (error) {
      console.error('Failed to start recording:', error);
      this.isExporting = false;
      if (this.onError) this.onError(error);
      return false;
    }
  }

  /**
   * Stop recording and get video blob
   */
  async stopRecording() {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        this.isExporting = false;
        resolve(null);
        return;
      }

      if (this.recordingTimer) {
        clearTimeout(this.recordingTimer);
        this.recordingTimer = null;
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, {
          type: this.getSupportedMimeType()
        });

        this.isExporting = false;
        this.recordedChunks = [];

        console.log('Recording stopped, blob size:', blob.size);

        if (this.onComplete) {
          this.onComplete(blob);
        }

        resolve(blob);
      };

      this.mediaRecorder.stop();

      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
      }
    });
  }

  /**
   * Cancel recording
   */
  cancelRecording() {
    if (this.recordingTimer) {
      clearTimeout(this.recordingTimer);
      this.recordingTimer = null;
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }

    this.isExporting = false;
    this.recordedChunks = [];

    console.log('Recording cancelled');
  }

  /**
   * Export canvas frames as GIF (simplified version)
   */
  async exportAsGif(canvas, duration, audioProcessor, visualizer) {
    if (this.isExporting) {
      throw new Error('Export already in progress');
    }

    this.isExporting = true;

    const fps = parseInt(this.settings.fps);
    const frameCount = duration * fps;
    const frameDelay = 1000 / fps;
    const frames = [];

    try {
      // Capture frames
      for (let i = 0; i < frameCount; i++) {
        // Update visualization
        visualizer.draw(1 / fps);

        // Capture frame
        const imageData = canvas.toDataURL('image/png');
        frames.push(imageData);

        // Report progress
        if (this.onProgress) {
          this.onProgress((i / frameCount) * 100);
        }

        // Small delay to allow UI update
        await new Promise(r => setTimeout(r, 10));
      }

      // Create animated GIF using data URLs
      // Note: Real GIF encoding would require a library like gif.js
      // For now, we'll return frames that can be processed

      this.isExporting = false;

      if (this.onComplete) {
        this.onComplete(frames);
      }

      return frames;

    } catch (error) {
      this.isExporting = false;
      if (this.onError) this.onError(error);
      throw error;
    }
  }

  /**
   * Save blob to file (requires IPC for Electron)
   */
  async saveToFile(blob, filePath) {
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const { ipcRenderer } = require('electron');

      await ipcRenderer.invoke('write-file', filePath, arrayBuffer);

      console.log('Video saved to:', filePath);
      return true;

    } catch (error) {
      console.error('Failed to save file:', error);
      if (this.onError) this.onError(error);
      return false;
    }
  }

  /**
   * Download blob in browser
   */
  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Get file extension for current format
   */
  getFileExtension() {
    const format = this.settings.format;
    if (format === 'mp4') return 'mp4';
    if (format === 'gif') return 'gif';
    return 'webm';
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VideoExporter;
}
