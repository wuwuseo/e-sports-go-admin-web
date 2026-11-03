import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SysPermissionTreeNode } from '@/types/api';
import type { PageDraftPayload } from '../../api';
import {
  getEsportsPage,
  getEsportsPageAssets,
  getEsportsPageVersions,
} from '../../api';
import { getPageAccess, loadPageData } from './page-data';

vi.mock('../../api', () => ({
  getEsportsPage: vi.fn(),
  getEsportsPageAssets: vi.fn(),
  getEsportsPageVersions: vi.fn(),
}));

function permission(
  path: string,
  method: string,
  overrides: Partial<SysPermissionTreeNode> = {}
): SysPermissionTreeNode {
  return {
    id: 1,
    name: '页面权限',
    code: 'esports:pages:test',
    type: 'api',
    domain: 'default',
    status: 1,
    path,
    method,
    ...overrides,
  };
}

const payload: PageDraftPayload = {
  document: {
    channel: 'uni_customer_home',
    status: 'published',
    draft_version: 11,
    published_version_no: 2,
    updated_by: 1,
  },
  components: [{ type: 'search', visible: true }],
};

function response<T>(data: T) {
  return {
    data: { code: 1, message: '成功', data },
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {},
  };
}

describe('装修页面权限与数据加载', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getEsportsPage).mockResolvedValue(response(payload));
    vi.mocked(getEsportsPageVersions).mockResolvedValue(response([]));
    vi.mocked(getEsportsPageAssets).mockResolvedValue(response([]));
  });

  it('只读角色能加载正文和版本，不调用未授权素材接口，也无保存权限', async () => {
    const access = getPageAccess(
      [
        permission('/api/v1/esports/admin/pages/{channel}', 'GET'),
        permission('/api/v1/esports/admin/pages/{channel}/versions', 'GET'),
      ],
      false
    );
    const result = await loadPageData('uni_customer_home', access);
    expect(access.saveDraft).toBe(false);
    expect(access.readAssets).toBe(false);
    expect(access.createAssets).toBe(false);
    expect(access.readAdminNames).toBe(false);
    expect(result.page).toEqual(payload);
    expect(result.errors).toEqual([]);
    expect(getEsportsPageVersions).toHaveBeenCalledWith('uni_customer_home');
    expect(getEsportsPageAssets).not.toHaveBeenCalled();
  });

  it('GET 素材权限不能当作 POST 权限，停用和按钮节点也不能授予 API 权限', () => {
    const access = getPageAccess(
      [
        permission('/api/v1/esports/admin/page-assets', 'GET'),
        permission('/api/v1/esports/admin/page-assets', 'POST', { status: 0 }),
        permission('/api/v1/esports/admin/pages/{channel}/draft', 'PUT', {
          type: 'button',
        }),
      ],
      false
    );
    expect(access.readAssets).toBe(true);
    expect(access.createAssets).toBe(false);
    expect(access.saveDraft).toBe(false);
  });

  it('嵌套 API 权限可授权编辑，超管可使用全部页面能力', () => {
    const access = getPageAccess(
      [
        permission('', '', {
          type: 'menu',
          children: [
            permission('/api/v1/esports/admin/pages/{channel}/draft', 'PUT'),
          ],
        }),
      ],
      false
    );
    expect(access.saveDraft).toBe(true);
    expect(Object.values(getPageAccess([], true)).every(Boolean)).toBe(true);
  });

  it('已授权素材接口发生错误时仍保留真实正文', async () => {
    const error = new Error('素材服务暂不可用');
    vi.mocked(getEsportsPageAssets).mockRejectedValue(error);
    const result = await loadPageData(
      'uni_customer_home',
      getPageAccess([], true)
    );
    expect(result.page.document.draft_version).toBe(11);
    expect(result.page.components).toEqual(payload.components);
    expect(result.assets).toEqual([]);
    expect(result.errors).toEqual([error]);
  });

  it('发布记录接口发生错误时不丢弃正文和素材读取结果', async () => {
    const error = new Error('发布记录暂不可用');
    vi.mocked(getEsportsPageVersions).mockRejectedValue(error);
    const result = await loadPageData(
      'uni_customer_home',
      getPageAccess([], true)
    );
    expect(result.page).toEqual(payload);
    expect(result.versions).toEqual([]);
    expect(result.errors).toEqual([error]);
    expect(getEsportsPageAssets).toHaveBeenCalledOnce();
  });

  it('正文读取失败时明确失败，不用空白草稿代替', async () => {
    const error = new Error('正文读取失败');
    vi.mocked(getEsportsPage).mockRejectedValue(error);
    await expect(
      loadPageData('uni_customer_home', getPageAccess([], true))
    ).rejects.toBe(error);
    expect(getEsportsPageAssets).not.toHaveBeenCalled();
  });
});
