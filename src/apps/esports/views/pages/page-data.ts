import type { SysPermissionTreeNode } from '@/types/api';
import {
  getEsportsPage,
  getEsportsPageAssets,
  getEsportsPageVersions,
} from '../../api';

export function getPageAccess(
  tree: SysPermissionTreeNode[],
  isSuperAdmin: boolean
) {
  const allows = (method: string, path: string, nodes = tree): boolean =>
    isSuperAdmin ||
    nodes.some(
      (node) =>
        node.status === 1 &&
        ((node.type === 'api' &&
          node.method === method &&
          node.path === path) ||
          allows(method, path, node.children || []))
    );
  return {
    saveDraft: allows('PUT', '/api/v1/esports/admin/pages/{channel}/draft'),
    readVersions: allows(
      'GET',
      '/api/v1/esports/admin/pages/{channel}/versions'
    ),
    readAssets: allows('GET', '/api/v1/esports/admin/page-assets'),
    createAssets: allows('POST', '/api/v1/esports/admin/page-assets'),
    readAdminNames: allows('GET', '/api/v1/admin/auth/admins'),
  };
}

export async function loadPageData(
  channel: string,
  access: ReturnType<typeof getPageAccess>
) {
  const page = await getEsportsPage(channel);
  const [versions, assets] = await Promise.allSettled([
    access.readVersions ? getEsportsPageVersions(channel) : undefined,
    access.readAssets ? getEsportsPageAssets() : undefined,
  ]);
  return {
    page: page.data.data,
    versions:
      versions.status === 'fulfilled' ? versions.value?.data.data || [] : [],
    assets: assets.status === 'fulfilled' ? assets.value?.data.data || [] : [],
    errors: [versions, assets].flatMap((result) =>
      result.status === 'rejected' ? [result.reason] : []
    ),
  };
}
