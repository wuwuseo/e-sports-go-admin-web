import type { PermissionResponse } from '@/types/api';

export default class PermissionTransformer {
  static extractPermissionCodes(rawData: unknown): string[] {
    if (!rawData) {
      return [];
    }

    if (PermissionTransformer.isStringArray(rawData)) {
      return rawData.filter(Boolean);
    }

    if (PermissionTransformer.isPermissionArray(rawData)) {
      return rawData.map((permission) => permission.object).filter(Boolean);
    }

    if (PermissionTransformer.isNestedPermissionObject(rawData)) {
      const nestedData = rawData.permissions || rawData.data;
      return PermissionTransformer.extractPermissionCodes(nestedData);
    }

    return [];
  }

  static normalizePermissions(rawData: unknown): PermissionResponse[] {
    if (!rawData) {
      return [];
    }

    if (PermissionTransformer.isPermissionArray(rawData)) {
      return rawData;
    }

    if (PermissionTransformer.isStringArray(rawData)) {
      return rawData.filter(Boolean).map((code) => ({
        id: 0,
        role_name: '',
        domain: 'default',
        object: code,
        action: 'access',
        type: 'button',
      }));
    }

    if (PermissionTransformer.isNestedPermissionObject(rawData)) {
      const nestedData = rawData.permissions || rawData.data;
      return PermissionTransformer.normalizePermissions(nestedData);
    }

    return [];
  }

  private static isStringArray(data: unknown): data is string[] {
    return (
      Array.isArray(data) && data.every((item) => typeof item === 'string')
    );
  }

  private static isPermissionArray(
    data: unknown
  ): data is PermissionResponse[] {
    return (
      Array.isArray(data) &&
      data.every(
        (item) =>
          typeof item === 'object' &&
          item !== null &&
          'object' in item &&
          typeof item.object === 'string'
      )
    );
  }

  private static isNestedPermissionObject(
    data: unknown
  ): data is { permissions?: unknown; data?: unknown } {
    return (
      typeof data === 'object' &&
      data !== null &&
      ('permissions' in data || 'data' in data)
    );
  }
}
