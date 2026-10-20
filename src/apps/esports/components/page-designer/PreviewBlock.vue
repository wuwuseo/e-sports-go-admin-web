<template>
  <!-- 布局容器：按列渲染子组件；空列在可选中模式下显示占位，点击回到布局本身。 -->
  <div
    v-if="comp.type === 'layout'"
    class="pp-layout"
    :class="{ 'pp-layout-selected': selected }"
    :style="layoutStyle"
  >
    <div v-for="slot in layoutSlots" :key="slot.index" class="pp-layout-col">
      <PreviewBlock
        v-if="slot.child"
        :comp="slot.child"
        :path="`${path}.${slot.index}`"
        :selected-key="selectedKey"
        :selectable="selectable"
        @select="emit('select', $event)"
      />
      <div
        v-else-if="selectable"
        class="pp-layout-empty"
        @click="emit('select', path)"
        >空列</div
      >
    </div>
  </div>
  <div
    v-else
    class="pp-card"
    :class="{
      'pp-card-clickable': selectable,
      'pp-card-selected': selected,
    }"
    @click="onSelect"
  >
    <!-- 搜索 -->
    <div v-if="comp.type === 'search'" class="pp-search">
      <input
        class="pp-search-input"
        disabled
        :placeholder="stringOf(comp.props?.placeholder) || '搜索服务 / 陪玩'"
      />
      <span class="pp-search-btn">搜索</span>
    </div>

    <!-- 轮播图 -->
    <div v-else-if="comp.type === 'carousel'" class="pp-carousel">
      <div v-if="imagesOf(comp).length" class="pp-carousel-inner">
        <img
          v-for="(img, i) in imagesOf(comp)"
          :key="i"
          class="pp-carousel-img"
          :src="img"
          alt=""
        />
      </div>
      <div v-else class="pp-empty">轮播图（未配置图片）</div>
    </div>

    <!-- 单图（可点击跳转） -->
    <div
      v-else-if="comp.type === 'image'"
      class="pp-image"
      :style="imageWrapperStyle(comp)"
    >
      <img
        v-if="imageOf(comp)"
        :src="imageOf(comp)"
        :style="imageStyle(comp)"
        alt=""
      />
      <div v-else class="pp-empty">图片（未配置）</div>
    </div>

    <!-- 公告条 -->
    <div v-else-if="comp.type === 'notice'" class="pp-notice">
      <span
        class="pp-notice-text"
        :style="{ color: stringOf(comp.props?.color) || undefined }"
        >{{ stringOf(comp.props?.text) || '公告内容' }}</span
      >
    </div>

    <!-- 快捷导航宫格 -->
    <div v-else-if="comp.type === 'quick_nav'" class="pp-nav">
      <div
        v-for="item in navItems(comp)"
        :key="item.target + '-' + item.name"
        class="pp-nav-item"
      >
        {{ item.name }}
      </div>
      <div v-if="!navItems(comp).length" class="pp-empty"
        >快捷导航（未配置）</div
      >
    </div>

    <!-- 游戏/服务分类 -->
    <div v-else-if="comp.type === 'category'" class="pp-category">
      <div class="pp-title">{{ titleOf(comp, '游戏 / 服务分类') }}</div>
      <div class="pp-category-grid">
        <span
          v-for="item in navItems(comp)"
          :key="item.target + '-' + item.name"
          class="pp-category-item"
          >{{ item.name }}</span
        >
      </div>
    </div>

    <!-- 商品/套餐列表 -->
    <div v-else-if="comp.type === 'product_list'" class="pp-product">
      <div class="pp-title">{{ titleOf(comp, '在售服务') }}</div>
      <div class="pp-empty">
        {{ stringOf(comp.props?.empty_text) || '暂无可下单的服务' }}
      </div>
    </div>

    <!-- 陪玩推荐 -->
    <div v-else-if="comp.type === 'player_recommend'">
      <div class="pp-title">{{ titleOf(comp, '陪玩推荐') }}</div>
      <div class="pp-muted">
        {{
          stringOf(comp.props?.empty_text) ||
          '陪玩推荐建设中，可联系归属客服为你安排心仪陪玩。'
        }}
      </div>
    </div>

    <!-- 活动专区 -->
    <div v-else-if="comp.type === 'activity'">
      <div class="pp-title">{{ titleOf(comp, '活动专区') }}</div>
      <div class="pp-muted">
        {{
          stringOf(comp.props?.empty_text) ||
          '最新活动请关注客服朋友圈或咨询归属客服。'
        }}
      </div>
    </div>

    <!-- 会员/余额入口 -->
    <div v-else-if="comp.type === 'member_entry'" class="pp-member">
      <div>
        <div class="pp-member-title">{{ titleOf(comp, '会员与余额') }}</div>
        <div class="pp-muted">查看余额与会员权益</div>
      </div>
      <span class="pp-arrow">›</span>
    </div>

    <!-- 客服与订单入口 -->
    <div v-else-if="comp.type === 'support_entry'" class="pp-support">
      <div class="pp-support-btn">
        <span class="pp-support-name">联系客服</span>
        <span class="pp-muted">归属客服跟进</span>
      </div>
      <div class="pp-support-btn">
        <span class="pp-support-name">我的订单</span>
        <span class="pp-muted">订单与去付款</span>
      </div>
      <div class="pp-support-btn">
        <span class="pp-support-name">我的售后</span>
        <span class="pp-muted">售后进度查询</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue';
  import type { CSSProperties } from 'vue';
  import type { PageComponent } from '../../api';

  const props = withDefaults(
    defineProps<{
      comp: PageComponent;
      path: string;
      selectedKey?: string;
      selectable?: boolean;
    }>(),
    { selectedKey: '', selectable: false }
  );

  const emit = defineEmits<{
    (e: 'select', path: string): void;
  }>();

  const selected = computed(
    () => props.selectable && props.path === props.selectedKey
  );

  const columns = computed(() => {
    const value = Number(props.comp.props?.columns);
    return Number.isFinite(value) && value >= 1 && value <= 3
      ? Math.floor(value)
      : 1;
  });

  const layoutSlots = computed(() => {
    const children = props.comp.children || [];
    return Array.from({ length: columns.value }, (_, index) => {
      const child = children[index];
      return {
        index,
        // 隐藏的子组件按空列处理，避免在预览里显示一个已被关闭的模块。
        child: child && child.visible !== false ? child : null,
      };
    });
  });

  const layoutStyle = computed(() => ({
    gridTemplateColumns: `repeat(${columns.value}, minmax(0, 1fr))`,
  }));

  function onSelect() {
    if (props.selectable) emit('select', props.path);
  }

  function stringOf(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }

  function titleOf(comp: PageComponent, fallback: string): string {
    return stringOf(comp.props?.title) || fallback;
  }

  function imagesOf(comp: PageComponent): string[] {
    const value = comp.props?.images;
    if (!Array.isArray(value)) return [];
    return value.filter((v): v is string => typeof v === 'string');
  }

  function imageOf(comp: PageComponent): string {
    return stringOf(comp.props?.image);
  }

  function imageFit(comp: PageComponent): string {
    const value = stringOf(comp.props?.fit);
    return ['widthFix', 'aspectFill', 'aspectFit'].includes(value)
      ? value
      : 'widthFix';
  }

  function imageHeight(comp: PageComponent): number {
    const value = Number(comp.props?.height);
    return Number.isFinite(value) && value > 0 ? value : 160;
  }

  function imageRadius(comp: PageComponent): number {
    const value = Number(comp.props?.radius);
    return Number.isFinite(value) ? Math.min(48, Math.max(0, value)) : 8;
  }

  function imageSpacing(comp: PageComponent): number | null {
    const value = Number(comp.props?.spacing);
    return Number.isFinite(value) ? Math.min(240, Math.max(0, value)) : null;
  }

  function imageWrapperStyle(comp: PageComponent): CSSProperties {
    const spacing = imageSpacing(comp);
    return {
      borderRadius: `${imageRadius(comp)}px`,
      overflow: 'hidden',
      ...(spacing !== null
        ? { marginTop: `${spacing}px`, marginBottom: `${spacing}px` }
        : {}),
    };
  }

  function imageStyle(comp: PageComponent): CSSProperties {
    const fit = imageFit(comp);
    let objectFit: CSSProperties['objectFit'] = 'fill';
    if (fit === 'aspectFill') objectFit = 'cover';
    if (fit === 'aspectFit') objectFit = 'contain';
    return {
      width: '100%',
      height: fit === 'widthFix' ? 'auto' : `${imageHeight(comp)}px`,
      objectFit,
      background: fit === 'aspectFit' ? '#f5f6f8' : undefined,
    };
  }

  interface NavItem {
    name: string;
    target: string;
  }

  function navItems(comp: PageComponent): NavItem[] {
    const value = comp.props?.items;
    if (!Array.isArray(value)) return [];
    return value
      .map((v) => {
        if (typeof v === 'object' && v !== null) {
          const o = v as Record<string, unknown>;
          return {
            name: typeof o.name === 'string' ? o.name : '',
            target: typeof o.target === 'string' ? o.target : '',
          };
        }
        return { name: '', target: '' };
      })
      .filter((item) => item.name);
  }
</script>

<style scoped>
  .pp-card {
    margin-bottom: 8px;
    padding: 12px;
    background: #fff;
    border-radius: 8px;
  }

  .pp-card-clickable {
    cursor: pointer;
    transition: box-shadow 0.15s ease;
  }

  .pp-card-clickable:hover {
    box-shadow: 0 0 0 2px var(--color-border-3);
  }

  .pp-card.pp-card-selected,
  .pp-card.pp-card-selected:hover {
    box-shadow: 0 0 0 2px rgb(var(--primary-6));
  }

  .pp-layout {
    display: grid;
    gap: 8px;
    margin-bottom: 8px;
    padding: 4px;
    border-radius: 10px;
    transition: box-shadow 0.15s ease;
  }

  .pp-layout-selected {
    box-shadow: 0 0 0 2px rgb(var(--primary-6));
  }

  .pp-layout-col {
    min-width: 0;
  }

  .pp-layout-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 56px;
    color: #9ca3af;
    font-size: 12px;
    background: #fff;
    border: 1px dashed #d9dce3;
    border-radius: 8px;
  }

  .pp-title {
    margin-bottom: 8px;
    color: #1f2937;
    font-weight: 600;
    font-size: 15px;
  }

  .pp-muted {
    color: #9ca3af;
    font-size: 12px;
  }

  .pp-empty {
    padding: 8px 0;
    color: #9ca3af;
    font-size: 12px;
    text-align: center;
  }

  .pp-search {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .pp-search-input {
    flex: 1;
    height: 32px;
    padding: 0 12px;
    font-size: 12px;
    background: #f0f1f3;
    border: none;
    border-radius: 999px;

    /* 禁用输入框不派发点击事件，放行后点击搜索区才能选中该组件。 */
    pointer-events: none;
  }

  .pp-search-btn {
    color: #165dff;
    font-weight: 600;
    font-size: 13px;
  }

  .pp-carousel-inner {
    display: flex;
    gap: 4px;
    overflow: hidden;
  }

  .pp-carousel-img {
    width: 100%;
    height: 120px;
    object-fit: cover;
    border-radius: 6px;
  }

  .pp-image img {
    display: block;
    width: 100%;
  }

  .pp-notice-text {
    color: #4b5563;
    font-size: 13px;
  }

  .pp-nav {
    display: flex;
    flex-wrap: wrap;
  }

  .pp-nav-item {
    width: 20%;
    padding: 8px 0;
    color: #1f2937;
    font-size: 12px;
    text-align: center;
  }

  .pp-category-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .pp-category-item {
    padding: 6px 14px;
    color: #4b5563;
    font-size: 12px;
    background: #f0f1f3;
    border-radius: 999px;
  }

  .pp-member {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .pp-member-title {
    font-weight: 600;
    font-size: 15px;
  }

  .pp-arrow {
    color: #9ca3af;
    font-size: 20px;
  }

  .pp-support {
    display: flex;
  }

  .pp-support-btn {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 4px;
    align-items: center;
  }

  .pp-support-name {
    font-weight: 600;
    font-size: 13px;
  }
</style>
