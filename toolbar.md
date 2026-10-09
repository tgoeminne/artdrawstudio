# ArtDrawStudio — Toolbar & Tooling Documentation

`ArtDrawStudio` is a professional digital drawing, 2D CAD vector illustration, and typography studio built with React 19, TypeScript, and HTML5 Canvas engines. The primary tool workflow is centered around the left-side vertical **Toolbar** (`Toolbar.tsx`), supported by dedicated sub-tool palettes, 2D CAD vector action bars, on-canvas typography quick bars, and Google Fonts cloud integrations.

---

## 1. Overview of the Toolbar

The desktop toolbar is located on the far left edge of the studio workspace (`w-12`, 48px width, dark slate theme `#2d2d2d` with a `#000000` right border).

It is organized into three primary sections:
1. **Primary Tool Buttons**: 10 primary drawing, vector CAD, typography, editing, and navigation tools.
2. **Sub Tool [Brush Selection] Dock**: A dedicated button displaying a live micro stroke preview, brush size, and quick toggle for the floating Brush Palette.
3. **Color Switcher & Transparency Mode**: Overlapping primary/secondary color swatches, color swap button, and ArtDrawStudio's signature Transparent Color Mode toggle.

---

## 2. Core Toolbar Tools

| Icon | Tool Name | Tool ID | Shortcut | Description & Functionality |
| :---: | :--- | :--- | :---: | :--- |
| <kbd>🖌️</kbd> | **Brush Presets** | `brush` | <kbd>B</kbd> / <kbd>P</kbd> | **Freehand Raster & Stylus Painting**: The default drawing tool. Supports pressure sensitivity (Wacom/Apple Pencil), tilt angle & shading, barrel twist rotation, 5 tip shapes (Round, Chisel, Calligraphy, Stipple, Flat), stroke stabilization (0–30 lazy-mouse levels), smart tremor correction, dynamic tapering, wet-on-wet paint mixing, and dual-brush textures. Clicking when already active toggles the Sub Tool Brush Menu. |
| <kbd>✒️</kbd> | **Vector Pen (2D CAD)** | `vector` | <kbd>V</kbd> | **Complete 2D CAD Vector Engine**: Draw point-by-point polygon shapes and smooth Bezier curves with control handles. Supports interactive node editing, corner vs smooth tangents, grid snapping, orthogonal angle snapping (<kbd>Shift</kbd>), stroke styles (solid/dashed/dotted), and color fills. See Section 3 for full 2D CAD documentation. |
| <kbd>T</kbd> | **Text & Typography** | `text` | <kbd>T</kbd> | **Complete Typography & Google Fonts Engine**: Add, select, drag, edit, and delete vector text directly on the canvas. Features on-canvas quick typography bar, deep text styling (bold, italic, underline, strikethrough, uppercase, letter-spacing, outline strokes, drop shadows), and a full Google Fonts Library Browser. See Section 4 for details. |
| <kbd>🧹</kbd> | **Eraser** | `eraser` | <kbd>E</kbd> | **Pixel & Vector Eraser**: Erases artwork on the active layer. On raster layers, it removes pixels using destination-out compositing with pressure-sensitive size and opacity. On vector layers, it calculates geometric intersections via `vectorEraseAt` to cleanly excise touched vector segments. Also automatically triggered if using the hardware eraser tail of a stylus. |
| <kbd>🪣</kbd> | **Fill / Paint Bucket** | `bucket` | <kbd>G</kbd> | **Boundary Flood Fill**: Performs instant 4-directional boundary flood filling (`floodFill`) on the active layer using the primary color and current brush opacity, stopping at existing colored pixel edges. |
| <kbd>💧</kbd> | **Eyedropper** | `eyedropper` | <kbd>I</kbd> | **Color Sampler**: Samples the composited RGBA color directly from the canvas beneath the cursor and sets it as the active primary color. Can also be invoked temporarily from any tool by holding the <kbd>Alt</kbd> key. |
| <kbd>➖</kbd> | **Figure / Line** | `line` | <kbd>U</kbd> | **Geometric Line Drawing**: Interactive vector/figure line tool. Clicking and dragging displays a live interactive preview line on an overlay canvas; releasing commits a crisp, antialiased straight line onto the active layer using the current primary color, stroke width, and opacity. |
| <kbd>⬚</kbd> | **Marquee Selection** | `select` | <kbd>M</kbd> | **Rectangular Selection**: Click and drag to create an active selection box (`SelectionRect`). Displays an animated dashed marquee boundary. The selected area can be cleared with <kbd>Delete</kbd> / <kbd>Backspace</kbd>, filled, cut, copied, or modified. |
| <kbd>✋</kbd> | **Move / Hand Tool** | `pan` | <kbd>H</kbd> | **Canvas Panning**: Drags the canvas viewport across screen coordinates (`transform.x`, `transform.y`). Also accessible at any time without switching tools by holding <kbd>Space</kbd> + dragging or pressing the middle mouse button. |
| <kbd>🔍</kbd> | **Zoom Tool** | `zoom` | <kbd>Z</kbd> | **Canvas Magnifier**: Click on the canvas to zoom in by 1.33x (up to 800% / 8.0x). Hold <kbd>Alt</kbd> while clicking to zoom out by 0.75x (down to 10% / 0.1x). |

---

## 3. Vector Pen — Complete 2D CAD Vector Engine

When the **Vector Pen** (`V`) is selected, ArtDrawStudio opens the top **2D CAD Vector Control Bar** (`VectorCadBar.tsx`) and activates specialized interactive CAD drawing and node editing modes:

### 3.1 CAD Modes
- **Draw Mode (`draw`)**: 
  - **Click** anywhere on the canvas to place a sharp corner node (polygon vertex).
  - **Click and Drag** to place a smooth anchor point while dynamically pulling out forward and backward Bezier tangent control handles (`handleIn` and `handleOut`).
  - **Snap to Start Node**: Hovering within 14px of the first anchor point highlights the start node and snaps to it. Clicking automatically closes the shape and commits the completed vector polygon/path.
  - **Live Rubberband & Tangent Preview**: Shows real-time interactive previews of the upcoming line/curve segment, current anchor coordinates, and Bezier control handles.
- **Edit Nodes Mode (`edit`)**:
  - Click on any existing vector path or polygon to select it.
  - Anchor nodes render as square interactive points; smooth nodes display circular tangent handles connected by guide lines.
  - Drag anchor points to reposition vertices.
  - Drag tangent handles to adjust curve curvature, angle, and tension.
  - Click **Corner / Smooth** button in the CAD bar to toggle the selected node between a sharp vertex and a smoothed Bezier tangent.
  - Press <kbd>Delete</kbd> or <kbd>Backspace</kbd> to delete the selected node or path.

### 3.2 2D CAD Snapping & Alignment
- **Ortho Snapping (<kbd>Shift</kbd>)**: Holding <kbd>Shift</kbd> (or toggling the **Ortho** button in `VectorCadBar`) constrains line angles strictly to 0°, 45°, 90°, 135°, and 180° CAD axes.
- **Grid Snapping**: Toggling the **Snap Grid** button snaps anchor points and Bezier handles to 20px grid intervals.

### 3.3 Stroke & Fill Styling
- **Stroke Color**: Color picker and quick presets.
- **Stroke Width**: Adjustable from 1px to 64px.
- **Dash Styles**: Switch between **Solid**, **Dashed** (`[10, 6]`), and **Dotted** (`[3, 5]`) strokes.
- **Fill Color**: Choose transparent (`none`) or solid/translucent fills with even-odd / non-zero winding rules.
- **Closed / Open Path**: Toggle open polylines versus closed polygon boundaries.

### 3.4 Path Completion Shortcuts
- <kbd>Enter</kbd>: Finish and commit the in-progress CAD path to the active vector layer.
- <kbd>Escape</kbd>: Cancel the in-progress path or deselect current path/node.

---

## 4. Text & Typography — Complete Google Fonts System

When the **Text Tool** (`T`) is active, ArtDrawStudio integrates full on-canvas typography manipulation and Google Fonts cloud integration:

### 4.1 On-Canvas Typography Operations
- **Place Text**: Click anywhere on the canvas to place a new typography object. Opens the comprehensive `TextToolDialog`.
- **Select & Move**: Click any existing text block to select it. An interactive cyan bounding box appears with corner anchors. Drag to freely move text across the canvas.
- **Quick Edit Bar (`TextQuickBar.tsx`)**: Appears automatically above the canvas when text is selected or the text tool is active:
  - Font Family dropdown (populated with project & Google fonts).
  - Quick Google Fonts Library Modal launcher (<kbd>✦ Google Fonts</kbd>).
  - Font size stepper & input.
  - Bold, Italic, Underline, and Strikethrough toggles.
  - Left, Center, and Right alignment.
  - Color swatch selector.
  - Trash button to delete selected text.
- **Double-Click**: Double-clicking any text block opens the full `TextToolDialog` to edit its content and advanced typographic properties.
- **Delete**: Select text and press <kbd>Delete</kbd> or <kbd>Backspace</kbd> to remove it.

### 4.2 Comprehensive Text Tool Dialog (`TextToolDialog.tsx`)
Features full design-grade typography controls:
- **Typography**: Text string, font family, font size (6–512px), font weight (100–900 / Thin to Black), line height, letter spacing, uppercase transformation.
- **Styles**: Bold, Italic, Underline, Strikethrough, Text Alignment (Left, Center, Right).
- **Stroke Outline**: Toggleable text outline stroke with customizable stroke color and width (1–30px).
- **Drop Shadow**: Toggleable text drop shadow with blur radius, color, and horizontal/vertical offsets.
- **Live Preview Window**: Real-time rendering card displaying typographic choices before committing.

### 4.3 Google Fonts Library Browser (`GoogleFontLibraryModal.tsx`)
- **Vast Catalog**: Browse curated popular Google Fonts across categories:
  - **Sans-Serif**: Inter, Roboto, Open Sans, Montserrat, Poppins, Lato, Oswald, Raleway, Nunito, Rubik, Ubuntu, etc.
  - **Serif**: Playfair Display, Merriweather, Lora, PT Serif, Cinzel, Cormorant Garamond, EB Garamond, etc.
  - **Display / Decorative**: Bebas Neue, Lobster, Pacifico, Righteous, Abril Fatface, Comfortaa, Bangers, etc.
  - **Handwriting**: Caveat, Dancing Script, Kalam, Satisfy, Shadows Into Light, Indie Flower, Sacramento, etc.
  - **Monospace**: Fira Code, JetBrains Mono, Source Code Pro, Space Mono, Inconsolata, Roboto Mono, etc.
- **Real-Time Search & Category Filters**: Search Google Fonts by name or filter by design classification.
- **Live Interactive Previews**: Type custom preview sentences and adjust sample font sizes.
- **Direct Custom Font Loader**: Enter any font name published on Google Fonts to dynamically inject and preview it.
- **Project Fonts Management**: Add fonts to project with one click. Project fonts persist in `localStorage` and automatically preload when ArtDrawStudio launches.

---

## 5. Sub Tool [Brush Selection] Dedicated Dock Button

Located directly beneath the tool buttons (`id="btn-toolbar-subtool-brushes"`):
- **Live Micro Stroke Preview**: Contains an embedded 28x12px canvas showing real-time pressure taper, dual-brush grain, and stroke dynamics of the currently selected brush.
- **Badge & Size Display**: Displays a `SUB` indicator badge along with the active brush diameter (e.g. `24px`).
- **Floating Brush Menu Launcher**: Clicking opens the draggable and pinnable `DesktopBrushSelectionMenu` palette:
  - **Category Filters**: Filter presets by *Watercolor*, *Ink*, *Paint*, *Pencil*, *Airbrush*, and *Marker*.
  - **Real-Time Search**: Search brushes by name or description.
  - **Stroke Previews**: Full S-curve live preview cards for each preset.
  - **Color Mode**: Toggle between high-contrast white stroke preview and active palette color.
  - **View Layouts**: Switch between detailed list view and compact grid view.

---

## 6. Color Controls & Transparent Mode

Located at the bottom of the toolbar:

1. **Transparent Color Mode (`btn-transparent-mode`)**
   - **Shortcut**: <kbd>C</kbd>
   - **Visual**: Checkerboard transparency icon with an active blue dot indicator.
   - **Functionality**: ArtDrawStudio signature feature. Rather than switching to a standard circular eraser, Transparent Mode turns the *currently active brush* into an eraser while retaining all of that brush's textures, grain, tip shape, hardness, dual-brush blend, and stylus pressure response.
2. **Primary & Secondary Color Swatches**
   - **Primary Swatch**: Front circular swatch with a white ring showing the current drawing color.
   - **Secondary Swatch**: Offset rear circular swatch displaying the alternate background/accent color.
3. **Swap Colors Button (`btn-swap-colors`)**
   - **Shortcut**: <kbd>X</kbd>
   - **Icon**: `ArrowLeftRight`
   - **Functionality**: Instantly exchanges the primary and secondary colors.

---

## 7. Keyboard Shortcuts Quick Reference

| Key | Action |
| :---: | :--- |
| <kbd>B</kbd> | Switch to Brush tool / Toggle Brush Sub Tool Menu |
| <kbd>P</kbd> | Switch to Brush tool |
| <kbd>V</kbd> | Switch to 2D CAD Vector Pen tool (auto-creates vector layer if needed) |
| <kbd>T</kbd> | Switch to Text & Typography tool |
| <kbd>E</kbd> | Switch to Eraser tool |
| <kbd>G</kbd> | Switch to Fill Bucket tool |
| <kbd>I</kbd> / <kbd>Alt</kbd> | Eyedropper tool / Temporary color sample |
| <kbd>U</kbd> | Switch to Figure / Line tool |
| <kbd>M</kbd> | Switch to Marquee Selection tool |
| <kbd>H</kbd> | Switch to Pan / Hand tool |
| <kbd>Z</kbd> | Switch to Zoom tool |
| <kbd>Enter</kbd> | Finish & commit in-progress 2D CAD vector path |
| <kbd>Escape</kbd> | Cancel in-progress path / Deselect vector path, node, or text |
| <kbd>Shift</kbd> (Hold) | Orthogonal snap mode (locks CAD segments to 0°, 45°, 90°, 135°, 180°) |
| <kbd>Delete</kbd> / <kbd>Backspace</kbd> | Delete selected text, CAD node, vector path, or clear active layer |
| <kbd>[</kbd> / <kbd>]</kbd> | Decrease / Increase brush size by 4px |
| <kbd>X</kbd> | Swap Primary and Secondary colors |
| <kbd>C</kbd> | Toggle Transparent Color Mode (Draw as Eraser) |
| <kbd>Space</kbd> + Drag | Pan Canvas Viewport |

---

## 8. Mobile & Touch Responsive Adaptation

On smaller screens and mobile devices, ArtDrawStudio adapts the desktop toolbar into:
- **`MobileBottomDock`**: Displays the active tool, color swatches, layer toggle, and brush size slider.
- **`MobileToolsSheet`**: Full bottom drawer presenting all 10 core tools with touch-friendly tap targets and descriptions.
- **Mobile CAD & Typography Bars**: Responsive floating bars rendered directly above the canvas for full vector and typography manipulation on tablets and mobile touch screens.
- **Touch Calibration**: Specialized touch and stylus settings including palm rejection, coordinate offset calibration, and pressure sensitivity tuning.
