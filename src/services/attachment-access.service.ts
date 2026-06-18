import { getAttachmentAccessUrl } from '@/api/attachment';
import type { AttachmentAccessUrlResponse } from '@/types/api';

export interface AttachmentAccessInfo extends AttachmentAccessUrlResponse {
  url: string;
}

interface CachedAccessInfo {
  data: AttachmentAccessInfo;
  expiresAt: number;
}

interface ResolveAttachmentAccessOptions {
  forceRefresh?: boolean;
}

const REFRESH_EARLY_MS = 30 * 1000;
const PUBLIC_CACHE_EXPIRES_AT = Number.POSITIVE_INFINITY;

const accessInfoCache = new Map<number, CachedAccessInfo>();
const pendingRequests = new Map<number, Promise<AttachmentAccessInfo>>();

function getAttachmentAccessErrorMessage(error: unknown) {
  const candidate = error as { response?: { status?: number } };
  const status = candidate.response?.status;

  if (status === 401) {
    return '登录或访问凭证过期';
  }

  if (status === 404) {
    return '文件不存在';
  }

  return '获取附件访问地址失败';
}

function toAttachmentAccessError(error: unknown) {
  const message = getAttachmentAccessErrorMessage(error);
  const nextError = new Error(message);
  const causeTarget = nextError as Error & { cause?: unknown };
  causeTarget.cause = error;
  return nextError;
}

function shouldCacheAccessInfo(data: AttachmentAccessInfo) {
  return (
    data.public === true || (data.public !== false && data.expires_in === 0)
  );
}

function getCacheExpiresAt(data: AttachmentAccessInfo) {
  if (shouldCacheAccessInfo(data)) {
    return PUBLIC_CACHE_EXPIRES_AT;
  }

  const ttlMs = Math.max(data.expires_in * 1000 - REFRESH_EARLY_MS, 0);
  return ttlMs > 0 ? Date.now() + ttlMs : 0;
}

export function normalizeAttachmentAccessUrl(url: string) {
  if (!url) return '';

  // 已是完整绝对 URL（含协议）：保持不变
  try {
    return new URL(url).toString();
  } catch {
    // 进入相对路径分支
  }

  // 仅在浏览器环境下根据当前站点 origin 解析相对路径
  if (typeof window === 'undefined' || !window.location?.origin) {
    return url;
  }

  // 无前导斜杠时补一个，统一基于 origin 解析
  const relativePath = url.startsWith('/') ? url : `/${url}`;
  try {
    return new URL(relativePath, window.location.origin).toString();
  } catch {
    return url;
  }
}

export async function getAttachmentAccessInfo(
  id: number,
  options: ResolveAttachmentAccessOptions = {}
) {
  const now = Date.now();
  const cached = accessInfoCache.get(id);

  if (!options.forceRefresh && cached && cached.expiresAt > now) {
    return cached.data;
  }

  if (!options.forceRefresh) {
    const pending = pendingRequests.get(id);
    if (pending) {
      return pending;
    }
  }

  const request = getAttachmentAccessUrl(id)
    .then((response) => {
      const rawData = response.data.data;
      const data: AttachmentAccessInfo = {
        ...rawData,
        url: normalizeAttachmentAccessUrl(rawData.url),
      };
      const expiresAt = getCacheExpiresAt(data);

      if (shouldCacheAccessInfo(data) && expiresAt > now) {
        accessInfoCache.set(id, { data, expiresAt });
      } else {
        accessInfoCache.delete(id);
      }

      return data;
    })
    .catch((error) => {
      throw toAttachmentAccessError(error);
    })
    .finally(() => {
      if (pendingRequests.get(id) === request) {
        pendingRequests.delete(id);
      }
    });

  if (!options.forceRefresh) {
    pendingRequests.set(id, request);
  }

  return request;
}

export async function resolveAttachmentAccessUrl(
  id: number,
  options: ResolveAttachmentAccessOptions = {}
) {
  const data = await getAttachmentAccessInfo(id, options);
  return data.url;
}

export function clearAttachmentAccessUrlCache(id?: number) {
  if (typeof id === 'number') {
    accessInfoCache.delete(id);
    pendingRequests.delete(id);
    return;
  }

  accessInfoCache.clear();
  pendingRequests.clear();
}
