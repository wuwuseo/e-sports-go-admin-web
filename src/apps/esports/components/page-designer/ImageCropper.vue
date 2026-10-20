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
          :style="{ width: '170px' }"
          @change="onRatioChange"
        >
          <a-option value="free">自由比例</a-option>
          <a-option value="9:16">9:16（手机竖屏）</a-option>
          <a-option value="3:4">3:4（竖屏）</a-option>
          <a-option value="9:19.5">9:19.5（全面屏）</a-option>
          <a-option value="1:1">1:1</a-option>
          <a-option value="4:3">4:3</a-option>
          <a-option value="16:9">16:9</a-option>
          <a-option value="3:1">3:1（横幅）</a-option>
        </a-select>
        <span class="cropper-hint">拖动框内移动，拖四角调整大小</span>
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
        @pointercancel="onPointerUp"
      />

      <div class="cropper-foot">
        <span class="cropper-size">{{ outputSize }}</span>
        <div class="cropper-actions">
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
    </div>
  </a-modal>
</template>

<script setup lang="ts">
  import { computed, nextTick, reactive, ref, watch } from 'vue';
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

  // 每次打开弹窗都回到自由比例并清空上一张图，
  // 避免上次选的竖屏比例成为默认值，导致新图一进来就被裁成窄条。
  watch(
    () => props.visible,
    (visible) => {
      if (!visible) return;
      ratioKey.value = 'free';
      image.value = null;
      cropping.value = false;
      crop.x = 0;
      crop.y = 0;
      crop.w = 0;
      crop.h = 0;
    }
  );

  // 拖拽状态。
  type CropHandle = 'nw' | 'ne' | 'sw' | 'se';
  const MIN_CROP_SIZE = 24;
  let dragging: 'move' | 'resize' | null = null;
  let activeHandle: CropHandle | null = null;
  let dragStart = { x: 0, y: 0, cropX: 0, cropY: 0, cropW: 0, cropH: 0 };

  const ratios: Record<string, number> = {
    '9:16': 9 / 16,
    '3:4': 3 / 4,
    '9:19.5': 9 / 19.5,
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

  // 裁剪结果在原始图片上的输出尺寸，显示在弹窗底部，便于确认裁剪范围。
  const outputSize = computed(() => {
    const img = image.value;
    const canvas = canvasRef.value;
    if (!img || !canvas || crop.w < 1 || crop.h < 1) return '';
    const w = Math.max(
      1,
      Math.round((crop.w / canvas.width) * img.naturalWidth)
    );
    const h = Math.max(
      1,
      Math.round((crop.h / canvas.height) * img.naturalHeight)
    );
    return `输出 ${w} × ${h} px`;
  });

  function drawThirds(ctx: CanvasRenderingContext2D) {
    const x1 = crop.x + crop.w / 3;
    const x2 = crop.x + (crop.w * 2) / 3;
    const y1 = crop.y + crop.h / 3;
    const y2 = crop.y + (crop.h * 2) / 3;
    ctx.beginPath();
    ctx.moveTo(x1, crop.y);
    ctx.lineTo(x1, crop.y + crop.h);
    ctx.moveTo(x2, crop.y);
    ctx.lineTo(x2, crop.y + crop.h);
    ctx.moveTo(crop.x, y1);
    ctx.lineTo(crop.x + crop.w, y1);
    ctx.moveTo(crop.x, y2);
    ctx.lineTo(crop.x + crop.w, y2);
    ctx.stroke();
  }

  function drawCornerHandles(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number
  ) {
    const arm = Math.max(12, Math.min(24, Math.min(w, h) / 3));
    const corners = [
      { x, y, dx: 1, dy: 1 },
      { x: x + w, y, dx: -1, dy: 1 },
      { x, y: y + h, dx: 1, dy: -1 },
      { x: x + w, y: y + h, dx: -1, dy: -1 },
    ];
    const passes = [
      { color: 'rgba(255,255,255,0.95)', width: 8 },
      { color: '#165dff', width: 4 },
    ];
    passes.forEach(({ color, width }) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      corners.forEach((c) => {
        ctx.beginPath();
        ctx.moveTo(c.x + c.dx * arm, c.y);
        ctx.lineTo(c.x, c.y);
        ctx.lineTo(c.x, c.y + c.dy * arm);
        ctx.stroke();
      });
    });
  }

  function render() {
    const img = image.value;
    const canvas = canvasRef.value;
    if (!img || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;
    // 只在裁剪框外画遮罩：框内保留原图缩放后的真实内容，
    // 避免用画布坐标去裁原图导致框内画面被放大、与框外错位。
    ctx.drawImage(img, 0, 0, W, H);
    const x0 = Math.round(clamp(crop.x, 0, W));
    const y0 = Math.round(clamp(crop.y, 0, H));
    const x1 = Math.round(clamp(crop.x + crop.w, 0, W));
    const y1 = Math.round(clamp(crop.y + crop.h, 0, H));
    ctx.fillStyle = 'rgba(0,0,0,0.58)';
    ctx.fillRect(0, 0, W, y0);
    ctx.fillRect(0, y1, W, H - y1);
    ctx.fillRect(0, y0, x0, y1 - y0);
    ctx.fillRect(x1, y0, W - x1, y1 - y0);

    // 三分构图线：先深色底线再白色细线，亮图暗图都能看清。
    ctx.save();
    ctx.beginPath();
    ctx.rect(crop.x, crop.y, crop.w, crop.h);
    ctx.clip();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    drawThirds(ctx);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    drawThirds(ctx);
    ctx.restore();

    // 双色边框：白色描边打底 + 主色线，避免在浅色/深色图片上“消失”。
    const inset = 3;
    const rx = crop.x + inset;
    const ry = crop.y + inset;
    const rw = Math.max(0, crop.w - inset * 2);
    const rh = Math.max(0, crop.h - inset * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 6;
    ctx.strokeRect(rx, ry, rw, rh);
    ctx.strokeStyle = '#165dff';
    ctx.lineWidth = 3;
    ctx.strokeRect(rx, ry, rw, rh);

    // 四角 L 型手柄，略向内收，贴边裁剪时也不会被画布裁掉一半。
    const handleInset = 4;
    drawCornerHandles(
      ctx,
      crop.x + handleInset,
      crop.y + handleInset,
      crop.w - handleInset * 2,
      crop.h - handleInset * 2
    );
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

  function hitHandle(x: number, y: number): CropHandle | null {
    const hs = 14;
    const near = (a: number, b: number) => Math.abs(a - b) <= hs;
    const left = crop.x;
    const right = crop.x + crop.w;
    const top = crop.y;
    const bottom = crop.y + crop.h;
    if (near(x, left) && near(y, top)) return 'nw';
    if (near(x, right) && near(y, top)) return 'ne';
    if (near(x, left) && near(y, bottom)) return 'sw';
    if (near(x, right) && near(y, bottom)) return 'se';
    return null;
  }

  function hitCrop(x: number, y: number): boolean {
    return (
      x >= crop.x && x <= crop.x + crop.w && y >= crop.y && y <= crop.y + crop.h
    );
  }

  function handleCursor(handle: CropHandle | null): string {
    if (handle === 'nw' || handle === 'se') return 'nwse-resize';
    if (handle === 'ne' || handle === 'sw') return 'nesw-resize';
    return 'move';
  }

  function onPointerDown(event: PointerEvent) {
    if (!image.value) return;
    const p = eventPoint(event);
    const handle = hitHandle(p.x, p.y);
    if (handle) {
      dragging = 'resize';
      activeHandle = handle;
    } else if (hitCrop(p.x, p.y)) {
      dragging = 'move';
      activeHandle = null;
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
    canvasRef.value?.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }

  function onPointerMove(event: PointerEvent) {
    const canvas = canvasRef.value;
    if (!canvas || !image.value) return;
    const p = eventPoint(event);

    if (!dragging) {
      const handle = hitHandle(p.x, p.y);
      if (handle) {
        canvas.style.cursor = handleCursor(handle);
      } else {
        canvas.style.cursor = hitCrop(p.x, p.y) ? 'move' : 'default';
      }
      return;
    }

    // 指针可能移出画布，先夹到画布范围内再计算。
    const px = clamp(p.x, 0, canvas.width);
    const py = clamp(p.y, 0, canvas.height);
    const dx = px - dragStart.x;
    const dy = py - dragStart.y;

    if (dragging === 'move') {
      crop.x = Math.round(
        clamp(dragStart.cropX + dx, 0, canvas.width - dragStart.cropW)
      );
      crop.y = Math.round(
        clamp(dragStart.cropY + dy, 0, canvas.height - dragStart.cropH)
      );
      return;
    }

    const r = currentRatio();
    const left0 = dragStart.cropX;
    const top0 = dragStart.cropY;
    const right0 = left0 + dragStart.cropW;
    const bottom0 = top0 + dragStart.cropH;

    if (r > 0) {
      // 固定比例：被拖角对角方向的角固定不动，宽度同时受两条边约束。
      const anchorX =
        activeHandle === 'nw' || activeHandle === 'sw' ? right0 : left0;
      const anchorY =
        activeHandle === 'nw' || activeHandle === 'ne' ? bottom0 : top0;
      const dirX = activeHandle === 'ne' || activeHandle === 'se' ? 1 : -1;
      const dirY = activeHandle === 'se' || activeHandle === 'sw' ? 1 : -1;
      const maxWByX = dirX > 0 ? canvas.width - anchorX : anchorX;
      const maxHByY = dirY > 0 ? canvas.height - anchorY : anchorY;
      const proposedW = Math.max(
        (px - anchorX) * dirX,
        (py - anchorY) * dirY * r
      );
      const maxW = Math.max(MIN_CROP_SIZE, Math.min(maxWByX, maxHByY * r));
      const w = Math.round(clamp(proposedW, MIN_CROP_SIZE, maxW));
      const h = Math.round(w / r);
      crop.w = w;
      crop.h = h;
      crop.x = Math.round(dirX > 0 ? anchorX : anchorX - w);
      crop.y = Math.round(dirY > 0 ? anchorY : anchorY - h);
      return;
    }

    // 自由比例：按被拖角分别更新对应两条边，最小边长为 MIN_CROP_SIZE。
    let left = left0;
    let top = top0;
    let right = right0;
    let bottom = bottom0;
    if (activeHandle === 'nw' || activeHandle === 'sw') {
      left = clamp(px, 0, right0 - MIN_CROP_SIZE);
    } else {
      right = clamp(px, left0 + MIN_CROP_SIZE, canvas.width);
    }
    if (activeHandle === 'nw' || activeHandle === 'ne') {
      top = clamp(py, 0, bottom0 - MIN_CROP_SIZE);
    } else {
      bottom = clamp(py, top0 + MIN_CROP_SIZE, canvas.height);
    }
    crop.x = Math.round(left);
    crop.y = Math.round(top);
    crop.w = Math.round(right - left);
    crop.h = Math.round(bottom - top);
  }

  function onPointerUp(event?: PointerEvent) {
    if (dragging) {
      const canvas = canvasRef.value;
      if (canvas && event && canvas.hasPointerCapture?.(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
      dragging = null;
      activeHandle = null;
      render();
    }
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
    background: repeating-conic-gradient(#f2f3f5 0% 25%, #e5e6eb 0% 50%) 50% /
      16px 16px;
    cursor: move;
    touch-action: none;
  }

  .cropper-foot {
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: space-between;
    margin-top: 12px;
  }

  .cropper-size {
    color: var(--color-text-3);
    font-size: 12px;
  }

  .cropper-actions {
    display: flex;
    gap: 8px;
  }
</style>
