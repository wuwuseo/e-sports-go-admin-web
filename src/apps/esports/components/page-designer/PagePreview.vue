<template>
  <div class="pp-phone">
    <div class="pp-statusbar" />
    <div class="pp-body">
      <view
        v-for="(comp, idx) in visibleComponents"
        :key="comp.type + '-' + idx"
        class="pp-card"
      >
        <!-- 搜索 -->
        <div v-if="comp.type === 'search'" class="pp-search">
          <input
            class="pp-search-input"
            disabled
            :placeholder="
              stringOf(comp.props?.placeholder) || '搜索服务 / 陪玩'
            "
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
        <div v-else-if="comp.type === 'player_recommend'" class="pp-card-plain">
          <div class="pp-title">{{ titleOf(comp, '陪玩推荐') }}</div>
          <div class="pp-muted">
            {{
              stringOf(comp.props?.empty_text) ||
              '陪玩推荐建设中，可联系归属客服为你安排心仪陪玩。'
            }}
          </div>
        </div>

        <!-- 活动专区 -->
        <div v-else-if="comp.type === 'activity'" class="pp-card-plain">
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
      </view>
      <div class="pp-muted pp-center"
        >下单后由归属客服跟进，付款前可随时联系客服改单</div
      >
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue';
  import type { PageComponent } from '../../api';

  const props = defineProps<{
    components: PageComponent[];
  }>();

  const visibleComponents = computed(() =>
    props.components.filter((comp) => comp.type && comp.visible !== false)
  );

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
  .pp-phone {
    width: 320px;
    min-height: 560px;
    margin: 0 auto;
    overflow: hidden;
    background: #f5f6f8;
    border: 10px solid #1f2937;
    border-radius: 24px;
  }

  .pp-statusbar {
    height: 22px;
    background: #1f2937;
  }

  .pp-body {
    padding: 10px;
  }

  .pp-card {
    margin-bottom: 8px;
    padding: 12px;
    background: #fff;
    border-radius: 8px;
  }

  .pp-card-plain {
    margin-bottom: 8px;
    padding: 12px;
    background: #fff;
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

  .pp-center {
    margin-bottom: 16px;
    text-align: center;
  }
</style>
