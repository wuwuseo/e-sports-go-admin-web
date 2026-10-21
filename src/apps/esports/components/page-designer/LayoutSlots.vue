<template>
  <!-- 布局列：每列一个组件，空列是拖拽落点；列里再放布局时递归渲染自己的列。 -->
  <div class="canvas-layout-grid" :style="gridStyle" @click.stop>
    <div
      v-for="slot in slots"
      :key="slot.index"
      class="canvas-slot"
      :class="{
        'canvas-slot-drop': dropKey === slot.path,
        'canvas-slot-filled': !!slot.child,
      }"
      @dragover.prevent.stop="emit('dragOver', slot.path)"
      @dragleave.stop="emit('dragLeave', slot.path)"
      @drop.prevent.stop="emit('drop', $event, slot.path)"
    >
      <template v-if="slot.child && slot.child.type !== 'layout'">
        <div
          class="canvas-slot-item"
          :class="{ active: selectedKey === slot.path }"
          draggable="true"
          :title="labelOf(slot.child)"
          @dragstart.stop="emit('nodeDragStart', $event, slot.path)"
          @click.stop="emit('select', slot.path)"
        >
          <span class="canvas-slot-label">{{ labelOf(slot.child) }}</span>
          <button
            type="button"
            class="canvas-slot-remove"
            draggable="false"
            title="移除"
            @click.stop="emit('remove', slot.path)"
            >×</button
          >
        </div>
      </template>
      <template v-else-if="slot.child">
        <div
          class="canvas-slot-layout"
          :class="{ active: selectedKey === slot.path }"
        >
          <div
            class="canvas-slot-layout-head"
            :title="labelOf(slot.child)"
            @click.stop="emit('select', slot.path)"
          >
            <span class="canvas-slot-label">{{ labelOf(slot.child) }}</span>
            <button
              type="button"
              class="canvas-slot-remove"
              draggable="false"
              title="移除"
              @click.stop="emit('remove', slot.path)"
              >×</button
            >
          </div>
          <LayoutSlots
            :layout="slot.child"
            :path="slot.path"
            :selected-key="selectedKey"
            :drop-key="dropKey"
            :label-of="labelOf"
            @select="emit('select', $event)"
            @remove="emit('remove', $event)"
            @drop="(event, path) => emit('drop', event, path)"
            @drag-over="emit('dragOver', $event)"
            @drag-leave="emit('dragLeave', $event)"
            @node-drag-start="
              (event, path) => emit('nodeDragStart', event, path)
            "
          />
        </div>
      </template>
      <div v-else class="canvas-slot-empty" title="把组件拖到这一列">+</div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue';
  import type { PageComponent } from '../../api';

  const props = defineProps<{
    layout: PageComponent;
    path: string;
    selectedKey: string;
    dropKey: string;
    labelOf: (comp: PageComponent) => string;
  }>();

  const emit = defineEmits<{
    (e: 'select', path: string): void;
    (e: 'remove', path: string): void;
    (e: 'drop', event: DragEvent, path: string): void;
    (e: 'dragOver', path: string): void;
    (e: 'dragLeave', path: string): void;
    (e: 'nodeDragStart', event: DragEvent, path: string): void;
  }>();

  const columns = computed(() => {
    const value = Number(props.layout.props?.columns);
    return Number.isFinite(value) && value >= 1 && value <= 3
      ? Math.floor(value)
      : 1;
  });

  const slots = computed(() => {
    const children = props.layout.children || [];
    return Array.from({ length: columns.value }, (_, index) => {
      const child = children[index];
      return {
        index,
        path: `${props.path}.${index}`,
        child: child && child.type ? child : null,
      };
    });
  });

  // 列数与列宽同预览一致：1×3 就是并排三格；column_weights 决定各列的相对宽度。
  const gridStyle = computed(() => {
    const raw = props.layout.props?.column_weights;
    const weights =
      Array.isArray(raw) && raw.length === columns.value
        ? raw.map((value) => Number(value))
        : [];
    const valid = weights.every(
      (value) => Number.isInteger(value) && value >= 1 && value <= 12
    );
    return {
      gridTemplateColumns:
        valid && weights.length
          ? weights.map((weight) => `${weight}fr`).join(' ')
          : `repeat(${columns.value}, minmax(0, 1fr))`,
    };
  });
</script>

<style scoped>
  .canvas-layout-grid {
    display: grid;
    gap: 8px;
  }

  .canvas-slot {
    min-width: 0;
    min-height: 44px;
    padding: 6px;
    background: var(--color-fill-1);
    border: 1px dashed var(--color-border-2);
    border-radius: 4px;
    transition: border-color 0.15s, background-color 0.15s;
  }

  .canvas-slot-drop {
    background: rgb(var(--primary-1) 0.9);
    border-color: rgb(var(--primary-6));
  }

  /* 列宽可能只有几十像素（1×3 里再套布局），空列只放一个加号，避免文字竖排。 */
  .canvas-slot-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 30px;
    color: var(--color-text-3);
    font-size: 16px;
    line-height: 1;
    user-select: none;
  }

  .canvas-slot-drop .canvas-slot-empty {
    color: rgb(var(--primary-6));
  }

  .canvas-slot-item {
    position: relative;
    display: flex;
    align-items: center;
    min-height: 30px;
    padding: 4px 6px;
    background: var(--color-bg-2);
    border: 1px solid var(--color-border-2);
    border-radius: 4px;
    cursor: pointer;
  }

  .canvas-slot-item.active,
  .canvas-slot-layout.active {
    border-color: rgb(var(--primary-6));
  }

  /* 画布列表不宽，列里只放得下短名字：最多两行，把「移除」做成右上角的悬浮小叉，
     不占名称的横向空间。 */

  .canvas-slot-label {
    display: -webkit-box;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    font-size: 12px;
    line-height: 1.35;
    overflow-wrap: anywhere;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .canvas-slot-remove {
    position: absolute;
    top: 1px;
    right: 1px;
    width: 16px;
    height: 16px;
    padding: 0;
    color: var(--color-text-3);
    font-size: 14px;
    line-height: 14px;
    background: var(--color-bg-2);
    border: 0;
    border-radius: 50%;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.15s, color 0.15s, background-color 0.15s;
  }

  .canvas-slot-item:hover .canvas-slot-remove,
  .canvas-slot-item.active .canvas-slot-remove,
  .canvas-slot-layout:hover > .canvas-slot-layout-head .canvas-slot-remove,
  .canvas-slot-layout.active > .canvas-slot-layout-head .canvas-slot-remove {
    opacity: 1;
  }

  .canvas-slot-remove:hover {
    color: rgb(var(--danger-6));
    background: var(--color-fill-2);
  }

  /* 嵌套布局：外层列已经有虚线框，内层用浅色底区分层级。 */
  .canvas-slot-layout {
    padding: 4px;
    border: 1px solid var(--color-border-2);
    border-radius: 4px;
  }

  .canvas-slot-layout-head {
    position: relative;
    display: flex;
    align-items: center;
    margin-bottom: 4px;
    cursor: pointer;
  }

  .canvas-slot-layout .canvas-layout-grid {
    gap: 4px;
  }

  .canvas-slot-layout .canvas-slot {
    min-height: 36px;
    padding: 4px;
  }
</style>
