<template>
  <div class="container"></div>
</template>

<script lang="ts" setup></script>

<script lang="ts">
  export default {
    name: 'Dashboard', // 如需 keep-alive 的 include 生效，必须为组件命名
  };
</script>

<style lang="less" scoped>
  .container {
    background-color: var(--color-fill-2);
    padding: 16px 20px;
    padding-bottom: 0;
    display: flex;
  }
</style>

<style lang="less" scoped>
  // 响应式
  .mobile {
    .container {
      display: block;
    }
  }
</style>
