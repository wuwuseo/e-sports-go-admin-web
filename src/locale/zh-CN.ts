import localeMessageBox from '@/components/message-box/locale/zh-CN';
import localeLogin from '@/views/login/locale/zh-CN';

import localeWorkplace from '@/views/dashboard/workplace/locale/zh-CN';
import localeSystemRole from '@/views/system/role/locale/zh-CN';
import localeSystemAttachment from '@/views/system/attachment/locale/zh-CN';
import localeSystemPermission from '@/views/system/permission/locale/zh-CN';
import localeOperationLog from '@/views/system/operation-log/locale/zh-CN';
import localeSystemCronJob from '@/views/system/cron-job/locale/zh-CN';
import localeDictData from '@/views/system/dict-data/locale/zh-CN';
import localeConfig from '@/views/system/config/locale/zh-CN';
import localeSystemPlugin from '@/views/system/plugin/locale/zh-CN';
import localeSystemUser from '@/views/system/user/locale/zh-CN';
import localeSystemAdmin from '@/views/system/admin/locale/zh-CN';
import localeMessage from '@/views/message/locale/zh-CN';

import localeSettings from './zh-CN/settings';

export default {
  'menu.dashboard': '仪表盘',
  'menu.system.admin': '管理员管理',
  'menu.server.dashboard': '仪表盘-服务端',
  'menu.server.workplace': '工作台-服务端',
  'menu.server.monitor': '实时监控-服务端',
  'menu.list': '列表页',
  'menu.result': '结果页',
  'menu.exception': '异常页',
  'menu.form': '表单页',
  'menu.profile': '详情页',
  'menu.visualization': '数据可视化',
  'menu.user': '个人中心',
  'menu.arcoWebsite': 'Arco Design',
  'menu.faq': '常见问题',
  'navbar.docs': '文档中心',
  'navbar.action.locale': '切换为中文',
  ...localeSettings,
  ...localeMessageBox,
  ...localeLogin,
  ...localeWorkplace,
  ...localeSystemRole,
  ...localeSystemAttachment,
  ...localeSystemPermission,
  ...localeOperationLog,
  ...localeSystemCronJob,
  ...localeDictData,
  ...localeConfig,
  ...localeSystemPlugin,
  ...localeSystemUser,
  ...localeSystemAdmin,
  ...localeMessage,
};
