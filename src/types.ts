export type ToolType =
  | 'brush'
  | 'pencil'
  | 'airbrush'
  | 'eraser'
  | 'bucket'
  | 'eyedropper'
  | 'line'
  | 'rect'
  | 'ellipse'
  | 'select'
  | 'pan'
  | 'zoom';

export type BlendMode =
  | 'source-over'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference';

export interface BlendModeOption {
  label: string;
  value: BlendMode;
}

export type LayerType = 'raster' | 'vector';

export interface VectorStroke {
  id: string;
  points: Point[];
  brush: BrushSettings;
  color: string;
  isEraser: boolean;
  timestamp: number;
}

export interface Layer {
  id: string;
  name: string;
  type?: LayerType; // 'raster' | 'vector'
  visible: boolean;
  locked: boolean;
  opacity: number; // 0 to 1
  blendMode: BlendMode;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  thumbnail?: string;
  vectorStrokes?: VectorStroke[];
}

export type BrushTipShape = 'round' | 'chisel' | 'calligraphy' | 'stipple' | 'flat';

export interface DualBrushSettings {
  enabled: boolean;
  tipShape: BrushTipShape;
  blendMode: 'multiply' | 'overlay' | 'screen' | 'color-dodge' | 'darken' | 'source-over';
  sizeRatio: number; // 0.1 to 2.5 (ratio to primary brush size)
  spacing: number; // 0.05 to 0.5
  hardness: number; // 0 to 1
  textureIntensity: number; // 0 to 1
  angle: number; // 0 to 360
  jitter: number; // 0 to 1
}

export interface BrushSettings {
  id: string;
  name: string;
  category: 'watercolor' | 'ink' | 'paint' | 'pencil' | 'airbrush' | 'marker';
  size: number;
  opacity: number; // 0 to 1
  flow: number; // 0 to 1
  hardness: number; // 0 to 1
  spacing: number; // fraction of size, e.g. 0.1 to 0.5
  stabilization: number; // 0 to 30
  tipShape: BrushTipShape;
  angle: number; // 0 to 360 for chisel / calligraphy
  pressureSize: boolean;
  pressureOpacity: boolean;
  mixGroundColor: boolean;
  colorMixRatio: number; // 0 to 1
  colorSmear?: number; // 0 to 1 (pigment pull & physical paint smear)
  jitter: number; // 0 to 1 (scatter/size jitter)
  dualBrush?: DualBrushSettings;
  smartCorrection?: boolean; // hand tremor filter & bezier smoothing
  taperFactor?: number; // 0 to 1 (lead-in and lead-out line tapering)
  tiltSensitivity?: boolean; // stylus tilt affects tip size and elongation
  tiltShading?: boolean; // widens tip into soft pencil shading when tilted
  rotationTwist?: boolean; // Wacom barrel rotation drives brush tip angle
  pressureCurve?: 'linear' | 'soft' | 'firm' | 's-curve';
}

export interface CanvasTransform {
  x: number;
  y: number;
  zoom: number; // e.g. 1 = 100%
  rotation: number; // in degrees
  flipH: boolean;
}

export interface Point {
  x: number;
  y: number;
  pressure: number;
  tiltX?: number; // degrees -90 to +90
  tiltY?: number; // degrees -90 to +90
  twist?: number; // Wacom barrel rotation degrees 0 to 359
  altitudeAngle?: number; // radians 0 to PI/2
  azimuthAngle?: number; // radians 0 to 2*PI
  pointerType?: string; // 'pen' | 'touch' | 'mouse'
  isEraser?: boolean;
  time?: number;
}

export interface WacomStylusState {
  isPen: boolean;
  deviceName: string;
  pressure: number;
  rawPressure: number;
  tiltX: number;
  tiltY: number;
  tiltAngle: number; // calculated overall tilt angle from perpendicular (0 to 90)
  twist: number; // Wacom barrel twist 0 to 359
  azimuth: number; // Direction of pen tilt in degrees 0 to 360
  altitude: number; // Angle from canvas plane in degrees 0 to 90
  isEraserTip: boolean;
  pointerType: string;
}

export interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
  active: boolean;
}

export type TouchInputMode = 'all' | 'stylus_only' | 'finger_calibrated';

export interface TouchCalibrationSettings {
  inputMode: TouchInputMode;
  offsetX: number; // offset in screen pixels for touch
  offsetY: number; // offset in screen pixels for touch
  twoFingerRotate: boolean;
  pressureMultiplier: number; // 0.5 to 2.0
  pressureCurve?: 'linear' | 'soft' | 'firm' | 's-curve';
  enableTilt?: boolean;
  enableRotation?: boolean;
  wacomEraserAutoSwitch?: boolean;
}

export interface HistoryStep {
  layersSnapshot: {
    id: string;
    name: string;
    type?: LayerType;
    vectorStrokes?: VectorStroke[];
    visible: boolean;
    locked: boolean;
    opacity: number;
    blendMode: any;
    imageData: ImageData;
  }[];
  activeLayerId: string;
}

export interface CanvasDocument {
  id: string;
  name: string;
  width: number;
  height: number;
  bgColor: string;
  isModified: boolean;
  layers: Layer[];
  activeLayerId: string;
  transform: CanvasTransform;
  historyStack: HistoryStep[];
  historyIndex: number;
  fileHandle?: FileSystemFileHandle;
}
