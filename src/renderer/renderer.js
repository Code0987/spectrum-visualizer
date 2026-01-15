/**
 * Spectrum Visualizer - Main Renderer
 * Handles UI and visualization coordination
 */

const { ipcRenderer } = require('electron');

class App {
  constructor() {
    // Core components
    this.audioProcessor = new AudioProcessor();
    this.videoExporter = new VideoExporter();
    this.currentVisualizer = null;
    this.visualizers = {};

    // State
    this.currentVisualization = 'bars';
    this.currentTheme = 'neon';
    this.isPlaying = false;
    this.audioLoaded = false;
    this.currentSource = null; // 'file' or 'mic'

    // DOM Elements
    this.canvas = document.getElementById('visualizer-canvas');
    this.canvasContainer = document.getElementById('canvas-container');
    this.dropZone = document.getElementById('drop-zone');

    // Initialize
    this.init();
  }

  async init() {
    console.log('Initializing Spectrum Visualizer...');

    // Initialize audio processor
    await this.audioProcessor.init();

    // Set up audio processor callbacks
    this.audioProcessor.onTimeUpdate = (currentTime, duration) => {
      this.updateTimeDisplay(currentTime, duration);
    };

    this.audioProcessor.onEnded = () => {
      this.onAudioEnded();
    };

    // Initialize visualizers
    this.initVisualizers();

    // Set up event listeners
    this.setupEventListeners();

    // Set up IPC listeners
    this.setupIpcListeners();

    // Show drop zone initially
    this.showDropZone();

    // Start with default visualizer
    this.setVisualization('bars');

    console.log('Initialization complete');
  }

  initVisualizers() {
    this.visualizers = {
      bars: new BarsVisualizer(this.canvas, this.audioProcessor),
      waveform: new WaveformVisualizer(this.canvas, this.audioProcessor),
      circular: new CircularVisualizer(this.canvas, this.audioProcessor),
      particles: new ParticlesVisualizer(this.canvas, this.audioProcessor),
      cloud: new CloudVisualizer(this.canvas, this.audioProcessor),
      psychedelic: new PsychedelicVisualizer(this.canvas, this.audioProcessor),
      '3d': new TerrainVisualizer(this.canvas, this.audioProcessor)
    };

    // Apply initial theme to all visualizers
    Object.values(this.visualizers).forEach(v => v.setTheme(this.currentTheme));
  }

  setupEventListeners() {
    // Audio control buttons
    document.getElementById('btn-play').addEventListener('click', () => this.togglePlay());
    document.getElementById('btn-stop').addEventListener('click', () => this.stop());

    // Volume control
    document.getElementById('volume-slider').addEventListener('input', (e) => {
      this.audioProcessor.setVolume(e.target.value / 100);
    });

    // Progress bar seeking
    document.getElementById('progress-bar').addEventListener('click', (e) => {
      const rect = e.target.getBoundingClientRect();
      const position = (e.clientX - rect.left) / rect.width;
      this.audioProcessor.seek(position);
    });

    // Source buttons
    document.getElementById('btn-mic').addEventListener('click', () => this.startMicrophone());
    document.getElementById('btn-file').addEventListener('click', () => this.openFileDialog());

    // Visualization buttons
    document.querySelectorAll('.viz-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const viz = btn.dataset.viz;
        this.setVisualization(viz);

        // Update active state
        document.querySelectorAll('.viz-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Theme buttons
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = btn.dataset.theme;
        this.setTheme(theme);

        // Update active state
        document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Settings panel
    document.getElementById('btn-settings').addEventListener('click', () => {
      document.getElementById('settings-panel').classList.toggle('open');
    });

    document.getElementById('btn-close-settings').addEventListener('click', () => {
      document.getElementById('settings-panel').classList.remove('open');
    });

    // Fullscreen button
    document.getElementById('btn-fullscreen').addEventListener('click', () => {
      this.toggleFullscreen();
    });

    // Export button
    document.getElementById('btn-export').addEventListener('click', () => {
      this.startExport();
    });

    document.getElementById('btn-cancel-export').addEventListener('click', () => {
      this.cancelExport();
    });

    // Settings controls
    this.setupSettingsControls();

    // Drop zone events
    this.setupDropZone();

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this.handleKeyboard(e));

    // Window resize
    window.addEventListener('resize', () => {
      if (this.currentVisualizer) {
        this.currentVisualizer.handleResize();
      }
    });
  }

  setupSettingsControls() {
    // FFT Size
    document.getElementById('fft-size').addEventListener('change', (e) => {
      this.audioProcessor.updateSettings({ fftSize: parseInt(e.target.value) });
    });

    // Smoothing
    document.getElementById('smoothing').addEventListener('input', (e) => {
      const value = e.target.value / 100;
      document.getElementById('smoothing-value').textContent = value.toFixed(2);
      this.audioProcessor.updateSettings({ smoothingTimeConstant: value });
    });

    // Sensitivity
    document.getElementById('sensitivity').addEventListener('input', (e) => {
      const value = e.target.value / 100;
      document.getElementById('sensitivity-value').textContent = `${e.target.value}%`;
      this.audioProcessor.updateSettings({ sensitivity: value });
      this.updateVisualizerSettings({ sensitivity: value });
    });

    // Animation Speed
    document.getElementById('animation-speed').addEventListener('input', (e) => {
      const value = e.target.value / 100;
      document.getElementById('speed-value').textContent = `${e.target.value}%`;
      this.updateVisualizerSettings({ animationSpeed: value });
    });

    // Bar Count
    document.getElementById('bar-count').addEventListener('input', (e) => {
      document.getElementById('bar-count-value').textContent = e.target.value;
      this.updateVisualizerSettings({ barCount: parseInt(e.target.value) });
    });

    // Bar Spacing
    document.getElementById('bar-spacing').addEventListener('input', (e) => {
      document.getElementById('bar-spacing-value').textContent = `${e.target.value}px`;
      this.updateVisualizerSettings({ barSpacing: parseInt(e.target.value) });
    });

    // Mirror Effect
    document.getElementById('mirror-effect').addEventListener('change', (e) => {
      this.updateVisualizerSettings({ mirrorEffect: e.target.checked });
    });

    // Glow Effect
    document.getElementById('glow-effect').addEventListener('change', (e) => {
      this.updateVisualizerSettings({ glowEffect: e.target.checked });
    });

    // Background Color
    document.getElementById('bg-color').addEventListener('input', (e) => {
      this.updateVisualizerSettings({ backgroundColor: e.target.value });
    });

    // Gradient Background
    document.getElementById('gradient-bg').addEventListener('change', (e) => {
      this.updateVisualizerSettings({ gradientBackground: e.target.checked });
    });

    // Export settings
    document.getElementById('export-resolution').addEventListener('change', (e) => {
      this.videoExporter.updateSettings({ resolution: e.target.value });
    });

    document.getElementById('export-fps').addEventListener('change', (e) => {
      this.videoExporter.updateSettings({ fps: e.target.value });
    });

    document.getElementById('export-format').addEventListener('change', (e) => {
      this.videoExporter.updateSettings({ format: e.target.value });
    });
  }

  setupDropZone() {
    const dropZone = this.dropZone;

    dropZone.addEventListener('click', () => this.openFileDialog());

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        this.loadAudioFile(files[0].path);
      }
    });

    // Also allow drop on canvas container
    this.canvasContainer.addEventListener('dragover', (e) => e.preventDefault());
    this.canvasContainer.addEventListener('drop', (e) => {
      e.preventDefault();
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        this.loadAudioFile(files[0].path);
      }
    });
  }

  setupIpcListeners() {
    // File selected from menu
    ipcRenderer.on('file-selected', (event, filePath) => {
      this.loadAudioFile(filePath);
    });

    // Visualization change from menu
    ipcRenderer.on('change-visualization', (event, vizType) => {
      this.setVisualization(vizType);

      // Update button state
      document.querySelectorAll('.viz-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.viz === vizType);
      });
    });

    // Export video from menu
    ipcRenderer.on('export-video', () => {
      this.startExport();
    });
  }

  // Audio controls
  async togglePlay() {
    if (!this.audioLoaded && this.currentSource !== 'mic') {
      return;
    }

    if (this.currentSource === 'mic') {
      // For microphone, just toggle visualization
      if (this.isPlaying) {
        this.currentVisualizer.stop();
      } else {
        this.currentVisualizer.start();
      }
      this.isPlaying = !this.isPlaying;
    } else {
      this.isPlaying = this.audioProcessor.togglePlay();
    }

    this.updatePlayButton();
  }

  stop() {
    this.audioProcessor.stop();
    this.isPlaying = false;
    this.updatePlayButton();
    this.updateTimeDisplay(0, this.audioProcessor.getDuration());
    document.getElementById('progress-fill').style.width = '0%';
  }

  updatePlayButton() {
    const btn = document.getElementById('btn-play');
    btn.classList.toggle('playing', this.isPlaying);
  }

  updateTimeDisplay(currentTime, duration) {
    document.getElementById('current-time').textContent = this.formatTime(currentTime);
    document.getElementById('duration').textContent = this.formatTime(duration || 0);

    if (duration > 0) {
      const progress = (currentTime / duration) * 100;
      document.getElementById('progress-fill').style.width = `${progress}%`;
    }
  }

  formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  onAudioEnded() {
    this.isPlaying = false;
    this.updatePlayButton();
  }

  // Audio source handling
  async openFileDialog() {
    const result = await ipcRenderer.invoke('open-file-dialog');
    if (!result.canceled && result.filePaths.length > 0) {
      this.loadAudioFile(result.filePaths[0]);
    }
  }

  async loadAudioFile(filePath) {
    try {
      console.log('Loading audio file:', filePath);

      // Stop any existing audio
      this.stop();
      if (this.currentSource === 'mic') {
        this.audioProcessor.stopMicrophone();
      }

      // Load new file
      const info = await this.audioProcessor.loadFile(filePath);

      this.audioLoaded = true;
      this.currentSource = 'file';

      // Update UI
      this.hideDropZone();
      this.updateFileInfo(filePath);
      this.updateSourceButtons('file');

      // Start playing
      this.audioProcessor.play();
      this.isPlaying = true;
      this.updatePlayButton();

      // Start visualization
      this.currentVisualizer.start();

      console.log('Audio loaded, duration:', info.duration);

    } catch (error) {
      console.error('Failed to load audio file:', error);
      alert('Failed to load audio file. Please try another file.');
    }
  }

  async startMicrophone() {
    try {
      // Stop any existing audio
      this.stop();

      // Start microphone
      const success = await this.audioProcessor.startMicrophone();

      if (success) {
        this.currentSource = 'mic';
        this.audioLoaded = false;

        // Update UI
        this.hideDropZone();
        this.updateSourceButtons('mic');
        document.getElementById('file-info').classList.add('hidden');

        // Reset time display
        document.getElementById('current-time').textContent = '∞';
        document.getElementById('duration').textContent = 'LIVE';
        document.getElementById('progress-fill').style.width = '100%';

        // Start visualization
        this.isPlaying = true;
        this.updatePlayButton();
        this.currentVisualizer.start();

        console.log('Microphone started');
      }

    } catch (error) {
      console.error('Failed to start microphone:', error);
      alert('Failed to access microphone. Please check permissions.');
    }
  }

  updateFileInfo(filePath) {
    const fileName = filePath.split(/[\\/]/).pop();
    const fileInfo = document.getElementById('file-info');
    fileInfo.querySelector('.file-name').textContent = fileName;
    fileInfo.classList.remove('hidden');
  }

  updateSourceButtons(source) {
    document.getElementById('btn-mic').classList.toggle('active', source === 'mic');
    document.getElementById('btn-file').classList.toggle('active', source === 'file');
  }

  showDropZone() {
    this.dropZone.classList.add('visible');
  }

  hideDropZone() {
    this.dropZone.classList.remove('visible');
  }

  // Visualization handling
  setVisualization(type) {
    if (!this.visualizers[type]) {
      console.error('Unknown visualization type:', type);
      return;
    }

    // Stop current visualizer
    if (this.currentVisualizer) {
      this.currentVisualizer.stop();
    }

    // Set new visualizer
    this.currentVisualization = type;
    this.currentVisualizer = this.visualizers[type];
    this.currentVisualizer.setTheme(this.currentTheme);

    // Start if audio is playing or mic is active
    if (this.isPlaying || this.currentSource === 'mic') {
      this.currentVisualizer.start();
    }

    console.log('Visualization changed to:', type);
  }

  setTheme(theme) {
    this.currentTheme = theme;

    // Apply to all visualizers
    Object.values(this.visualizers).forEach(v => v.setTheme(theme));

    console.log('Theme changed to:', theme);
  }

  updateVisualizerSettings(settings) {
    Object.values(this.visualizers).forEach(v => v.updateSettings(settings));
  }

  // Fullscreen
  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  // Export
  async startExport() {
    if (this.videoExporter.isExporting) {
      return;
    }

    // Show export modal
    const modal = document.getElementById('export-modal');
    modal.classList.add('open');

    // Update status
    document.getElementById('export-status').textContent = 'Recording...';
    document.getElementById('export-progress-fill').style.width = '0%';
    document.getElementById('export-progress-text').textContent = '0%';

    try {
      // Start recording
      this.videoExporter.onProgress = (progress) => {
        document.getElementById('export-progress-fill').style.width = `${progress}%`;
        document.getElementById('export-progress-text').textContent = `${Math.round(progress)}%`;
      };

      await this.videoExporter.startRecording(this.canvas);

      // Record for a duration or until stopped
      const duration = this.audioProcessor.getDuration() || 10; // Default 10 seconds

      // Simulate progress for recording
      const startTime = Date.now();
      const progressInterval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        const progress = Math.min((elapsed / duration) * 100, 100);
        document.getElementById('export-progress-fill').style.width = `${progress}%`;
        document.getElementById('export-progress-text').textContent = `${Math.round(progress)}%`;

        if (progress >= 100) {
          clearInterval(progressInterval);
          this.finishExport();
        }
      }, 100);

      // Auto-stop after duration
      setTimeout(() => {
        clearInterval(progressInterval);
        this.finishExport();
      }, duration * 1000);

    } catch (error) {
      console.error('Export failed:', error);
      document.getElementById('export-status').textContent = 'Export failed: ' + error.message;
    }
  }

  async finishExport() {
    document.getElementById('export-status').textContent = 'Saving...';

    try {
      const blob = await this.videoExporter.stopRecording();

      if (blob && blob.size > 0) {
        // Ask user for save location
        const ext = this.videoExporter.getFileExtension();
        const result = await ipcRenderer.invoke('save-file-dialog', {
          defaultPath: `spectrum-visualization.${ext}`,
          filters: [
            { name: 'Video Files', extensions: [ext] }
          ]
        });

        if (!result.canceled && result.filePath) {
          await this.videoExporter.saveToFile(blob, result.filePath);
          document.getElementById('export-status').textContent = 'Export complete!';
        } else {
          // If user cancels save dialog, offer download instead
          this.videoExporter.downloadBlob(blob, `spectrum-visualization.${ext}`);
          document.getElementById('export-status').textContent = 'Downloaded!';
        }
      }

      // Close modal after a delay
      setTimeout(() => {
        document.getElementById('export-modal').classList.remove('open');
      }, 1500);

    } catch (error) {
      console.error('Failed to finish export:', error);
      document.getElementById('export-status').textContent = 'Failed to save: ' + error.message;
    }
  }

  cancelExport() {
    this.videoExporter.cancelRecording();
    document.getElementById('export-modal').classList.remove('open');
  }

  // Keyboard handling
  handleKeyboard(e) {
    // Don't handle if typing in input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') {
      return;
    }

    switch (e.code) {
      case 'Space':
        e.preventDefault();
        this.togglePlay();
        break;
      case 'Escape':
        if (document.fullscreenElement) {
          document.exitFullscreen();
        }
        document.getElementById('settings-panel').classList.remove('open');
        document.getElementById('export-modal').classList.remove('open');
        break;
      case 'KeyF':
        this.toggleFullscreen();
        break;
      case 'KeyS':
        document.getElementById('settings-panel').classList.toggle('open');
        break;
      case 'Digit1':
        this.setVisualization('bars');
        break;
      case 'Digit2':
        this.setVisualization('waveform');
        break;
      case 'Digit3':
        this.setVisualization('circular');
        break;
      case 'Digit4':
        this.setVisualization('particles');
        break;
      case 'Digit5':
        this.setVisualization('cloud');
        break;
      case 'Digit6':
        this.setVisualization('psychedelic');
        break;
      case 'Digit7':
        this.setVisualization('3d');
        break;
      case 'ArrowRight':
        if (this.audioLoaded) {
          const current = this.audioProcessor.getCurrentTime();
          const duration = this.audioProcessor.getDuration();
          this.audioProcessor.seek(Math.min(1, (current + 5) / duration));
        }
        break;
      case 'ArrowLeft':
        if (this.audioLoaded) {
          const current = this.audioProcessor.getCurrentTime();
          const duration = this.audioProcessor.getDuration();
          this.audioProcessor.seek(Math.max(0, (current - 5) / duration));
        }
        break;
      case 'ArrowUp':
        const volUp = Math.min(100, parseInt(document.getElementById('volume-slider').value) + 10);
        document.getElementById('volume-slider').value = volUp;
        this.audioProcessor.setVolume(volUp / 100);
        break;
      case 'ArrowDown':
        const volDown = Math.max(0, parseInt(document.getElementById('volume-slider').value) - 10);
        document.getElementById('volume-slider').value = volDown;
        this.audioProcessor.setVolume(volDown / 100);
        break;
    }
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
