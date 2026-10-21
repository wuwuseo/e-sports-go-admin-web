import { mergeConfig } from 'vite';
import eslint from 'vite-plugin-eslint';
import baseConfig from './vite.config.base';

export default mergeConfig(
  {
    mode: 'development',
    server: {
      open: true,
      fs: {
        strict: true,
      },
      proxy: {
        // SSE 长连接代理：禁用响应缓冲与超时，避免事件被合并或被切断
        '/api/v1/admin/sse': {
          target: 'http://127.0.0.1:9501',
          changeOrigin: true,
          ws: false,
          // SSE 不能复用 keep-alive
          proxyTimeout: 0,
          timeout: 0,
          configure: (proxy) => {
            proxy.on('proxyRes', (proxyRes) => {
              // 关闭 Nagle/缓冲，确保事件流实时下发
              proxyRes.headers['cache-control'] = 'no-cache';
              proxyRes.headers['x-accel-buffering'] = 'no';
              // 关键：SSE 是流式响应，必须移除 content-length，
              // 否则代理层可能等响应体写满才转发，导致前端 EventStream 一直拿不到事件。
              if (
                proxyRes.headers['content-type']?.includes('text/event-stream')
              ) {
                delete proxyRes.headers['content-length'];
                proxyRes.headers.connection = 'keep-alive';
              }
            });
          },
        },
        // 公开附件直链（attachment.public_base_url 默认 /uploads）：
        // 装修图片等公开素材保存站内路径，开发期需与线上同源转发。
        '/uploads': {
          target: 'http://127.0.0.1:9501',
          changeOrigin: true,
        },
        // 普通 REST 接口：保持原有配置
        '/api': {
          target: 'http://127.0.0.1:9501',
          changeOrigin: true,
          // 代理请求超时 5 分钟（处理大文件上传）
          proxyTimeout: 300_000,
          // 上游请求超时 5 分钟
          timeout: 300_000,
        },
      },
    },
    plugins: [
      eslint({
        cache: false,
        include: ['src/**/*.ts', 'src/**/*.tsx', 'src/**/*.vue'],
        exclude: ['node_modules'],
      }),
    ],
  },
  baseConfig
);
