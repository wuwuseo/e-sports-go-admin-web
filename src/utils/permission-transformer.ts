import type { PermissionResponse } from '@/types/api';

type PermissionLike = Partial<PermissionResponse> & {
  code?: string;
  path?: string;
  menu_path?: string;
  name?: string;
  domain?: string;
  children?: PermissionLike[];
};

type PermissionRouteLike = {
  path: string;
  name?: string | symbol;
  meta?: {
    permissionCode?: string | string[];
  };
  children?: PermissionRouteLike[];
};

export default class PermissionTransformer {
  private static aliasMap = new Map<string, Set<string>>();

  static registerAlias(code: string, aliases: string | string[]) {
    const normalizedAliases = Array.isArray(aliases) ? aliases : [aliases];
    const existing =
      PermissionTransformer.aliasMap.get(code) || new Set<string>();

    normalizedAliases.filter(Boolean).forEach((alias) => {
      existing.add(alias);
    });
    PermissionTransformer.aliasMap.set(code, existing);
  }

  static registerAliases(aliases: Record<string, string | string[]>) {
    Object.entries(aliases).forEach(([code, values]) => {
      PermissionTransformer.registerAlias(code, values);
    });
  }

  static unregisterAlias(code: string) {
    PermissionTransformer.aliasMap.delete(code);
  }

  static clearAliasCache() {
    PermissionTransformer.aliasMap.clear();
  }

  static registerRouteAliases(routes: PermissionRouteLike[]) {
    routes.forEach((route) => {
      PermissionTransformer.registerRouteAlias(route);
    });
  }

  static extractPermissionCodes(rawData: unknown): string[] {
    return PermissionTransformer.extractPermissionCodesByType(rawData);
  }

  static extractPermissionCodesByType(
    rawData: unknown,
    type?: PermissionResponse['type']
  ): string[] {
    const permissions = PermissionTransformer.normalizePermissions(rawData);
    const filteredPermissions = type
      ? permissions.filter((permission) => permission.type === type)
      : permissions;

    return PermissionTransformer.expandPermissionCodes(
      filteredPermissions.flatMap((permission) =>
        PermissionTransformer.extractPermissionObjectCodes(permission)
      )
    );
  }

  private static expandPermissionCodes(codes: string[]): string[] {
    const expandedCodes = new Set<string>();

    codes.forEach((code) => {
      PermissionTransformer.addPermissionCodeVariants(expandedCodes, code);

      const aliases =
        PermissionTransformer.aliasMap.get(code) || new Set<string>();
      aliases.forEach((alias) => {
        PermissionTransformer.addPermissionCodeVariants(expandedCodes, alias);
      });
    });

    return Array.from(expandedCodes);
  }

  private static registerRouteAlias(
    route: PermissionRouteLike,
    parentPath = ''
  ) {
    const fullPath = PermissionTransformer.resolveRoutePath(
      parentPath,
      route.path
    );
    const permissionCodes = PermissionTransformer.normalizePermissionCodes(
      route.meta?.permissionCode
    );
    const pathCodes = PermissionTransformer.extractRoutePathCodes(fullPath);
    const routeName = typeof route.name === 'string' ? route.name : undefined;
    const routeCodes = routeName ? [routeName, routeName.toLowerCase()] : [];
    const codes = Array.from(
      new Set([...permissionCodes, ...pathCodes, ...routeCodes])
    );
    const aliases = Array.from(new Set([...permissionCodes, fullPath]));

    codes.forEach((code) => {
      PermissionTransformer.registerAlias(
        code,
        aliases.filter((alias) => alias !== code)
      );
    });

    route.children?.forEach((child) => {
      PermissionTransformer.registerRouteAlias(child, fullPath);
    });
  }

  private static resolveRoutePath(parentPath: string, routePath: string) {
    if (routePath.startsWith('/')) {
      return routePath;
    }
    return `${parentPath.replace(/\/$/, '')}/${routePath}`;
  }

  private static normalizePermissionCodes(permissionCode?: string | string[]) {
    if (!permissionCode) {
      return [];
    }
    return Array.isArray(permissionCode) ? permissionCode : [permissionCode];
  }

  private static extractRoutePathCodes(path: string) {
    const segments = path.split('/').filter(Boolean);
    return segments.map((segment) => segment.replace(/-/g, ''));
  }

  private static addPermissionCodeVariants(
    expandedCodes: Set<string>,
    code: string
  ) {
    expandedCodes.add(code);

    const slashCode = code.replace(/:/g, '/');
    expandedCodes.add(slashCode);

    const pathCode = slashCode.startsWith('/') ? slashCode : `/${slashCode}`;
    if (code.includes(':') || code.startsWith('/') || code === 'system') {
      expandedCodes.add(pathCode);
    }

    const colonCode = slashCode.replace(/\//g, ':').replace(/^:/, '');
    expandedCodes.add(colonCode);

    const segments = pathCode.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1];
    if (lastSegment) {
      expandedCodes.add(lastSegment.replace(/-/g, ''));
    }
  }

  static normalizePermissions(rawData: unknown): PermissionResponse[] {
    if (!rawData) {
      return [];
    }

    if (PermissionTransformer.isPermissionLikeArray(rawData)) {
      return rawData.flatMap((permission) =>
        PermissionTransformer.normalizePermissionTree(permission)
      );
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

    if (PermissionTransformer.isPermissionLikeObject(rawData)) {
      return PermissionTransformer.normalizePermissionTree(rawData);
    }

    return [];
  }

  private static isStringArray(data: unknown): data is string[] {
    return (
      Array.isArray(data) && data.every((item) => typeof item === 'string')
    );
  }

  private static isPermissionLikeArray(
    data: unknown
  ): data is PermissionLike[] {
    return (
      Array.isArray(data) &&
      data.every((item) => typeof item === 'object' && item !== null)
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

  private static isPermissionLikeObject(data: unknown): data is PermissionLike {
    return typeof data === 'object' && data !== null;
  }

  private static extractPermissionObjectCodes(permission: PermissionLike) {
    return [
      permission.object,
      permission.menu_path,
      permission.path,
      permission.code,
      permission.name,
    ].filter(
      (value): value is string => typeof value === 'string' && value.length > 0
    );
  }

  private static normalizePermissionTree(
    permission: PermissionLike
  ): PermissionResponse[] {
    const normalizedPermission =
      PermissionTransformer.normalizePermissionObject(permission);
    const children = Array.isArray(permission.children)
      ? permission.children.flatMap((child) =>
          PermissionTransformer.normalizePermissionTree(child)
        )
      : [];

    return normalizedPermission
      ? [normalizedPermission, ...children]
      : children;
  }

  private static normalizePermissionObject(
    permission: PermissionLike
  ): PermissionResponse | null {
    const object =
      PermissionTransformer.extractPermissionObjectCodes(permission)[0];
    if (!object) {
      return null;
    }

    return {
      id: permission.id || 0,
      role_name: permission.role_name || '',
      domain: permission.domain || 'default',
      object,
      action: permission.action || permission.type || 'access',
      type: permission.type || 'menu',
      description: permission.description,
    } as PermissionResponse;
  }
}
