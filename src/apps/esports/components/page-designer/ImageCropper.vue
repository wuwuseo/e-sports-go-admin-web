<template>
  <a-modal
    :visible="visible"
    :footer="false"
    :width="640"
    :title="title"
    :mask-closable="false"
    @cancel="$emit('cancel')"
  >
    <div class="cropper">
      <div class="cropper-toolbar">
        <a-button size="small" @click="pickFile">选择图片</a-button>
        <a-select
          v-model="ratioKey"
          size="small"
          :style="{ width: '140px' }"
          @change="onRatioChange"
        >
          <a-option value="free">自由比例</a-option>
          <a-option value="1:1">1:1</a-option>
          <a-option value="4:3">4:3</a-option>
          <a-option value="16:9">16:9</a-option>
          <a-option value="3:1">3:1（横幅）</a-option>
        </a-select>
        <span class="cropper-hint">拖动裁剪框移动，拖右下角调整大小</span>
      </div>

      <input
        ref="fileRef"
        type="file"
        accept="image/*"
        class="cropper-file"
        @change="onFileChange"
      />

      <div v-if="!image" class="cropper-empty">
        <a-empty description="选择一张图片开始裁剪" />
      </div>
      <canvas
        v-else
        ref="canvasRef"
        class="cropper-canvas"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointerleave="onPointerUp"
      />

      <div class="cropper-foot">
        <a-button @click="$emit('cancel')">取消</a-button>
        <a-button
          type="primary"
          :disabled="!image"
          :loading="cropping"
          @click="confirm"
          >确认裁剪</a-button
        >
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
  import { nextTick, reactive, ref } from 'vue';
  import { Message } from '@arco-design/web-vue';

  const props = withDefaults(
    defineProps<{
      visible: boolean;
      title?: string;
      /** 裁剪宽高比（宽/高）；0 表示自由比例。 */
      aspectRatio?: number;
    }>(),
    { title: '裁剪图片', aspectRatio: 0 }
  );
  const emit = defineEmits<{
    (e: 'confirm', blob: Blob): void;
    (e: 'cancel'): void;
  }>();

  const fileRef = ref<HTMLInputElement>();
  const canvasRef = ref<HTMLCanvasElement>();
  const image = ref<HTMLImageElement | null>(null);
  const cropping = ref(false);
  const ratioKey = ref('free');

  // 显示坐标下的裁剪框（相对画布像素）。
  const crop = reactive({ x: 0, y: 0, w: 0, h: 0 });

  // 拖拽状态。
  let dragging: 'move' | 'resize' | null = null;
  let dragStart = { x: 0, y: 0, cropX: 0, cropY: 0, cropW: 0, cropH: 0 };

  const ratios: Record<string, number> = {
    '1:1': 1,
    '4:3': 4 / 3,
    '16:9': 16 / 9,
    '3:1': 3,
  };

  function currentRatio(): number {
    const r = ratios[ratioKey.value];
    return r || props.aspectRatio || 0;
  }

  function clamp(v: number, min: number, max: number) {
    return Math.min(Math.max(v, min), Math.max(min, max));
  }

  function render() {
    const img = image.value;
    const canvas = canvasRef.value;
    if (!img || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    // 遮罩。
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.clearRect(crop.x, crop.y, crop.w, crop.h);
    ctx.drawImage(
      img,
      crop.x,
      crop.y,
      crop.w,
      crop.h,
      crop.x,
      crop.y,
      crop.w,
      crop.h
    );
    ctx.restore();
    // 边框与手柄。
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(crop.x, crop.y, crop.w, crop.h);
    const hs = 8;
    ctx.fillStyle = '#fff';
    ctx.fillRect(crop.x + crop.w - hs / 2, crop.y + crop.h - hs / 2, hs, hs);
  }

  function setupCanvas() {
    const img = image.value;
    const canvas = canvasRef.value;
    if (!img || !canvas) return;
    const maxW = 560;
    const maxH = 400;
    const scale = Math.min(
      maxW / img.naturalWidth,
      maxH / img.naturalHeight,
      1
    );
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    // 默认裁剪框：自由比例铺满，等比则居中。
    const r = currentRatio();
    if (r > 0) {
      let w = canvas.width;
      let h = Math.round(w / r);
      if (h > canvas.height) {
        h = canvas.height;
        w = Math.round(h * r);
      }
      crop.x = Math.max(0, Math.round((canvas.width - w) / 2));
      crop.y = Math.max(0, Math.round((canvas.height - h) / 2));
      crop.w = w;
      crop.h = h;
    } else {
      crop.x = 0;
      crop.y = 0;
      crop.w = canvas.width;
      crop.h = canvas.height;
    }
    render();
  }

  function onRatioChange() {
    if (!image.value) return;
    const r = currentRatio();
    if (r > 0) {
      // 以当前画布为中心重算等比裁剪框。
      const cw = canvasRef.value?.width || 0;
      const ch = canvasRef.value?.height || 0;
      let w = cw;
      let h = Math.round(w / r);
      if (h > ch) {
        h = ch;
        w = Math.round(h * r);
      }
      crop.x = Math.max(0, Math.round((cw - w) / 2));
      crop.y = Math.max(0, Math.round((ch - h) / 2));
      crop.w = w;
      crop.h = h;
    } else {
      const cw = canvasRef.value?.width || 0;
      const ch = canvasRef.value?.height || 0;
      crop.x = 0;
      crop.y = 0;
      crop.w = cw;
      crop.h = ch;
    }
    render();
  }

  function pickFile() {
    fileRef.value?.click();
  }

  function onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      image.value = img;
      URL.revokeObjectURL(url);
      nextTick(() => setupCanvas());
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      Message.error('图片加载失败');
    };
    img.src = url;
  }

  function eventPoint(event: PointerEvent) {
    const canvas = canvasRef.value;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function hitHandle(x: number, y: number): boolean {
    const hs = 10;
    return (
      Math.abs(x - (crop.x + crop.w)) <= hs &&
      Math.abs(y - (crop.y + crop.h)) <= hs
    );
  }

  function hitCrop(x: number, y: number): boolean {
    return (
      x >= crop.x && x <= crop.x + crop.w && y >= crop.y && y <= crop.y + crop.h
    );
  }

  function onPointerDown(event: PointerEvent) {
    if (!image.value) return;
    const p = eventPoint(event);
    if (hitHandle(p.x, p.y)) {
      dragging = 'resize';
    } else if (hitCrop(p.x, p.y)) {
      dragging = 'move';
    } else {
      return;
    }
    dragStart = {
      x: p.x,
      y: p.y,
      cropX: crop.x,
      cropY: crop.y,
      cropW: crop.w,
      cropH: crop.h,
    };
    event.preventDefault();
  }

  function onPointerMove(event: PointerEvent) {
    if (!dragging || !image.value) return;
    const canvas = canvasRef.value;
    if (!canvas) return;
    const p = eventPoint(event);
    const dx = p.x - dragStart.x;
    const dy = p.y - dragStart.y;
    if (dragging === 'move') {
      crop.x = clamp(dragStart.cropX + dx, 0, canvas.width - crop.w);
      crop.y = clamp(dragStart.cropY + dy, 0, canvas.height - crop.h);
    } else {
      const r = currentRatio();
      let w = dragStart.cropW + dx;
      let h = dragStart.cropH + dy;
      if (r > 0) {
        w = Math.max(16, w);
        h = w / r;
      } else {
        w = Math.max(16, w);
        h = Math.max(16, h);
      }
      w = Math.min(w, canvas.width - crop.x);
      h = Math.min(h, canvas.height - crop.y);
      if (r > 0) {
        if (w / r > canvas.height - crop.y) {
          h = canvas.height - crop.y;
          w = h * r;
        }
      }
      crop.w = Math.round(w);
      crop.h = Math.round(h);
    }
    render();
  }

  function onPointerUp() {
    dragging = null;
  }

  function confirm() {
    const img = image.value;
    const canvas = canvasRef.value;
    if (!img || !canvas || crop.w < 1 || crop.h < 1) return;
    cropping.value = true;
    const sx = (crop.x / canvas.width) * img.naturalWidth;
    const sy = (crop.y / canvas.height) * img.naturalHeight;
    const sw = (crop.w / canvas.width) * img.naturalWidth;
    const sh = (crop.h / canvas.height) * img.naturalHeight;
    const out = document.createElement('canvas');
    out.width = Math.max(1, Math.round(sw));
    out.height = Math.max(1, Math.round(sh));
    const ctx = out.getContext('2d');
    if (!ctx) {
      cropping.value = false;
      return;
    }
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, out.width, out.height);
    out.toBlob(
      (blob) => {
        cropping.value = false;
        if (blob) {
          emit('confirm', blob);
        } else {
          Message.error('裁剪失败');
        }
      },
      'image/png',
      0.92
    );
  }
</script>

<style scoped>
  .cropper-file {
    display: none;
  }

  .cropper-toolbar {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-bottom: 12px;
  }

  .cropper-hint {
    color: var(--color-text-3);
    font-size: 12px;
  }

  .cropper-empty {
    padding: 48px 0;
  }

  .cropper-canvas {
    display: block;
    max-width: 100%;
    margin: 0 auto;
    cursor: move;
    touch-action: none;
  }

  .cropper-foot {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    margin-top: 12px;
  }
</style>
