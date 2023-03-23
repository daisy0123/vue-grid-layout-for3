<template>
  <div
    ref="this$refsItem"
    class="vue-grid-item"
    :class="classObj"
    :style="styleObj"
  >
    <slot></slot>
    <span
      v-if="resizableAndNotStatic"
      ref="handle"
      :class="resizableHandleClass"
    />
    <!--<span v-if="draggable" ref="dragHandle" class="vue-draggable-handle"></span>-->
  </div>
</template>

<script lang="ts">
import {
  computed,
  defineComponent,
  inject,
  onBeforeUnmount,
  onMounted,
  ref,
  useSlots,
  watch,
} from 'vue';
import { Breakpoints, EventsData, GridItemProps, Ins, Pos, WH } from '../types';
import { Emitter } from 'mitt';
import { Interactable } from '@interactjs/core/Interactable';
import useCurrentInstance from '../hooks/useCurrentInstance';
import { getDocumentDir } from '../helpers/DOM';
import { getControlPosition, createCoreData } from '../helpers/draggableUtils';
import { getColsFromBreakpoint } from '../helpers/responsiveUtils';
import {
  setTransformRtl,
  setTransform,
  setTopRight,
  setTopLeft,
} from '../helpers/utils';

import '@interactjs/auto-start';
import '@interactjs/auto-scroll';
import '@interactjs/actions/drag';
import '@interactjs/actions/resize';
import '@interactjs/modifiers';
import '@interactjs/dev-tools';
import interact from '@interactjs/interact';

import './index.less';

export default defineComponent({
  name: 'GridItem',
  props: {
    isDraggable: {
      type: Boolean,
      default: null,
    },
    isResizable: {
      type: Boolean,
      default: null,
    },
    isBounded: {
      type: Boolean,
      default: null,
    },
    static: {
      type: Boolean,
      default: false,
    },
    minH: {
      type: Number,
      default: 1,
    },
    minW: {
      type: Number,
      default: 1,
    },
    maxH: {
      type: Number,
      default: Infinity,
    },
    maxW: {
      type: Number,
      default: Infinity,
    },
    x: {
      type: Number,
      required: true,
    },
    y: {
      type: Number,
      required: true,
    },
    w: {
      type: Number,
      required: true,
    },
    h: {
      type: Number,
      required: true,
    },
    i: {
      type: [String, Number],
      required: true,
    },
    dragIgnoreFrom: {
      type: String,
      default: 'a, button',
    },
    dragAllowFrom: {
      type: String,
      default: null,
    },
    resizeIgnoreFrom: {
      type: String,
      default: 'a, button',
    },
    preserveAspectRatio: {
      type: Boolean,
      default: false,
    },
    dragOption: {
      type: Object,
      default: () => ({}),
    },
    resizeOption: {
      type: Object,
      default: () => ({}),
    },
  },
  setup(props: GridItemProps, { emit }) {
    const { proxy } = useCurrentInstance();
    const thisLayout = proxy?.$parent as Ins;

    const eventBus = inject('eventBus') as Emitter<{
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
    }>;

    const this$refsItem = ref<HTMLElement>({} as HTMLElement);
    const cols = ref<number>(1);
    const containerWidth = ref<number>(100);
    const rowHeight = ref<number>(30);
    const margin = ref<Array<number>>([10, 10]);
    const maxRows = ref<number>(Infinity);
    const draggable = ref<boolean | null | undefined>(null);
    const resizable = ref<boolean | null | undefined>(null);
    const transformScale = ref<number>(1);
    const useCssTransforms = ref<boolean>(true);
    const useStyleCursor = ref<boolean>(true);
    const isDragging = ref(false);
    const dragging = ref<Pos | null>(null);
    const isResizing = ref(false);
    const resizing = ref<WH | null>(null);
    const lastX = ref(NaN);
    const lastY = ref(NaN);
    const lastW = ref(NaN);
    const lastH = ref(NaN);
    const styleObj = ref({} as any);
    const rtl = ref(false);
    const dragEventSet = ref(false);
    const resizeEventSet = ref(false);
    const previousW = ref<number | null>(null);
    const previousH = ref<number | null>(null);
    const previousX = ref<number | null>(null);
    const previousY = ref<number | null>(null);
    const innerX = ref<number>(props.x);
    const innerY = ref<number>(props.y);
    const innerW = ref<number>(props.w);
    const innerH = ref<number>(props.h);

    const bounded = ref<boolean | null | undefined>(null);
    const interactObj = ref<Interactable | null>(null);

    const classObj = computed(() => {
      return {
        static: props.static,
        resizing: isResizing.value,
        cssTransforms: useCssTransforms.value,
        'vue-resizable': resizableAndNotStatic.value,
        'vue-draggable-dragging': isDragging.value,
        'render-rtl': renderRtl.value,
        'disable-userselect': isDragging.value,
        'no-touch': isAndroid.value && draggableOrResizableAndNotStatic.value,
      };
    });
    const resizableAndNotStatic = computed(() => {
      return resizable.value && !props.static;
    });
    const draggableOrResizableAndNotStatic = computed(() => {
      return (draggable.value || resizable.value) && !props.static;
    });
    const isAndroid = computed(() => {
      return navigator.userAgent.toLowerCase().indexOf('android') !== -1;
    });
    const renderRtl = computed(() => {
      return thisLayout?.isMirrored ? !rtl.value : rtl.value;
    });
    const resizableHandleClass = computed(() => {
      if (renderRtl.value) {
        return 'vue-resizable-handle vue-rtl-resizable-handle';
      } else {
        return 'vue-resizable-handle';
      }
    });

    watch(
      () => props.isDraggable,
      (val) => {
        draggable.value = val;
      }
    );
    watch(
      () => props.static,
      () => {
        tryMakeDraggable();
        tryMakeResizable();
      }
    );
    watch(draggable, () => {
      tryMakeDraggable();
    });
    watch(
      () => props.isResizable,
      (val) => {
        resizable.value = val;
      }
    );
    watch(
      () => props.isBounded,
      (val) => {
        bounded.value = val;
      }
    );
    watch(resizable, () => {
      tryMakeResizable();
    });
    watch(rowHeight, () => {
      createStyle();
      emitContainerResized();
    });
    watch(cols, () => {
      tryMakeResizable();
      createStyle();
      emitContainerResized();
    });
    watch(containerWidth, () => {
      tryMakeResizable();
      createStyle();
      emitContainerResized;
    });
    watch(
      () => props.x,
      (newVal) => {
        innerX.value = newVal;
        createStyle();
      }
    );
    watch(
      () => props.y,
      (newVal) => {
        innerY.value = newVal;
        createStyle();
      }
    );
    watch(
      () => props.h,
      (newVal) => {
        innerH.value = newVal;
        createStyle();
      }
    );
    watch(
      () => props.w,
      (newVal) => {
        innerW.value = newVal;
        createStyle();
      }
    );
    watch(renderRtl, () => {
      tryMakeResizable();
      createStyle();
    });
    watch(
      () => props.minH,
      () => {
        tryMakeResizable();
      }
    );
    watch(
      () => props.maxH,
      () => {
        tryMakeResizable();
      }
    );
    watch(
      () => props.minW,
      () => {
        tryMakeResizable();
      }
    );
    watch(
      () => props.maxW,
      () => {
        tryMakeResizable();
      }
    );
    watch(
      () => thisLayout?.margin,
      (newMargin) => {
        if (
          !newMargin ||
          (newMargin[0] == margin.value[0] && newMargin[1] == margin.value[1])
        ) {
          return;
        }
        margin.value = newMargin.map((m) => Number(m));
        createStyle();
        emitContainerResized();
      }
    );

    function updateWidthHandler(width: number) {
      updateWidth(width);
    }

    function compactHandler() {
      selfCompact();
    }

    function setDraggableHandler(isDraggable: boolean) {
      if (props.isDraggable === null) {
        draggable.value = isDraggable;
      }
    }

    function setResizableHandler(isResizable: boolean) {
      if (props.isResizable === null) {
        resizable.value = isResizable;
      }
    }

    function setBoundedHandler(isBounded: boolean) {
      if (props.isBounded === null) {
        bounded.value = isBounded;
      }
    }

    function setTransformScaleHandler(tScale: number) {
      transformScale.value = tScale;
    }

    function setRowHeightHandler(rHeight: number) {
      rowHeight.value = rHeight;
    }

    function setMaxRowsHandler(mRows: number) {
      maxRows.value = mRows;
    }

    function directionChangeHandler() {
      rtl.value = getDocumentDir() === 'rtl';
      selfCompact();
    }

    function setColNum(colNum: number) {
      const col = colNum.toString();
      cols.value = parseInt(col);
    }

    eventBus.on('updateWidth', updateWidthHandler);
    eventBus.on('compact', compactHandler);
    eventBus.on('setDraggable', setDraggableHandler);
    eventBus.on('setResizable', setResizableHandler);
    eventBus.on('setBounded', setBoundedHandler);
    eventBus.on('setTransformScale', setTransformScaleHandler);
    eventBus.on('setRowHeight', setRowHeightHandler);
    eventBus.on('setMaxRows', setMaxRowsHandler);
    eventBus.on('directionchange', directionChangeHandler);
    eventBus.on('setColNum', setColNum);

    rtl.value = getDocumentDir() === 'rtl';

    onBeforeUnmount(() => {
      //Remove listeners
      eventBus.off('updateWidth', updateWidthHandler);
      eventBus.off('compact', compactHandler);
      eventBus.off('setDraggable', setDraggableHandler);
      eventBus.off('setResizable', setResizableHandler);
      eventBus.off('setBounded', setBoundedHandler);
      eventBus.off('setTransformScale', setTransformScaleHandler);
      eventBus.off('setRowHeight', setRowHeightHandler);
      eventBus.off('setMaxRows', setMaxRowsHandler);
      eventBus.off('directionchange', directionChangeHandler);
      eventBus.off('setColNum', setColNum);
      if (interactObj.value) {
        interactObj.value.unset(); // destroy interact intance
      }
    });

    onMounted(() => {
      if (thisLayout?.responsive && thisLayout.lastBreakpoint) {
        cols.value = getColsFromBreakpoint(
          thisLayout.lastBreakpoint,
          thisLayout?.cols as Breakpoints
        );
      } else {
        cols.value = thisLayout?.colNum as number;
      }
      rowHeight.value = thisLayout?.rowHeight as number;
      containerWidth.value =
        thisLayout?.width !== null ? (thisLayout?.width as number) : 100;
      margin.value =
        thisLayout?.margin !== undefined ? thisLayout.margin : [10, 10];
      maxRows.value = thisLayout?.maxRows as number;
      if (props.isDraggable === null) {
        draggable.value = thisLayout?.isDraggable as boolean;
      } else {
        draggable.value = props.isDraggable;
      }

      if (props.isResizable === null) {
        resizable.value = thisLayout?.isResizable as boolean;
      } else {
        resizable.value = props.isResizable;
      }
      if (props.isBounded === null) {
        bounded.value = thisLayout?.isBounded as boolean;
      } else {
        bounded.value = props.isBounded;
      }
      transformScale.value = thisLayout?.transformScale as number;
      useCssTransforms.value = thisLayout?.useCssTransforms as boolean;
      useStyleCursor.value = thisLayout?.useStyleCursor as boolean;
      createStyle();
    });

    function createStyle() {
      if (props.x + props.w > cols.value) {
        innerX.value = 0;
        innerW.value = props.w > cols.value ? cols.value : props.w;
      } else {
        innerX.value = props.x;
        innerW.value = props.w;
      }
      let pos = calcPosition(
        innerX.value,
        innerY.value,
        innerW.value,
        innerH.value
      );

      if (isDragging.value) {
        pos.top = dragging.value?.top as number;
        //                    Add rtl support
        if (renderRtl.value) {
          pos.right = dragging.value?.left as number;
        } else {
          pos.left = dragging.value?.left as number;
        }
      }
      if (isResizing.value) {
        pos.width = resizing.value?.width as number;
        pos.height = resizing.value?.height as number;
      }

      let sty;
      // CSS Transforms support (default)
      if (useCssTransforms.value) {
        //                    Add rtl support
        if (renderRtl.value) {
          sty = setTransformRtl(
            pos.top,
            pos.right as number,
            pos.width,
            pos.height
          );
        } else {
          sty = setTransform(
            pos.top,
            pos.left as number,
            pos.width,
            pos.height
          );
        }
      } else {
        // top,left (slow)
        //                    Add rtl support
        if (renderRtl.value) {
          sty = setTopRight(
            pos.top,
            pos.right as number,
            pos.width,
            pos.height
          );
        } else {
          sty = setTopLeft(pos.top, pos.left as number, pos.width, pos.height);
        }
      }
      styleObj.value = sty;
    }

    function emitContainerResized() {
      // this.style has width and height with trailing 'px'. The
      // resized event is without them
      let styleProps = {} as Record<string, number>;
      for (let prop of ['width', 'height']) {
        let val = styleObj.value[prop];
        let matches = val.match(/^(\d+)px$/);
        if (!matches) return;
        styleProps[prop] = matches[1];
      }
      emit(
        'container-resized',
        props.i,
        props.h,
        props.w,
        styleProps.height,
        styleProps.width
      );
    }

    function handleResize(event: MouseEvent) {
      {
        if (props.static) return;
        const position = getControlPosition(event);
        // Get the current drag point from the event. This is used as the offset.
        if (position == null) return; // not possible but satisfies flow
        const { x, y } = position;

        const newSize = { width: 0, height: 0 };
        let pos;
        switch (event.type) {
          case 'resizestart': {
            tryMakeResizable();
            previousW.value = innerW.value;
            previousH.value = innerH.value;
            pos = calcPosition(
              innerX.value,
              innerY.value,
              innerW.value,
              innerH.value
            );
            newSize.width = pos.width;
            newSize.height = pos.height;
            resizing.value = newSize;
            isResizing.value = true;
            break;
          }
          case 'resizemove': {
            const coreEvent = createCoreData(lastW.value, lastH.value, x, y);
            if (renderRtl.value) {
              newSize.width =
                Number(resizing.value?.width) -
                coreEvent.deltaX / transformScale.value;
            } else {
              newSize.width =
                Number(resizing.value?.width) +
                coreEvent.deltaX / transformScale.value;
            }
            newSize.height =
              Number(resizing.value?.height) +
              coreEvent.deltaY / transformScale.value;

            resizing.value = newSize;
            break;
          }
          case 'resizeend': {
            pos = calcPosition(
              innerX.value,
              innerY.value,
              innerW.value,
              innerH.value
            );
            newSize.width = pos.width;
            newSize.height = pos.height;

            resizing.value = null;
            isResizing.value = false;
            break;
          }
        }

        // Get new WH
        pos = calcWH(newSize.height, newSize.width);
        if (pos.w < props.minW) {
          pos.w = props.minW;
        }
        if (pos.w > props.maxW) {
          pos.w = props.maxW;
        }
        if (pos.h < props.minH) {
          pos.h = props.minH;
        }
        if (pos.h > props.maxH) {
          pos.h = props.maxH;
        }

        if (pos.h < 1) {
          pos.h = 1;
        }
        if (pos.w < 1) {
          pos.w = 1;
        }

        lastW.value = x;
        lastH.value = y;

        if (innerW.value !== pos.w || innerH.value !== pos.h) {
          emit('resize', props.i, pos.h, pos.w, newSize.height, newSize.width);
        }
        if (
          event.type === 'resizeend' &&
          (previousW.value !== innerW.value || previousH.value !== innerH.value)
        ) {
          emit('resized', props.i, pos.h, pos.w, newSize.height, newSize.width);
        }
        const data = {
          eventType: event.type,
          i: props.i,
          x: innerX.value,
          y: innerY.value,
          h: pos.h,
          w: pos.w,
        };
        eventBus.emit('resizeEvent', data);
      }
    }

    function handleDrag(event: MouseEvent) {
      if (props.static) return;
      if (isResizing.value) return;

      const position = getControlPosition(event);

      // Get the current drag point from the event. This is used as the offset.
      if (position === null) return; // not possible but satisfies flow
      const { x, y } = position;

      // let shouldUpdate = false;
      let newPosition = { top: 0, left: 0 };
      switch (event.type) {
        case 'dragstart': {
          previousX.value = innerX.value;
          previousY.value = innerY.value;

          const tg = event.target as HTMLElement;
          const parentTg = tg.offsetParent as HTMLElement;
          let parentRect = parentTg.getBoundingClientRect();
          let clientRect = tg.getBoundingClientRect();

          const cLeft = clientRect.left / transformScale.value;
          const pLeft = parentRect.left / transformScale.value;
          const cRight = clientRect.right / transformScale.value;
          const pRight = parentRect.right / transformScale.value;
          const cTop = clientRect.top / transformScale.value;
          const pTop = parentRect.top / transformScale.value;

          if (renderRtl.value) {
            newPosition.left = (cRight - pRight) * -1;
          } else {
            newPosition.left = cLeft - pLeft;
          }
          newPosition.top = cTop - pTop;
          dragging.value = newPosition as Pos;
          isDragging.value = true;
          break;
        }
        case 'dragend': {
          if (!isDragging.value) return;
          const tg = event.target as HTMLElement;
          const parentTg = tg.offsetParent as HTMLElement;
          let parentRect = parentTg.getBoundingClientRect();
          let clientRect = tg.getBoundingClientRect();

          const cLeft = clientRect.left / transformScale.value;
          const pLeft = parentRect.left / transformScale.value;
          const cRight = clientRect.right / transformScale.value;
          const pRight = parentRect.right / transformScale.value;
          const cTop = clientRect.top / transformScale.value;
          const pTop = parentRect.top / transformScale.value;

          // Add rtl support
          if (renderRtl.value) {
            newPosition.left = (cRight - pRight) * -1;
          } else {
            newPosition.left = cLeft - pLeft;
          }
          newPosition.top = cTop - pTop;

          dragging.value = null;
          isDragging.value = false;

          break;
        }
        case 'dragmove': {
          const coreEvent = createCoreData(lastX.value, lastY.value, x, y);
          //                        Add rtl support
          if (renderRtl.value) {
            newPosition.left =
              Number(dragging.value?.left) -
              coreEvent.deltaX / transformScale.value;
          } else {
            newPosition.left =
              Number(dragging.value?.left) +
              coreEvent.deltaX / transformScale.value;
          }
          newPosition.top =
            Number(dragging.value?.top) +
            coreEvent.deltaY / transformScale.value;
          if (bounded.value) {
            const tg = event.target as HTMLElement;
            const parentTg = tg.offsetParent as HTMLElement;
            const bottomBoundary =
              parentTg.clientHeight -
              calcGridItemWHPx(props.h, rowHeight.value, margin.value[1]);
            newPosition.top = clamp(newPosition.top, 0, bottomBoundary);
            const colWidth = calcColWidth();
            const rightBoundary =
              containerWidth.value -
              calcGridItemWHPx(props.w, colWidth, margin.value[0]);
            newPosition.left = clamp(newPosition.left, 0, rightBoundary);
          }

          dragging.value = newPosition as Pos;
          break;
        }
      }

      // Get new XY
      let pos;
      if (renderRtl.value) {
        pos = calcXY(newPosition.top, newPosition.left);
      } else {
        pos = calcXY(newPosition.top, newPosition.left);
      }

      lastX.value = x;
      lastY.value = y;

      if (innerX.value !== pos.x || innerY.value !== pos.y) {
        emit('move', props.i, pos.x, pos.y);
      }
      if (
        event.type === 'dragend' &&
        (previousX.value !== innerX.value || previousY.value !== innerY.value)
      ) {
        emit('moved', props.i, pos.x, pos.y);
      }
      const data = {
        eventType: event.type,
        i: props.i,
        x: pos.x,
        y: pos.y,
        h: innerH.value,
        w: innerW.value,
      };
      eventBus.emit('dragEvent', data);
    }

    function calcPosition(x: number, y: number, w: number, h: number): Pos {
      const colWidth = calcColWidth();
      // add rtl support
      let out;
      if (renderRtl.value) {
        out = {
          right: Math.round(colWidth * x + (x + 1) * margin.value[0]),
          top: Math.round(rowHeight.value * y + (y + 1) * margin.value[1]),
          // 0 * Infinity === NaN, which causes problems with resize constriants;
          // Fix this if it occurs.
          // Note we do it here rather than later because Math.round(Infinity) causes deopt
          width:
            w === Infinity
              ? w
              : Math.round(colWidth * w + Math.max(0, w - 1) * margin.value[0]),
          height:
            h === Infinity
              ? h
              : Math.round(
                  rowHeight.value * h + Math.max(0, h - 1) * margin.value[1]
                ),
        };
      } else {
        out = {
          left: Math.round(colWidth * x + (x + 1) * margin.value[0]),
          top: Math.round(rowHeight.value * y + (y + 1) * margin.value[1]),
          // 0 * Infinity === NaN, which causes problems with resize constriants;
          // Fix this if it occurs.
          // Note we do it here rather than later because Math.round(Infinity) causes deopt
          width:
            w === Infinity
              ? w
              : Math.round(colWidth * w + Math.max(0, w - 1) * margin.value[0]),
          height:
            h === Infinity
              ? h
              : Math.round(
                  rowHeight.value * h + Math.max(0, h - 1) * margin.value[1]
                ),
        };
      }

      return out;
    }

    /**
     * Translate x and y coordinates from pixels to grid units.
     * @param  {Number} top  Top position (relative to parent) in pixels.
     * @param  {Number} left Left position (relative to parent) in pixels.
     * @return {Object} x and y in grid units.
     */
    // TODO check if this function needs change in order to support rtl.
    function calcXY(top: number, left: number) {
      const colWidth = calcColWidth();

      // left = colWidth * x + margin * (x + 1)
      // l = cx + m(x+1)
      // l = cx + mx + m
      // l - m = cx + mx
      // l - m = x(c + m)
      // (l - m) / (c + m) = x
      // x = (left - margin) / (coldWidth + margin)
      let x = Math.round(
        (left - margin.value[0]) / (colWidth + margin.value[0])
      );
      let y = Math.round(
        (top - margin.value[1]) / (rowHeight.value + margin.value[1])
      );

      // Capping
      x = Math.max(Math.min(x, cols.value - innerW.value), 0);
      y = Math.max(Math.min(y, maxRows.value - innerH.value), 0);

      return { x, y };
    }

    // Helper for generating column width
    function calcColWidth() {
      const colWidth =
        (containerWidth.value - margin.value[0] * (cols.value + 1)) /
        cols.value;

      return colWidth;
    }
    // This can either be called:
    // calcGridItemWHPx(w, colWidth, margin[0])
    // or
    // calcGridItemWHPx(h, rowHeight, margin[1])
    function calcGridItemWHPx(
      gridUnits: number,
      colOrRowSize: number,
      marginPx: number
    ) {
      if (!Number.isFinite(gridUnits)) return gridUnits;
      return Math.round(
        colOrRowSize * gridUnits + Math.max(0, gridUnits - 1) * marginPx
      );
    }
    // Similar to _.clamp
    function clamp(num: number, lowerBound: number, upperBound: number) {
      return Math.max(Math.min(num, upperBound), lowerBound);
    }
    /**
     * Given a height and width in pixel values, calculate grid units.
     * @param  {Number} height Height in pixels.
     * @param  {Number} width  Width in pixels.
     * @param  {Boolean} autoSizeFlag  function autoSize identifier.
     * @return {Object} w, h as grid units.
     */
    function calcWH(
      height: number,
      width: number,
      autoSizeFlag = false
    ): { w: number; h: number } {
      const colWidth = calcColWidth();

      // width = colWidth * w - (margin * (w - 1))
      // ...
      // w = (width + margin) / (colWidth + margin)
      let w = Math.round(
        (width + margin.value[0]) / (colWidth + margin.value[0])
      );
      let h = 0;
      if (!autoSizeFlag) {
        h = Math.round(
          (height + margin.value[1]) / (rowHeight.value + margin.value[1])
        );
      } else {
        h = Math.ceil(
          (height + margin.value[1]) / (rowHeight.value + margin.value[1])
        );
      }

      // Capping
      w = Math.max(Math.min(w, cols.value - innerX.value), 0);
      h = Math.max(Math.min(h, maxRows.value - innerY.value), 0);
      return { w, h };
    }

    function updateWidth(width: number, colNum?: number) {
      containerWidth.value = width;
      if (colNum !== undefined && colNum !== null) {
        cols.value = colNum;
      }
    }

    function selfCompact() {
      createStyle();
    }

    function tryMakeDraggable() {
      if (interactObj.value === null || interactObj.value === undefined) {
        interactObj.value = interact(this$refsItem.value);
        if (!useStyleCursor.value) {
          // @ts-ignore
          interactObj.value.styleCursor(false);
        }
      }
      if (draggable.value && !props.static) {
        const opts = {
          ignoreFrom: props.dragIgnoreFrom,
          allowFrom: props.dragAllowFrom,
          ...props.dragOption,
        };
        // @ts-ignore
        interactObj.value.draggable(opts);
        /*this.interactObj.draggable({allowFrom: '.vue-draggable-handle'});*/
        if (!dragEventSet.value) {
          dragEventSet.value = true;
          interactObj.value?.on('dragstart dragmove dragend', function (event) {
            handleDrag(event);
          });
        }
      } else {
        // @ts-ignore
        interactObj.value.draggable({
          enabled: false,
        });
      }
    }
    function tryMakeResizable() {
      if (interactObj.value === null || interactObj.value === undefined) {
        interactObj.value = interact(this$refsItem.value);
        if (!useStyleCursor.value) {
          // @ts-ignore
          interactObj.value.styleCursor(false);
        }
      }
      if (resizable.value && !props.static) {
        let maximum = calcPosition(0, 0, props.maxW, props.maxH);
        let minimum = calcPosition(0, 0, props.minW, props.minH);

        const opts = {
          edges: {
            left: false,
            right: '.' + resizableHandleClass.value.trim().replace(' ', '.'),
            bottom: '.' + resizableHandleClass.value.trim().replace(' ', '.'),
            top: false,
          },
          ignoreFrom: props.resizeIgnoreFrom,
          restrictSize: {
            min: {
              height: minimum.height * transformScale.value,
              width: minimum.width * transformScale.value,
            },
            max: {
              height: maximum.height * transformScale.value,
              width: maximum.width * transformScale.value,
            },
          },
          ...props.resizeOption,
        };

        if (props.preserveAspectRatio) {
          // @ts-ignore
          opts.modifiers = [
            // @ts-ignore
            interact.modifiers.aspectRatio({
              ratio: 'preserve',
            }),
          ];
        }

        // @ts-ignore
        interactObj.value.resizable(opts);
        if (!resizeEventSet.value) {
          resizeEventSet.value = true;
          interactObj.value.on(
            'resizestart resizemove resizeend',
            function (event) {
              handleResize(event);
            }
          );
        }
      } else {
        // @ts-ignore
        interactObj.value.resizable({
          enabled: false,
        });
      }
    }
    const $slots = useSlots();
    function autoSize() {
      // ok here we want to calculate if a resize is needed
      previousW.value = innerW.value;
      previousH.value = innerH.value;

      // @ts-ignore
      let newSize = $slots?.default[0].elm.getBoundingClientRect();
      let pos = calcWH(newSize.height, newSize.width, true);
      if (pos.w < props.minW) {
        pos.w = props.minW;
      }
      if (pos.w > props.maxW) {
        pos.w = props.maxW;
      }
      if (pos.h < props.minH) {
        pos.h = props.minH;
      }
      if (pos.h > props.maxH) {
        pos.h = props.maxH;
      }

      if (pos.h < 1) {
        pos.h = 1;
      }
      if (pos.w < 1) {
        pos.w = 1;
      }

      // this.lastW = x; // basically, this is copied from resizehandler, but shouldn't be needed
      // this.lastH = y;

      if (innerW.value !== pos.w || innerH.value !== pos.h) {
        emit('resize', props.i, pos.h, pos.w, newSize.height, newSize.width);
      }
      if (previousW.value !== pos.w || previousH.value !== pos.h) {
        emit('resized', props.i, pos.h, pos.w, newSize.height, newSize.width);
        const data = {
          eventType: 'resizeend',
          i: props.i,
          x: innerX.value,
          y: innerY.value,
          h: pos.h,
          w: pos.w,
        };
        eventBus.emit('resizeEvent', data);
      }
    }

    return {
      this$refsItem,
      classObj,
      styleObj,
      resizableAndNotStatic,
      resizableHandleClass,
      autoSize,
      calcXY,
      dragging,
    };
  },
});
</script>
