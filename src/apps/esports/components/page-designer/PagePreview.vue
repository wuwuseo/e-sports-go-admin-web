<template>
  <div class="pp-frame" :style="frameStyle">
    <div class="pp-phone" :style="phoneStyle">
      <div class="pp-statusbar" />
      <div class="pp-body">
        <PreviewBlock
          v-for="entry in visibleComponents"
          :key="entry.comp.type + '-' + entry.index"
          :comp="entry.comp"
          :path="String(entry.index)"
          :selected-key="selectedKey"
          :selectable="selectable"
          @select="emit('select', $event)"
        />
        <div class="pp-muted pp-center"
          >下单后由归属客服跟进，付款前可随时联系客服改单</div
        >
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue';
  import type { PageComponent } from '../../api';
  import PreviewBlock from './PreviewBlock.vue';

  // 手机边框宽度与样式保持一致；机型宽高指逻辑分辨率（CSS 像素），边框不计入其中。
  const PHONE_BORDER = 10;

  const props = withDefaults(
    defineProps<{
      components: PageComponent[];
      selectedKey?: string;
      selectable?: boolean;
      device?: { width: number; height: number } | null;
      scale?: number;
    }>(),
    { selectedKey: '', selectable: false, device: null, scale: 1 }
  );

  const emit = defineEmits<{
    (e: 'select', path: string): void;
  }>();

  const deviceTotalWidth = computed(() =>
    props.device ? props.device.width + PHONE_BORDER * 2 : 0
  );
  const deviceTotalHeight = computed(() =>
    props.device ? props.device.height + PHONE_BORDER * 2 : 0
  );

  // 指定机型时按原始像素布局再整体缩放，保证 390/430 宽下的换行与栅格真实。
  const frameStyle = computed(() => {
    if (!props.device) return undefined;
    return {
      width: `${deviceTotalWidth.value * props.scale}px`,
      height: `${deviceTotalHeight.value * props.scale}px`,
    };
  });

  const phoneStyle = computed(() => {
    if (!props.device) return undefined;
    return {
      width: `${deviceTotalWidth.value}px`,
      height: `${deviceTotalHeight.value}px`,
      maxWidth: 'none',
      transform: `scale(${props.scale})`,
      transformOrigin: 'top left',
    };
  });

  const isVisibleComponent = (comp: PageComponent) =>
    Boolean(comp.type && comp.visible !== false);

  // 保留顶层原始下标，选中路径与画布（0 / 0.1）保持一致。
  const visibleComponents = computed(() =>
    props.components
      .map((comp, index) => ({ comp, index }))
      .filter((entry) => isVisibleComponent(entry.comp))
  );
</script>

<style scoped>
  .pp-frame {
    width: 100%;
    margin: 0 auto;
  }

  .pp-phone {
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    width: 100%;
    max-width: 340px;
    min-height: 560px;
    margin: 0 auto;
    overflow: hidden;
    background: #f5f6f8;
    border: 10px solid #1f2937;
    border-radius: 24px;
  }

  .pp-statusbar {
    flex: none;
    height: 22px;
    background: #1f2937;
  }

  .pp-body {
    flex: 1;
    min-height: 0;
    padding: 10px;
    overflow-y: auto;
  }

  .pp-muted {
    color: #9ca3af;
    font-size: 12px;
  }

  .pp-center {
    margin-bottom: 16px;
    text-align: center;
  }
</style>
