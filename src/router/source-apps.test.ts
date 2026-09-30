import { beforeEach, describe, expect, it } from 'vitest';
import { defineComponent } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import type { SysPermissionTreeNode } from '@/types/api';
import {
  buildSourceAppRoutes,
  clearSourceAppRoutes,
  syncSourceAppRoutes,
} from './source-apps';

const stubComponent = defineComponent({});
const page = async () => ({ default: stubComponent });
const pages = {
  '../apps/demo/views/index.vue': page,
  '../apps/demo/views/items/index.vue': page,
};

function menu(
  overrides: Partial<SysPermissionTreeNode> = {}
): SysPermissionTreeNode {
  return {
    id: 1,
    name: '示例管理',
    code: 'demo:menu',
    type: 'menu',
    domain: 'default',
    menu_path: '/demo',
    component: 'demo/index',
    status: 1,
    children: [],
    ...overrides,
  };
}

beforeEach(clearSourceAppRoutes);

describe('源码功能集路由', () => {
  it('按后端菜单元数据注册本地页面，忽略按钮节点', () => {
    const tree = [
      menu({
        icon: '<img onerror=alert(1)>',
        children: [
          menu({
            id: 2,
            code: 'demo:items:add',
            type: 'button',
            menu_path: '',
            component: '',
          }),
        ],
      }),
    ];

    const { routes, menus } = buildSourceAppRoutes(tree, pages);
    expect(routes).toHaveLength(1);
    expect(routes[0].path).toBe('/demo');
    expect(routes[0].children?.[0].path).toBe('');
    expect(routes[0].children?.[0].name).toBe('SourceApp:demo:menu');
    expect(routes[0].children?.[0].meta?.permissionCode).toBe('/demo');
    expect(menus).toHaveLength(1);
    expect(menus[0].children).toEqual([]);
    expect(menus[0].meta?.icon).toBeUndefined();
  });

  it('保留菜单层级并将子页面映射到功能集内路径', () => {
    const tree = [
      menu({
        component: '',
        children: [
          menu({
            id: 2,
            parent_id: 1,
            code: 'demo:items',
            menu_path: '/demo/items',
            component: 'demo/items/index',
          }),
        ],
      }),
    ];

    const { routes, menus } = buildSourceAppRoutes(tree, pages);
    expect(routes[0].children?.[0].path).toBe('items');
    expect(menus[0].children?.[0].path).toBe('/demo/items');
  });

  it('拒绝越界、缺失和停用的页面', () => {
    const tree = [
      menu({ component: 'other/index' }),
      menu({ id: 2, menu_path: '/demo/missing', component: 'demo/missing' }),
      menu({ id: 3, menu_path: '/system/demo' }),
      menu({ id: 4, menu_path: '/demo/off', status: 0 }),
    ];

    expect(buildSourceAppRoutes(tree, pages)).toEqual({
      routes: [],
      menus: [],
    });
  });

  it('注册、复用并清理运行时路由', () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: '/:pathMatch(.*)*',
          name: 'notFound',
          component: stubComponent,
        },
      ],
    });
    const tree = [menu()];

    expect(router.resolve('/demo').name).toBe('notFound');
    expect(syncSourceAppRoutes(router, tree).changed).toBe(true);
    expect(router.resolve('/demo').name).toBe('SourceApp:demo:menu');
    expect(syncSourceAppRoutes(router, tree).changed).toBe(false);
    expect(syncSourceAppRoutes(router, []).menus).toEqual([]);
    expect(router.resolve('/demo').name).toBe('notFound');
  });

  it('已有静态路径时不覆盖路由或展示功能集菜单', () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/demo', name: 'existing', component: stubComponent }],
    });

    expect(syncSourceAppRoutes(router, [menu()]).menus).toEqual([]);
    expect(router.resolve('/demo').name).toBe('existing');
  });
});
