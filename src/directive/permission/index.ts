import { DirectiveBinding } from 'vue';
import { useUserStore } from '@/store';

// 权限指令类型
type PermissionMode = 'hide' | 'disable';

interface PermissionBindingValue {
  // 权限码或权限码数组
  permission: string | string[];
  // 验证模式：any - 满足任意一个即可，all - 必须满足所有
  mode?: 'any' | 'all';
  // 无权限时的处理方式：hide - 隐藏元素，disable - 禁用元素
  strategy?: PermissionMode;
}

/**
 * 检查用户是否有权限
 * @param permission 权限码或权限码数组
 * @param mode 验证模式
 */
function checkPermission(
  permission: string | string[],
  mode: 'any' | 'all' = 'any'
): boolean {
  const userStore = useUserStore();

  // admin 角色拥有所有权限
  if (userStore.role === 'admin') {
    return true;
  }

  const permissionArray = Array.isArray(permission) ? permission : [permission];

  if (mode === 'any') {
    return userStore.hasAnyPermission(permissionArray);
  }

  return userStore.hasAllPermissions(permissionArray);
}

/**
 * 处理权限逻辑
 */
function handlePermission(el: HTMLElement, binding: DirectiveBinding) {
  let permission: string | string[];
  let mode: 'any' | 'all' = 'any';
  let strategy: PermissionMode = 'hide';

  // 解析绑定值
  if (typeof binding.value === 'string' || Array.isArray(binding.value)) {
    permission = binding.value;
  } else if (typeof binding.value === 'object' && binding.value !== null) {
    const config = binding.value as PermissionBindingValue;
    permission = config.permission;
    if (config.mode) {
      mode = config.mode;
    }
    if (config.strategy) {
      strategy = config.strategy;
    }
  } else {
    // eslint-disable-next-line no-console
    console.warn('v-permission: 无效的权限配置');
    return;
  }

  // 检查修饰符，支持 v-permission.disable="'xxx'"
  if (binding.modifiers?.disable) {
    strategy = 'disable';
  }

  const hasPermission = checkPermission(permission, mode);

  if (!hasPermission) {
    if (strategy === 'hide') {
      // 隐藏元素：从 DOM 中移除
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      } else {
        el.style.display = 'none';
      }
    } else {
      // 禁用元素
      el.setAttribute('disabled', 'disabled');
      el.classList.add('is-disabled');
      el.style.pointerEvents = 'none';
      el.style.opacity = '0.6';

      // 处理按钮和输入框
      const formElements = el.querySelectorAll<
        | HTMLButtonElement
        | HTMLInputElement
        | HTMLSelectElement
        | HTMLTextAreaElement
      >('button, input, select, textarea');
      formElements.forEach((element) => {
        element.disabled = true;
      });
    }
  } else if (strategy === 'disable') {
    // 有权限时恢复元素状态（针对 update 钩子）
    el.removeAttribute('disabled');
    el.classList.remove('is-disabled');
    el.style.pointerEvents = '';
    el.style.opacity = '';

    const formElements = el.querySelectorAll<
      | HTMLButtonElement
      | HTMLInputElement
      | HTMLSelectElement
      | HTMLTextAreaElement
    >('button, input, select, textarea');
    formElements.forEach((element) => {
      element.disabled = false;
    });
  }
}

/**
 * 权限指令 v-permission
 *
 * 使用方式：
 * 1. 单个权限码：v-permission="'user:add'"
 * 2. 多个权限码（满足任意一个）：v-permission="['user:add', 'user:edit']"
 * 3. 配置对象：v-permission="{ permission: 'user:add', strategy: 'disable' }"
 * 4. 禁用模式（禁用而非隐藏）：v-permission.disable="'user:add'"
 */
export default {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    handlePermission(el, binding);
  },

  updated(el: HTMLElement, binding: DirectiveBinding) {
    handlePermission(el, binding);
  },
};
