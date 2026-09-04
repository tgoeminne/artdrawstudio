# Clip Studio Paint — Web Studio Workspace

A professional digital drawing and painting studio built with **React 19**, **TypeScript**, **Tailwind CSS**, and high-performance **HTML5 Canvas** engines. Designed to bring desktop-grade illustration workflows—customizable brush physics, dual-brush textures, stroke stabilization, multi-layer compositing, vector lineart, and Wacom/Apple Pencil hardware pressure sensitivity—directly to the modern web browser.

---

## ✨ Key Features

### 🖌️ Professional Brush & Dynamics Engine
* **5 Brush Tip Shapes**: Round, Chisel, Calligraphy, Stipple (Grain/Texture), and Flat.
* **Stroke Stabilization (0–30 Levels)**: Clip Studio Paint-style lazy-mouse stabilizer with weighted average smoothing for crisp, jitter-free lineart.
* **Smart Hand-Tremor Correction**: Real-time velocity-weighted Bezier curve smoothing for natural line confidence.
* **Dynamic Lead-in / Lead-out Tapering**: Simulates authentic pen stroke pressure taper when lifting or placing the stylus.
* **Dual-Brush Texture Engine**: Layer a secondary textured tip (stipple, chisel, calligraphy) over your primary stroke with customizable blend modes (*Multiply*, *Overlay*, *Screen*, *Color Dodge*, *Darken*, *Composite*), spacing, and texture intensity.
* **Wet-on-Wet Color Mixing & Pigment Smear**: Realistic paint blending and physical pigment pulling from previously painted canvas strokes.
* **Pressure Dynamics & Curves**: Configurable pressure curves (*Linear*, *Soft*, *Firm*, *S-Curve*) controlling stroke diameter, opacity, and hardness.
* **Wacom & Stylus Hardware Support**: Native Pointer Events integration supporting pen pressure, tilt angles (X/Y altitude & azimuth), tilt shading, Wacom barrel twist rotation, and hardware eraser tail auto-detection.

### 🎨 Desktop Sub Tool [Brush Selection] Floating Palette
* **Live S-Curve Stroke Previews**: Instant visual previews demonstrating pressure taper, dual-brush texture, opacity, and hardness for every brush preset.
* **Color Mode Toggle**: Test stroke dynamics in high-contrast neutral white or in your active primary palette color.
* **Draggable & Pinnable Window**: Freely reposition the Sub Tool window across the workspace or pin it as a persistent studio dock.
* **Category Filtering & Search**: Instant filtering across *Watercolor*, *Ink*, *Paint*, *Pencil*, *Airbrush*, and *Marker*, plus real-time text query search.
* **Inline Previews**: Toggle between numerical slider controls and vertical stroke preview cards directly inside the Sub Tool dock.

### 📑 Layer Management & Vector Engine
* **Raster & Vector Layers**: Draw freehand raster artwork or utilize non-destructive vector stroke layers for resolution-independent editing and SVG export.
* **11 Blending Modes**: *Normal (Source-Over)*, *Multiply*, *Screen*, *Overlay*, *Darken*, *Lighten*, *Color Dodge*, *Color Burn*, *Hard Light*, *Soft Light*, and *Difference*.
* **Full Layer Controls**: Reorder layers (drag/buttons), opacity slider (0–100%), visibility toggle, lock protection, duplicate, merge down, clear, and delete.
* **Live Real-time Thumbnails**: Layer stack previews automatically synchronize after every stroke.
* **Image Layer Import**: Load external images directly onto new layers centered automatically on your canvas.

### 🎯 Color System & HSV Color Wheel
* **Accurate HSV Color Wheel**: 360° Conic-gradient hue ring (0° Red at 12 o'clock, clockwise) with continuous radial scrubbing.
* **Saturation / Value Matrix**: High-precision square picker with boundary clamping and isolated event handling.
* **Primary & Secondary Color Slots**: Fast swapping (<kbd>X</kbd>) between main and alternate colors.
* **Transparency Drawing Mode**: One-key toggle (<kbd>C</kbd>) converting any active brush into an eraser utilizing the brush's own tip shape and texture.
* **Preset Studio Swatches & Eyedropper**: Rapid color sampling (<kbd>I</kbd> or <kbd>Alt</kbd> temporary sample).

### 📐 Canvas Navigation, Tools & Filters
* **Infinite Canvas Navigation**: Smooth pan (<kbd>Space</kbd> + drag or middle mouse), zoom (20% to 500%), 360° canvas rotation, and instant horizontal canvas flip (<kbd>H</kbd>).
* **Selection Tools**: Freehand marquee selection with copy, cut, paste, fill, and delete support.
* **Vector Shapes**: Antialiased Line, Rectangle, and Ellipse rendering.
* **Flood Fill Bucket**: Color-tolerance flood fill engine with threshold boundary detection.
* **Manga & Artistic Filters**: Invert colors, Grayscale conversion, Blur filter, and Halftone Manga Screentone dot generation.

### 📱 Tablet & Mobile Responsive Experience
* **Adaptive Mobile & Desktop UI**: Automatically optimizes for smartphones, iPads, Android tablets, and desktop workstations.
* **Touch & Stylus Calibration**: Dedicated settings sheet with input mode selection (*All Inputs*, *Stylus Only with Palm Rejection*, *Finger Calibrated*), touch coordinate offsets, and pressure multipliers.
* **Multi-Touch Gestures**: Two-finger pinch to zoom, two-finger twist to rotate, two-finger tap to Undo, and three-finger tap to Redo.

### 💾 Project Persistence & Export
* **Export Formats**: High-resolution PNG (with transparency or canvas background), JPEG, and SVG vector paths.
* **Project Save / Load**: Export and restore multi-layer projects as portable `.json` files.
* **Local Recovery**: Auto-persists workspace settings and touch calibrations via `localStorage`.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| <kbd>B</kbd> | Switch to Brush tool / Toggle Sub Tool Brush Selection Menu |
| <kbd>N</kbd> | Pencil Tool |
| <kbd>E</kbd> | Eraser Tool |
| <kbd>G</kbd> | Flood Fill Bucket Tool |
| <kbd>I</kbd> / <kbd>Alt</kbd> | Eyedropper Color Picker |
| <kbd>M</kbd> | Selection Marquee Tool |
| <kbd>U</kbd> | Shape / Line Tool |
| <kbd>H</kbd> | Pan Hand Tool |
| <kbd>Z</kbd> | Zoom Tool |
| <kbd>[</kbd> / <kbd>]</kbd> | Decrease / Increase Brush Size |
| <kbd>X</kbd> | Swap Primary and Secondary Colors |
| <kbd>C</kbd> | Toggle Transparent Color Mode (Draw as Eraser) |
| <kbd>Space</kbd> + Drag | Pan Canvas |
| <kbd>Ctrl</kbd> / <kbd>Cmd</kbd> + <kbd>Z</kbd> | Undo |
| <kbd>Ctrl</kbd> / <kbd>Cmd</kbd> + <kbd>Y</kbd> (or <kbd>Shift</kbd>+<kbd>Z</kbd>) | Redo |
| <kbd>Ctrl</kbd> / <kbd>Cmd</kbd> + <kbd>S</kbd> | Save Project (.json) |
| <kbd>Delete</kbd> / <kbd>Backspace</kbd> | Clear Active Layer / Clear Selection |

---

## 🛠️ Tech Stack

* **Frontend Framework**: [React 19](https://react.dev/)
* **Build Tooling**: [Vite 6](https://vite.dev/)
* **Type System**: [TypeScript 5.8](https://www.typescriptlang.org/)
* **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
* **Animation**: [Motion](https://motion.dev/)
* **Iconography**: [Lucide React](https://lucide.dev/)
* **Canvas Engines**: HTML5 2D Canvas API + Custom Bezier & Vector Path Engines

---

## 🚀 Getting Started

### Prerequisites

Ensure you have **Node.js** (v18.0.0 or higher) and `npm`, `yarn`, `pnpm`, or `bun` installed on your machine.

Verify your Node installation:
```bash
node -v
npm -v
```

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/clip-studio-paint.git
   cd clip-studio-paint
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open in browser:**
   Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## 📦 Scripts

| Script | Command | Description |
| :--- | :--- | :--- |
| `dev` | `npm run dev` | Runs the Vite development server on port 3000 |
| `build` | `npm run build` | Compiles TypeScript and creates an optimized production build in `dist/` |
| `preview` | `npm run preview` | Previews the production build locally |
| `lint` | `npm run lint` | Runs TypeScript type checking (`tsc --noEmit`) |
| `clean` | `npm run clean` | Removes build artifacts (`dist/`) |

---

## 📂 Project Structure

```
.
├── index.html                   # HTML entry point with metadata tags
├── package.json                 # Project configuration and dependencies
├── tsconfig.json                # TypeScript compiler settings
├── vite.config.ts               # Vite configuration with Tailwind & React plugins
├── public/                      # Static assets and favicons
└── src/
    ├── main.tsx                 # React application mounting
    ├── App.tsx                  # Main studio container, state management, shortcuts & layout
    ├── index.css                # Global stylesheet with Tailwind CSS
    ├── types.ts                 # TypeScript interfaces (BrushSettings, Layer, Transform, Stylus)
    ├── components/
    │   ├── CanvasArea.tsx       # Core multi-layer canvas, pointer & stylus event listener
    │   ├── CanvasTabBar.tsx     # Canvas view tabs, zoom & rotation controls, quick brush pill
    │   ├── DesktopBrushSelectionMenu.tsx # Draggable & pinnable Sub Tool brush palette
    │   ├── BrushStrokePreview.tsx # Live S-curve stroke preview canvas renderer
    │   ├── Toolbar.tsx          # Studio left sidebar tool selection with Sub Tool button
    │   ├── TopMenuBar.tsx       # File, Edit, Selection, Layer, Filter, View, and Window menus
    │   ├── BottomStatusBar.tsx  # Cursor coordinates, canvas dimensions, zoom and pressure readout
    │   ├── NewCanvasModal.tsx   # Modal for custom canvas dimensions, DPI, and background presets
    │   ├── Panels/
    │   │   ├── BrushSettingsPanel.tsx  # Sliders, shape selectors, dual-brush & dynamics dock
    │   │   ├── LayersPanel.tsx         # Multi-layer management, blend modes, lock, opacity
    │   │   └── NavigatorAndColor.tsx   # Mini navigator thumbnail, HSV wheel & swatches
    │   └── Mobile/
    │       ├── MobileBottomDock.tsx    # Mobile tool dock with color switchers and quick sheets
    │       ├── MobileColorSheet.tsx    # Touch-friendly full color wheel modal
    │       ├── MobileLayersSheet.tsx   # Mobile layer management drawer
    │       └── TouchCalibrationSheet.tsx # Palm rejection, offset, and stylus calibration
    └── utils/
        ├── brushEngine.ts       # Pressure curves, interpolation, dual-brush rendering, smear
        ├── brushPresets.ts      # Default brushes (G-Pen, Watercolor, Airbrush, Pencil, etc.)
        ├── floodFill.ts         # Boundary fill and color tolerance bucket implementation
        └── vectorEngine.ts      # Non-destructive vector stroke smoothing and SVG export
```

---

## 🎨 Supported Styluses & Hardware

* **Wacom Tablets & Displays**: Intuos, Cintiq, One, MobileStudio Pro (Pressure, Tilt, Barrel Twist, Hardware Eraser).
* **Apple Pencil**: iPad via WebKit/Safari Pointer Events (Pressure, Tilt Altitude/Azimuth).
* **Microsoft Surface Pen**: Surface Pro / Surface Book (Pressure & Tilt).
* **Standard Mice & Touchscreens**: Automatic fallback to simulated pressure curves and touch smoothing.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
