<template>
  <div class="layout">
    <div
      class="droppable-element"
      draggable="true"
      unselectable="on"
      @drag="drag"
      @dragend="dragend"
    >
      Droppable Element (Drag me!)
    </div>
    <div id="content">
      <grid-layout
        ref="GridLayoutRef"
        v-model:layout="layouts"
        :responsive="true"
        :col-num="12"
        :row-height="30"
        :vertical-compact="true"
        :use-css-transforms="true"
      >
        <grid-item
          v-for="item in layouts"
          class="item"
          :ref="(el: any) => set$Children(el)"
          :key="item.i"
          :x="item.x"
          :y="item.y"
          :w="item.w"
          :h="item.h"
          :i="item.i"
        >
          <div>{{ item.i }}</div>
        </grid-item>
      </grid-layout>
    </div>
  </div>
</template>

<script lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import { testData } from './test';

export default {
  name: 'App',
  setup() {
    const layouts = ref(testData);
    const GridLayoutRef = ref();
    const colNum = ref<number>(12);
    const mapCache: Map<string, any> = new Map();
    let mouseXY = { x: 0, y: 0 };
    let DragPos = { x: 0, y: 0, w: 1, h: 1, i: '' };

    onMounted(() => {
      document.addEventListener('dragover', (e: DragEvent) => {
        mouseXY.x = e.clientX;
        mouseXY.y = e.clientY;
      });
    });

    function set$Children(vm: any) {
      if (vm && vm.i) {
        mapCache.set(vm.i, vm);
      }
    }

    function drag(e: DragEvent) {
      e.stopPropagation();
      e.preventDefault();
      const t = document.getElementById('content') as HTMLElement;
      let parentRect = t.getBoundingClientRect();
      let mouseInGrid = false;
      if (
        mouseXY.x > parentRect.left &&
        mouseXY.x < parentRect.right &&
        mouseXY.y > parentRect.top &&
        mouseXY.y < parentRect.bottom
      ) {
        mouseInGrid = true;
      }
      if (
        mouseInGrid === true &&
        layouts.value.findIndex((item) => item.i === 'drop') === -1
      ) {
        layouts.value.push({
          x: (layouts.value.length * 2) % colNum.value,
          y: layouts.value.length + colNum.value, // puts it at the bottom
          w: 3,
          h: 4,
          i: 'drop',
        });
      }

      let index = layouts.value.findIndex((item) => item.i === 'drop');

      if (index !== -1) {
        let el = mapCache.get('drop');
        if (!el) return;

        try {
          el.$el.style.display = 'none';
        } catch {
          //
        }

        el.dragging = {
          top: mouseXY.y - parentRect.top,
          left: mouseXY.x - parentRect.left,
        };
        let new_pos = el.calcXY(
          mouseXY.y - parentRect.top,
          mouseXY.x - parentRect.left
        );
        if (mouseInGrid === true) {
          GridLayoutRef.value.dragEvent(
            'dragstart',
            'drop',
            new_pos.x,
            new_pos.y,
            4,
            3
          );
          DragPos.i = String(index);
          DragPos.x = layouts.value[index].x;
          DragPos.y = layouts.value[index].y;
        }
        if (mouseInGrid === false) {
          GridLayoutRef.value.dragEvent(
            'dragend',
            'drop',
            new_pos.x,
            new_pos.y,
            3,
            4
          );
          layouts.value = layouts.value.filter((obj) => obj.i !== 'drop');
        }
      }
    }

    function dragend() {
      const t = document.getElementById('content') as HTMLElement;
      let parentRect = t.getBoundingClientRect();
      let mouseInGrid = false;
      if (
        mouseXY.x > parentRect.left &&
        mouseXY.x < parentRect.right &&
        mouseXY.y > parentRect.top &&
        mouseXY.y < parentRect.bottom
      ) {
        mouseInGrid = true;
      }

      if (mouseInGrid === true) {
        GridLayoutRef.value.dragEvent(
          'dragend',
          'drop',
          DragPos.x,
          DragPos.y,
          3,
          4
        );
        layouts.value = layouts.value.filter((obj) => obj.i !== 'drop');
        nextTick(() => {
          layouts.value.push({
            x: DragPos.x,
            y: DragPos.y,
            w: 3,
            h: 4,
            i: DragPos.i,
          });
          GridLayoutRef.value.dragEvent(
            'dragend',
            DragPos.i,
            DragPos.x,
            DragPos.y,
            4,
            3
          );
          mapCache.delete('drop');
        });
      }
    }

    return {
      layouts,
      GridLayoutRef,
      colNum,
      set$Children,
      drag,
      dragend,
    };
  },
};
</script>

<style lang="less" scoped>
.layout {
  background-color: #fff;

  .item {
    background-color: #eee;
  }
}

.droppable-element {
  width: 150px;
  text-align: center;
  background: #fdd;
  border: 1px solid black;
  margin: 10px 0;
  padding: 10px;
}
</style>
