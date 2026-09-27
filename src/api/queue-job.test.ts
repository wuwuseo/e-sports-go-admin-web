// eslint-disable-next-line import/no-unresolved
import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import {
  getQueueTasks,
  getQueueStats,
  getQueueHandlers,
  enqueueQueueTask,
  getQueueTaskDetail,
  retryQueueTask,
  cancelQueueTask,
  deleteQueueTask,
  getQueueCapabilities,
  getQueueOverview,
  pauseQueue,
  resumeQueue,
  getQueueRawMessage,
} from './queue-job';

vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
    put: vi.fn(),
  },
}));

describe('queue job api contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('列表请求透传必填 state 与分页参数', () => {
    const params = {
      state: 'pending' as const,
      queue: 'default',
      page: 2,
      page_size: 20,
    };

    getQueueTasks(params);

    expect(axios.get).toHaveBeenCalledWith('/api/v1/admin/auth/queue-jobs', {
      params,
    });
  });

  it('统计与处理器走各自子路径', () => {
    getQueueStats();
    getQueueHandlers();

    expect(axios.get).toHaveBeenNthCalledWith(
      1,
      '/api/v1/admin/auth/queue-jobs/stats'
    );
    expect(axios.get).toHaveBeenNthCalledWith(
      2,
      '/api/v1/admin/auth/queue-jobs/handlers'
    );
  });

  it('入队 payload 以 JSON 字符串提交', () => {
    const data = {
      name: 'health_check',
      payload: '{"key":"value"}',
      queue: 'default',
      delay_seconds: 0,
      max_retry: 3,
    };

    enqueueQueueTask(data);

    expect(axios.post).toHaveBeenCalledWith(
      '/api/v1/admin/auth/queue-jobs',
      data
    );
  });

  it('详情/重试/取消/删除按 queue 与 id 拼接路径', () => {
    getQueueTaskDetail('default', 'task-1');
    retryQueueTask('default', 'task-1');
    cancelQueueTask('default', 'task-1');
    deleteQueueTask('default', 'task-1');

    expect(axios.get).toHaveBeenCalledWith(
      '/api/v1/admin/auth/queue-jobs/default/task-1'
    );
    expect(axios.post).toHaveBeenNthCalledWith(
      1,
      '/api/v1/admin/auth/queue-jobs/default/task-1/retry'
    );
    expect(axios.post).toHaveBeenNthCalledWith(
      2,
      '/api/v1/admin/auth/queue-jobs/default/task-1/cancel'
    );
    expect(axios.delete).toHaveBeenCalledWith(
      '/api/v1/admin/auth/queue-jobs/default/task-1'
    );
  });

  it('原生能力与队列操作使用同一管理 API', () => {
    getQueueCapabilities();
    getQueueOverview();
    pauseQueue('high priority');
    resumeQueue('high priority');
    getQueueRawMessage('default', 7);

    expect(axios.get).toHaveBeenNthCalledWith(
      1,
      '/api/v1/admin/auth/queue-jobs/capabilities'
    );
    expect(axios.get).toHaveBeenNthCalledWith(
      2,
      '/api/v1/admin/auth/queue-jobs/overview'
    );
    expect(axios.get).toHaveBeenNthCalledWith(
      3,
      '/api/v1/admin/auth/queue-jobs/default/messages/7'
    );
    expect(axios.post).toHaveBeenNthCalledWith(
      1,
      '/api/v1/admin/auth/queue-jobs/high%20priority/pause'
    );
    expect(axios.post).toHaveBeenNthCalledWith(
      2,
      '/api/v1/admin/auth/queue-jobs/high%20priority/resume'
    );
  });
});
