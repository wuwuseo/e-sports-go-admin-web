import localeMessageBox from '@/components/message-box/locale/en-US';
import localeLogin from '@/views/login/locale/en-US';

import localeWorkplace from '@/views/dashboard/workplace/locale/en-US';
import localeSystemRole from '@/views/system/role/locale/en-US';
import localeSystemAttachment from '@/views/system/attachment/locale/en-US';
import localeSystemPermission from '@/views/system/permission/locale/en-US';
import localeOperationLog from '@/views/system/operation-log/locale/en-US';
import localeSystemCronJob from '@/views/system/cron-job/locale/en-US';
import localeDictData from '@/views/system/dict-data/locale/en-US';
import localeConfig from '@/views/system/config/locale/en-US';
import localeSystemUser from '@/views/system/user/locale/en-US';

import localeSettings from './en-US/settings';

export default {
  'menu.dashboard': 'Dashboard',
  'menu.system': 'System',
  'menu.system.user': 'Users',
  'menu.system.thirdPartyUser': 'Third-party Users',
  'menu.system.role': 'Roles',
  'menu.system.permission': 'Permissions',
  'menu.system.attachment': 'Attachments',
  'menu.system.cronJob': 'Cron Jobs',
  'menu.system.operationLog': 'Operation Logs',
  'menu.system.dict': 'Dictionary',
  'menu.system.config': 'Config',
  'menu.server.dashboard': 'Dashboard-Server',
  'menu.server.workplace': 'Workplace-Server',
  'menu.server.monitor': 'Monitor-Server',
  'menu.list': 'List',
  'menu.result': 'Result',
  'menu.exception': 'Exception',
  'menu.form': 'Form',
  'menu.profile': 'Profile',
  'menu.visualization': 'Data Visualization',
  'menu.user': 'User Center',
  'menu.arcoWebsite': 'Arco Design',
  'menu.faq': 'FAQ',
  'navbar.docs': 'Docs',
  'navbar.action.locale': 'Switch to English',
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
  ...localeSystemUser,
};
