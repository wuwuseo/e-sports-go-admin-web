import { useRouter } from 'vue-router';
import { Message } from '@arco-design/web-vue';

import { useUserStore } from '@/store';
import { isAdminLogin } from '@/utils/auth';

export default function useUser() {
  const router = useRouter();
  const userStore = useUserStore();
  const logout = async (logoutTo?: string) => {
    // S2-6: 管理员会话必须走管理员登出接口；混用普通用户接口会 401 并触发拦截器递归，导致登出失效
    if (isAdminLogin()) {
      await userStore.adminLogout();
    } else {
      await userStore.logout();
    }
    const currentRoute = router.currentRoute.value;
    Message.success('登出成功');
    // 登出后跳转到登录页，使用 fullPath 作为 redirect，确保登录后能正确跳转回来
    router.push({
      name: logoutTo && typeof logoutTo === 'string' ? logoutTo : 'login',
      query: {
        redirect: currentRoute.fullPath,
      },
    });
  };
  return {
    logout,
  };
}
