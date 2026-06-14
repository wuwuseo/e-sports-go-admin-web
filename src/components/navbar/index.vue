<template>
  <div class="navbar">
    <div class="left-side">
      <a-space>
        <img
          alt="logo"
          src="//p3-armor.byteimg.com/tos-cn-i-49unhts6dw/dfdba5317c0c20ce20e64fac803d52bc.svg~tplv-49unhts6dw-image.image"
        />
        <a-typography-title
          :style="{ margin: 0, fontSize: '18px' }"
          :heading="5"
        >
          Arco Pro
        </a-typography-title>
        <icon-menu-fold
          v-if="!topMenu && appStore.device === 'mobile'"
          style="font-size: 22px; cursor: pointer"
          @click="toggleDrawerMenu"
        />
      </a-space>
    </div>
    <div class="center-side">
      <Menu v-if="topMenu" />
    </div>
    <ul class="right-side">
      <li>
        <a-tooltip :content="$t('settings.search')">
          <a-button class="nav-btn" type="outline" :shape="'circle'">
            <template #icon>
              <icon-search />
            </template>
          </a-button>
        </a-tooltip>
      </li>
      <li>
        <a-tooltip :content="$t('settings.language')">
          <a-button
            class="nav-btn"
            type="outline"
            :shape="'circle'"
            @click="setDropDownVisible"
          >
            <template #icon>
              <icon-language />
            </template>
          </a-button>
        </a-tooltip>
        <a-dropdown trigger="click" @select="changeLocale as any">
          <div ref="triggerBtn" class="trigger-btn"></div>
          <template #content>
            <a-doption
              v-for="item in locales"
              :key="item.value"
              :value="item.value"
            >
              <template #icon>
                <icon-check v-show="item.value === currentLocale" />
              </template>
              {{ item.label }}
            </a-doption>
          </template>
        </a-dropdown>
      </li>
      <li>
        <a-tooltip
          :content="
            theme === 'light'
              ? $t('settings.navbar.theme.toDark')
              : $t('settings.navbar.theme.toLight')
          "
        >
          <a-button
            class="nav-btn"
            type="outline"
            :shape="'circle'"
            @click="handleToggleTheme"
          >
            <template #icon>
              <icon-moon-fill v-if="theme === 'dark'" />
              <icon-sun-fill v-else />
            </template>
          </a-button>
        </a-tooltip>
      </li>
      <li>
        <a-tooltip :content="$t('settings.navbar.alerts')">
          <div class="message-box-trigger">
            <a-badge :count="unreadTotal" :max-count="99" :dot="false">
              <a-button
                class="nav-btn"
                type="outline"
                :shape="'circle'"
                @click="setPopoverVisible"
              >
                <icon-notification />
              </a-button>
            </a-badge>
          </div>
        </a-tooltip>
        <a-popover
          trigger="click"
          :arrow-style="{ display: 'none' }"
          :content-style="{ padding: 0, minWidth: '400px' }"
          content-class="message-popover"
        >
          <div ref="refBtn" class="ref-btn"></div>
          <template #content>
            <message-box />
          </template>
        </a-popover>
      </li>
      <li>
        <a-tooltip
          :content="
            isFullscreen
              ? $t('settings.navbar.screen.toExit')
              : $t('settings.navbar.screen.toFull')
          "
        >
          <a-button
            class="nav-btn"
            type="outline"
            :shape="'circle'"
            @click="toggleFullScreen"
          >
            <template #icon>
              <icon-fullscreen-exit v-if="isFullscreen" />
              <icon-fullscreen v-else />
            </template>
          </a-button>
        </a-tooltip>
      </li>
      <li>
        <a-dropdown trigger="click">
          <a-avatar
            :size="32"
            :style="{ marginRight: '8px', cursor: 'pointer' }"
          >
            <img v-if="avatar" alt="avatar" :src="avatar" />
            <icon-user v-else />
          </a-avatar>
          <template #content>
            <a-doption @click="openProfile">
              <a-space>
                <icon-user />
                <span>{{ $t('navbar.profile.title') }}</span>
              </a-space>
            </a-doption>
            <a-doption @click="openChangePassword">
              <a-space>
                <icon-lock />
                <span>{{ $t('navbar.changePassword.title') }}</span>
              </a-space>
            </a-doption>
            <a-doption @click="goMessagePreference">
              <a-space>
                <icon-settings />
                <span>{{ $t('menu.message.preference') }}</span>
              </a-space>
            </a-doption>
            <a-doption>
              <a-space @click="handleLogout">
                <icon-export />
                <span>
                  {{ $t('messageBox.logout') }}
                </span>
              </a-space>
            </a-doption>
          </template>
        </a-dropdown>
      </li>
    </ul>
    <ProfileModal ref="profileModalRef" v-model:visible="profileVisible" />
    <ChangePasswordModal v-model:visible="passwordVisible" />
  </div>
</template>

<script lang="ts" setup>
  import { computed, ref, inject, watch } from 'vue';
  import { useDark, useToggle, useFullscreen } from '@vueuse/core';
  import { useRouter } from 'vue-router';
  import { useAppStore, useUserStore, useMessageStore } from '@/store';
  import { LOCALE_OPTIONS } from '@/locale';
  import useLocale from '@/hooks/locale';
  import useUser from '@/hooks/user';
  import useSseMessage from '@/hooks/sse-message';
  import { resolveAttachmentAccessUrl } from '@/services/attachment-access.service';
  import Menu from '@/components/menu/index.vue';
  import MessageBox from '../message-box/index.vue';
  import ProfileModal from './components/ProfileModal.vue';
  import ChangePasswordModal from './components/ChangePasswordModal.vue';

  const appStore = useAppStore();
  const userStore = useUserStore();
  const messageStore = useMessageStore();
  const { logout } = useUser();
  const router = useRouter();

  // 跳转到消息偏好设置页
  const goMessagePreference = () => {
    router.push({ name: 'MessagePreference' });
  };

  // 个人资料弹窗
  const profileVisible = ref(false);
  const profileModalRef = ref<InstanceType<typeof ProfileModal>>();
  const openProfile = () => {
    profileModalRef.value?.initFormData();
    profileVisible.value = true;
  };

  // 修改密码弹窗
  const passwordVisible = ref(false);
  const openChangePassword = () => {
    passwordVisible.value = true;
  };

  // 启动 SSE 站内消息推送（仅登录用户）
  useSseMessage();

  // 顶部铃铛未读数
  const unreadTotal = computed(() => messageStore.unreadTotal);
  const { changeLocale, currentLocale } = useLocale();
  const { isFullscreen, toggle: toggleFullScreen } = useFullscreen();
  const locales = [...LOCALE_OPTIONS];
  const avatar = ref('');
  let avatarRequestId = 0;

  const resolveAvatar = async (value?: string) => {
    avatarRequestId += 1;
    const requestId = avatarRequestId;
    if (!value) {
      avatar.value = '';
      return;
    }

    if (value.startsWith('http')) {
      avatar.value = value;
      return;
    }

    if (/^\d+$/.test(value)) {
      try {
        const url = await resolveAttachmentAccessUrl(Number(value));
        if (requestId === avatarRequestId) {
          avatar.value = url;
        }
      } catch {
        if (requestId === avatarRequestId) {
          avatar.value = '';
        }
      }
      return;
    }

    avatar.value = '';
  };

  watch(
    () => userStore.avatar,
    (value) => {
      resolveAvatar(value);
    },
    { immediate: true }
  );
  const theme = computed(() => {
    return appStore.theme;
  });
  const topMenu = computed(() => appStore.topMenu && appStore.menu);
  const isDark = useDark({
    selector: 'body',
    attribute: 'arco-theme',
    valueDark: 'dark',
    valueLight: 'light',
    storageKey: 'arco-theme',
    onChanged(dark: boolean) {
      // overridden default behavior
      appStore.toggleTheme(dark);
    },
  });
  const toggleTheme = useToggle(isDark);
  const handleToggleTheme = () => {
    toggleTheme();
  };
  const refBtn = ref();
  const triggerBtn = ref();
  const setPopoverVisible = () => {
    const event = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true,
    });
    refBtn.value.dispatchEvent(event);
  };
  const handleLogout = () => {
    logout();
  };
  const setDropDownVisible = () => {
    const event = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true,
    });
    triggerBtn.value.dispatchEvent(event);
  };
  const toggleDrawerMenu = inject('toggleDrawerMenu') as () => void;
</script>

<style scoped lang="less">
  .navbar {
    display: flex;
    justify-content: space-between;
    height: 100%;
    background-color: var(--color-bg-2);
    border-bottom: 1px solid var(--color-border);
  }

  .left-side {
    display: flex;
    align-items: center;
    padding-left: 20px;
  }

  .center-side {
    flex: 1;
  }

  .right-side {
    display: flex;
    padding-right: 20px;
    list-style: none;
    :deep(.locale-select) {
      border-radius: 20px;
    }
    li {
      display: flex;
      align-items: center;
      padding: 0 10px;
    }

    a {
      color: var(--color-text-1);
      text-decoration: none;
    }
    .nav-btn {
      border-color: rgb(var(--gray-2));
      color: rgb(var(--gray-8));
      font-size: 16px;
    }
    .trigger-btn,
    .ref-btn {
      position: absolute;
      bottom: 14px;
    }
    .trigger-btn {
      margin-left: 14px;
    }
  }
</style>

<style lang="less">
  .message-popover {
    .arco-popover-content {
      margin-top: 0;
    }
  }
</style>
