import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

// Vitest 配置：使用 Node 环境，仅运行 src 下的单元测试
export default defineConfig({
  resolve: {
    alias: {
      // 与 tsconfig.json 中 "@/*": ["src/*"] 保持一致
      '@': resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    globals: false,
  },
});
