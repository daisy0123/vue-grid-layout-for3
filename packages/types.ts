import elementResizeDetectorMaker from 'element-resize-detector';

export interface Pos {
  left?: number;
  right?: number;
  top: number;
  width: number;
  height: number;
}

export interface WH {
  width: number;
  height: number;
}

export interface GridItemProps {
  isDraggable: boolean | null;
  isResizable: boolean | null;
  isBounded: boolean | null;
  static: boolean;
  minH: number;
  minW: number;
  maxH: number;
  maxW: number;
  x: number;
  y: number;
  w: number;
  h: number;
  i: string | number;
  dragIgnoreFrom: string;
  dragAllowFrom: string | null;
  resizeIgnoreFrom: string;
  preserveAspectRatio: boolean;
  dragOption: { [key: string]: any };
  resizeOption: { [key: string]: any };
}

export interface EventBusProps {
  resizeEvent?: EventsData;
  dragEvent?: EventsData;
  updateWidth: number;
  setColNum: number;
  setRowHeight: number;
  setDraggable: boolean;
  setResizable: boolean;
  setBounded: boolean;
  setTransformScale: number;
  setMaxRows: number;
  compact?: undefined;
  directionchange: undefined;
}

export interface EventsData {
  eventType: string | symbol;
  i: string | number;
  x: number;
  y: number;
  h: number;
  w: number;
}

export interface LayoutItemRequired {
  w: number;
  h: number;
  x: number;
  y: number;
  i: string;
}

export interface Placeholder {
  x: number;
  y: number;
  w: number;
  h: number;
  i: number | string;
}

export interface LayoutData {
  width: number | null;
  mergeStyle: { [key: string]: string };
  lastLayoutLength: number;
  isDragging: boolean;
  placeholder: Placeholder;
  layouts: { [key: string]: Layout | any };
  lastBreakpoint: string | null;
  originalLayout: Layout | null;
  erd: elementResizeDetectorMaker.Erd | null;
  positionsBeforeDrag: { [key: string]: string };
  this$refsLayout: HTMLElement;
}

export interface GridLayoutProps {
  autoSize: boolean;
  colNum: number;
  rowHeight: number;
  maxRows: number;
  margin: Array<number>;
  isDraggable: boolean;
  isResizable: boolean;
  isMirrored: boolean;
  isBounded: boolean;
  useCssTransforms: boolean;
  verticalCompact: boolean;
  restoreOnDrag: boolean;
  layout: Layout;
  responsive: boolean;
  responsiveLayouts: { [key: string]: any };
  transformScale: number;
  breakpoints: Breakpoints;
  cols: Cols;
  preventCollision: boolean;
  useStyleCursor: boolean;
}

export type Ins = (GridLayoutProps & LayoutData) | undefined;

export interface Point {
  x: number;
  y: number;
}

export type ResponsiveLayout = {
  lg?: Layout;
  md?: Layout;
  sm?: Layout;
  xs?: Layout;
  xxs?: Layout;
};

export type Breakpoint = string;

export type Breakpoints = {
  lg?: number;
  md?: number;
  sm?: number;
  xs?: number;
  xxs?: number;
};

export type Cols = {
  lg: number;
  md: number;
  sm: number;
  xs: number;
  xxs: number;
};

export interface DraggableCoreData {
  deltaX: number;
  deltaY: number;
  lastX: number;
  lastY: number;
  x: number;
  y: number;
}

export interface LayoutItemRequired {
  w: number;
  h: number;
  x: number;
  y: number;
  i: string;
}

export type LayoutItem = LayoutItemRequired & {
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  moved?: boolean;
  static?: boolean;
  isDraggable?: boolean;
  isResizable?: boolean;
};

export type Layout = Array<LayoutItem>;
// export type Position = {left: number, top: number, width: number, height: number};
/*
export type DragCallbackData = {
  node: HTMLElement,
  x: number, y: number,
  deltaX: number, deltaY: number,
  lastX: number, lastY: number
};
*/
// export type DragEvent = {e: Event} & DragCallbackData;
export type Size = { width: number; height: number };
// export type ResizeEvent = {e: Event, node: HTMLElement, size: Size};
