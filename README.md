# Spectrum Visualizer

A stunning desktop music spectrum visualizer built with Electron and Web Audio API. Experience your music with beautiful real-time visualizations.

![Spectrum Visualizer](assets/screenshot.png)

## Features

### 🎵 Audio Sources
- **Microphone Input**: Real-time visualization from your microphone
- **Audio Files**: Support for MP3, WAV, OGG, FLAC, M4A, AAC formats
- Drag & drop support for audio files

### 🎨 Visualizations
- **Bar Graph**: Classic spectrum analyzer with vertical bars
- **Waveform**: Smooth audio waveform display
- **Circular Spectrum**: Radial frequency visualization with rotating elements
- **Particle Effects**: Dynamic particle system driven by audio
- **Cloud Effects**: Soft, flowing cloud-like visualization
- **Psychedelic Patterns**: Trippy mandala and kaleidoscope effects
- **3D Terrain**: Retro-style 3D terrain visualization

### 🎨 Color Themes
- Neon (Default)
- Fire
- Ocean
- Sunset
- Forest
- Galaxy
- Monochrome
- Rainbow

### ⚙️ Customization
- Adjustable FFT size for analysis detail
- Smoothing control
- Sensitivity adjustment
- Animation speed control
- Bar count and spacing
- Mirror effect toggle
- Glow effect toggle
- Custom background colors
- Gradient backgrounds

### 📹 Export
- Export visualizations as video
- Multiple resolutions: 720p, 1080p, 2K, 4K
- Frame rates: 24, 30, 60 FPS
- Formats: MP4, WebM, GIF

### ⌨️ Keyboard Shortcuts
| Key | Action |
|-----|--------|
| Space | Play/Pause |
| F | Toggle fullscreen |
| S | Open settings |
| 1-7 | Switch visualizations |
| Arrow Up/Down | Adjust volume |
| Arrow Left/Right | Seek 5 seconds |
| Escape | Close panels/Exit fullscreen |

## Installation

### Prerequisites
- Node.js 18 or higher
- npm or yarn

### Setup
```bash
# Clone or navigate to the project
cd spectrum-visualizer

# Install dependencies
npm install

# Start the application
npm start
```

### Development
```bash
# Run with dev tools enabled
npm run dev
```

### Building
```bash
# Build for all platforms
npm run build

# Build for specific platform
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

## Project Structure

```
spectrum-visualizer/
├── src/
│   ├── main/
│   │   └── main.js              # Electron main process
│   ├── renderer/
│   │   ├── index.html           # Main HTML file
│   │   ├── styles.css           # Application styles
│   │   └── renderer.js          # Renderer process logic
│   ├── visualizations/
│   │   ├── base-visualizer.js   # Base visualizer class
│   │   ├── bars-visualizer.js   # Bar graph visualization
│   │   ├── waveform-visualizer.js
│   │   ├── circular-visualizer.js
│   │   ├── particles-visualizer.js
│   │   ├── cloud-visualizer.js
│   │   ├── psychedelic-visualizer.js
│   │   └── terrain-visualizer.js
│   └── utils/
│       ├── audio-processor.js   # Web Audio API handler
│       └── video-exporter.js    # Video export utility
├── assets/
│   └── icons/                   # Application icons
├── package.json
└── README.md
```

## Technical Details

### Web Audio API
The application uses the Web Audio API for real-time audio analysis:
- `AnalyserNode` for FFT analysis
- `MediaElementSource` for file playback
- `MediaStreamSource` for microphone input
- Configurable FFT sizes from 256 to 8192

### Visualization Engine
- Canvas 2D rendering for most visualizations
- Hardware-accelerated animations
- Smooth interpolation and easing
- Dynamic color gradients

### Export System
- Uses `MediaRecorder` API for video capture
- Canvas stream capture for frame recording
- Supports WebM (VP9) and other codecs

## System Requirements

- **OS**: Windows 10+, macOS 10.15+, Linux (Ubuntu 18.04+)
- **RAM**: 4GB minimum, 8GB recommended
- **Graphics**: Hardware acceleration recommended

## License

MIT License - see LICENSE file for details

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Acknowledgments

- Built with [Electron](https://electronjs.org/)
- Audio analysis powered by [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- Color utilities from [Chroma.js](https://gka.github.io/chroma.js/)
