import axios from 'axios';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import { Message, Modal } from '@arco-design/web-vue';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';
import { useUserStore } from '@/store';
import { getToken } from '@/utils/auth';

export interface HttpResponse<T = unknown> {
  status: number;
  message: string;
  code: number;
  data: T;
}

if (import.meta.env.VITE_API_BASE_URL) {
  axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL;
}

// 全局请求超时：5 分钟（兼顾小请求与大文件上传）
axios.defaults.timeout = 300_000;

// 顶部进度条配置（关闭右上角 spinner）
NProgress.configure({ showSpinner: false });

// 当前活跃的非 SSE 请求计数，用于多并发场景下进度条只完成一次
let activeRequestCount = 0;

/**
 * 判断当前请求是否属于 SSE 链路。
 * SSE 鉴权（颁发 ticket）和 SSE 长连接路径都不应触发顶部进度条，
 * 否则会出现"长连接挂起 -> 进度条卡死"的现象。
 */
function isSseRequest(config?: AxiosRequestConfig): boolean {
  const url = config?.url || '';
  return (
    url.includes('/admin/sse/connect') ||
    url.includes('/admin/auth/sse/ticket') ||
    url.includes('/admin/auth/sse/')
  );
}

function startProgress(config?: AxiosRequestConfig) {
  if (isSseRequest(config)) return;
  activeRequestCount += 1;
  if (activeRequestCount === 1) {
    NProgress.start();
  }
}

function endProgress(config?: AxiosRequestConfig) {
  if (isSseRequest(config)) return;
  activeRequestCount = Math.max(0, activeRequestCount - 1);
  if (activeRequestCount === 0) {
    NProgress.done();
  }
}

axios.interceptors.request.use(
  (config: AxiosRequestConfig) => {
    // 启动顶部进度条（自动排除 SSE 请求）
    startProgress(config);
    // let each request carry token
    // this example using the JWT token
    // Authorization is a custom headers key
    // please modify it according to the actual situation
    const token = getToken();
    if (token) {
      if (!config.headers) {
        config.headers = {};
      }
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    // 请求阶段出错也要结束进度条
    endProgress(error?.config);
    return Promise.reject(error);
  }
);
// add response interceptors
axios.interceptors.response.use(
  (response: AxiosResponse<HttpResponse>) => {
    // 结束顶部进度条
    endProgress(response.config);
    // HTTP 2xx means the request succeeded, return the full AxiosResponse
    // 检查业务状态码，非零 code 视为业务错误
    const res = response.data as HttpResponse;
    // 业务状态码 1 和 2 均为成功
    if (
      res &&
      typeof res.code === 'number' &&
      res.code !== 1 &&
      res.code !== 2
    ) {
      Message.error({
        content: res.message || 'Request Error',
        duration: 5 * 1000,
      });
      return Promise.reject(new Error(res.message || 'Request Error'));
    }
    return response;
  },
  (error) => {
    // 失败也要结束进度条
    endProgress(error?.config);

    const status = error.response?.status;
    const res = error.response?.data;

    // 401 未授权：token 过期或无效，强制登出
    // 排除获取当前用户信息的接口，因为该接口用于验证登录状态
    if (status === 401 && error.config?.url !== '/api/v1/admin/auth/user') {
      Modal.error({
        title: 'Confirm logout',
        content:
          'You have been logged out, you can cancel to stay on this page, or log in again',
        okText: 'Re-Login',
        async onOk() {
          const userStore = useUserStore();

          await userStore.logout();
          window.location.reload();
        },
      });
    }

    Message.error({
      content: res?.message || error.message || 'Request Error',
      duration: 5 * 1000,
    });
    return Promise.reject(error);
  }
);
