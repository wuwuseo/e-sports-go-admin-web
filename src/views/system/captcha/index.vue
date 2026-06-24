<template>
  <div class="captcha-config">
    <a-card :bordered="false">
      <template #title>{{ $t('system.captcha.title') }}</template>
      <a-alert type="info" class="captcha-desc">
        {{ $t('system.captcha.description') }}
      </a-alert>

      <a-spin :loading="loading" style="display: block">
        <a-empty
          v-if="!loading && !state.providerNames.length"
          :description="$t('system.captcha.provider.empty')"
        />

        <template v-else-if="selectedDraft">
          <a-card
            class="captcha-section"
            :bordered="true"
            :title="$t('system.captcha.provider.title')"
          >
            <template #extra>
              <span class="captcha-section-subtitle">
                {{ selectedDraft.provider }}
              </span>
            </template>

            <a-form :model="selectedDraft.config" layout="vertical">
              <a-form-item :label="$t('system.captcha.provider.select')">
                <a-select v-model="state.selectedProvider" :disabled="!canEdit">
                  <a-option
                    v-for="provider in state.providerNames"
                    :key="provider"
                    :value="provider"
                  >
                    {{ providerName(provider) }}
                  </a-option>
                </a-select>
                <a-space class="captcha-provider-status" wrap>
                  <a-tag color="green">
                    {{ $t('system.captcha.provider.active') }}:
                    {{ providerName(state.activeProvider) || '-' }}
                  </a-tag>
                  <a-tag
                    v-if="state.selectedProvider !== state.activeProvider"
                    color="orange"
                  >
                    {{ $t('system.captcha.provider.pending') }}:
                    {{ providerName(state.selectedProvider) }}
                  </a-tag>
                </a-space>
              </a-form-item>

              <a-form-item
                :label="
                  localizeCaptchaText(
                    selectedDraft.descriptor.secret.label,
                    locale
                  )
                "
                :help="secretHelp"
              >
                <a-input-password
                  v-model="selectedDraft.secret"
                  :placeholder="$t('system.captcha.provider.secretPlaceholder')"
                  :disabled="!canEdit || selectedDraft.clearSecret"
                  allow-clear
                />
                <a-checkbox
                  v-model="selectedDraft.clearSecret"
                  :disabled="!canEdit || clearSecretLocked"
                  class="captcha-clear-secret"
                >
                  {{ $t('system.captcha.provider.clearSecret') }}
                </a-checkbox>
                <div v-if="clearSecretLocked" class="captcha-clear-secret-tip">
                  {{ $t('system.captcha.provider.clearSecretLocked') }}
                </div>
              </a-form-item>

              <a-form-item
                v-for="field in selectedDraft.descriptor.fields"
                :key="field.key"
                :label="localizeCaptchaText(field.label, locale)"
                :help="localizeCaptchaText(field.help, locale)"
              >
                <a-select
                  v-if="field.type === 'multi_select'"
                  v-model="selectedDraft.config[field.key]"
                  multiple
                  :disabled="!canEdit"
                >
                  <a-option
                    v-for="option in field.options || []"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ localizeCaptchaText(option.label, locale) }}
                  </a-option>
                </a-select>
                <a-input-number
                  v-else-if="field.type === 'number'"
                  v-model="selectedDraft.config[field.key]"
                  :min="field.min"
                  :max="field.max"
                  :step="field.step"
                  :disabled="!canEdit"
                />
                <a-textarea
                  v-else-if="field.type === 'textarea'"
                  v-model="selectedDraft.config[field.key]"
                  :max-length="field.max_length"
                  :disabled="!canEdit"
                  auto-size
                />
                <a-input
                  v-else
                  v-model="selectedDraft.config[field.key]"
                  :max-length="field.max_length"
                  :disabled="!canEdit"
                  allow-clear
                />
              </a-form-item>

              <a-space>
                <a-button
                  type="outline"
                  :loading="validating"
                  :disabled="!canEdit"
                  @click="handleValidate"
                >
                  {{ $t('system.captcha.actions.validate') }}
                </a-button>
                <a-button
                  type="primary"
                  :loading="savingProvider"
                  :disabled="!canEdit"
                  @click="handleSaveProvider"
                >
                  {{ $t('system.captcha.actions.saveProvider') }}
                </a-button>
              </a-space>
            </a-form>
          </a-card>

          <a-card
            class="captcha-section"
            :bordered="true"
            :title="$t('system.captcha.scene.title')"
          >
            <template #extra>
              <span class="captcha-section-subtitle">admin_login</span>
            </template>
            <a-form :model="state" layout="vertical">
              <a-form-item :label="$t('system.captcha.scene.enabled')">
                <a-switch v-model="state.sceneEnabled" :disabled="!canEdit" />
              </a-form-item>
              <a-form-item :label="$t('system.captcha.scene.provider')">
                <a-tag color="arcoblue">
                  {{ providerName(state.selectedProvider) }}
                  ({{ state.selectedProvider }})
                </a-tag>
              </a-form-item>
              <a-form-item :label="$t('system.captcha.scene.challengeTtl')">
                <a-input-number
                  v-model="state.challengeTtl"
                  :min="1"
                  :disabled="!canEdit"
                />
              </a-form-item>
              <a-form-item :label="$t('system.captcha.scene.tokenTtl')">
                <a-input-number
                  v-model="state.proofTtl"
                  :min="1"
                  :disabled="!canEdit"
                />
              </a-form-item>
              <a-button
                type="primary"
                :loading="savingScene"
                :disabled="!canEdit"
                @click="handleSaveScene"
              >
                {{ $t('system.captcha.actions.saveScene') }}
              </a-button>
            </a-form>
          </a-card>
        </template>
      </a-spin>
    </a-card>
  </div>
</template>

<script lang="ts" setup>
  import { computed, onMounted, reactive, ref } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import { useI18n } from 'vue-i18n';
  import {
    getCaptchaSettings,
    updateCaptchaProvider,
    updateCaptchaScene,
    validateCaptchaProvider,
  } from '@/api/captcha';
  import usePermission from '@/hooks/permission';
  import type { CaptchaConfigState } from './validate';
  import {
    buildCaptchaProviderRequest,
    buildCaptchaSceneRequest,
    isProviderDraftDirty,
    localizeCaptchaText,
    readCaptchaSettings,
    validateCaptchaProviderDraft,
  } from './validate';

  const { t, locale } = useI18n();
  const { hasButtonPermission } = usePermission();
  const canEdit = computed(() => hasButtonPermission('captcha:edit'));
  const loading = ref(false);
  const validating = ref(false);
  const savingProvider = ref(false);
  const savingScene = ref(false);

  const state = reactive<CaptchaConfigState>({
    providerNames: [],
    providers: {},
    selectedProvider: '',
    activeProvider: '',
    sceneEnabled: false,
    persistedSceneEnabled: false,
    challengeTtl: 120,
    proofTtl: 90,
  });

  const selectedDraft = computed(() => state.providers[state.selectedProvider]);
  const clearSecretLocked = computed(
    () =>
      state.persistedSceneEnabled &&
      state.activeProvider === state.selectedProvider
  );
  const secretHelp = computed(() => {
    if (!selectedDraft.value) return '';
    const status = selectedDraft.value.secretConfigured
      ? t('system.captcha.provider.secretConfigured')
      : t('system.captcha.provider.secretNotConfigured');
    const help = localizeCaptchaText(
      selectedDraft.value.descriptor.secret.help,
      locale.value
    );
    return help ? `${status} · ${help}` : status;
  });

  function providerName(provider: string) {
    const descriptor = state.providers[provider]?.descriptor;
    return (
      localizeCaptchaText(descriptor?.display_name, locale.value) || provider
    );
  }

  function validationMessages() {
    return {
      required: t('system.captcha.error.required'),
      minLength: t('system.captcha.error.minLength'),
      maxLength: t('system.captcha.error.maxLength'),
      numberRange: t('system.captcha.error.numberRange'),
      secretRequired: t('system.captcha.error.secretRequired'),
      secretMinLength: t('system.captcha.error.secretMinLength'),
      clearSecretLocked: t('system.captcha.error.clearSecretLocked'),
    };
  }

  function validateSelectedProvider() {
    if (!selectedDraft.value) return t('system.captcha.provider.empty');
    return validateCaptchaProviderDraft(
      selectedDraft.value,
      clearSecretLocked.value,
      validationMessages()
    )?.message;
  }

  async function loadConfig(preferredProvider = state.selectedProvider) {
    loading.value = true;
    try {
      const res = await getCaptchaSettings();
      const loaded = readCaptchaSettings(res.data.data);
      if (preferredProvider && loaded.providers[preferredProvider]) {
        loaded.selectedProvider = preferredProvider;
      }
      Object.assign(state, loaded);
    } catch (e) {
      Message.error((e as Error).message || t('system.captcha.loadError'));
    } finally {
      loading.value = false;
    }
  }

  async function handleValidate() {
    const error = validateSelectedProvider();
    if (error || !selectedDraft.value) {
      Message.error(error || t('system.captcha.provider.empty'));
      return;
    }
    validating.value = true;
    try {
      await validateCaptchaProvider(
        state.selectedProvider,
        buildCaptchaProviderRequest(selectedDraft.value)
      );
      Message.success(t('system.captcha.validate.success'));
    } catch (e) {
      Message.error(
        (e as Error).message || t('system.captcha.validate.failed')
      );
    } finally {
      validating.value = false;
    }
  }

  async function handleSaveProvider() {
    const error = validateSelectedProvider();
    if (error || !selectedDraft.value) {
      Message.error(error || t('system.captcha.provider.empty'));
      return;
    }
    savingProvider.value = true;
    try {
      await updateCaptchaProvider(
        state.selectedProvider,
        buildCaptchaProviderRequest(selectedDraft.value)
      );
      Message.success(t('system.captcha.save.providerSuccess'));
      await loadConfig(state.selectedProvider);
    } catch (e) {
      Message.error(
        (e as Error).message || t('system.captcha.save.providerFailed')
      );
    } finally {
      savingProvider.value = false;
    }
  }

  async function handleSaveScene() {
    if (state.challengeTtl < 1 || state.proofTtl < 1) {
      Message.error(t('system.captcha.error.ttlPositive'));
      return;
    }
    if (
      state.sceneEnabled &&
      selectedDraft.value &&
      isProviderDraftDirty(selectedDraft.value)
    ) {
      Message.error(t('system.captcha.error.saveProviderFirst'));
      return;
    }
    if (
      state.sceneEnabled &&
      (!selectedDraft.value || !selectedDraft.value.secretConfigured)
    ) {
      Message.error(t('system.captcha.error.secretRequired'));
      return;
    }
    savingScene.value = true;
    try {
      await updateCaptchaScene('admin_login', buildCaptchaSceneRequest(state));
      Message.success(t('system.captcha.save.sceneSuccess'));
      await loadConfig(state.selectedProvider);
    } catch (e) {
      Message.error(
        (e as Error).message || t('system.captcha.save.sceneFailed')
      );
    } finally {
      savingScene.value = false;
    }
  }

  onMounted(() => loadConfig());
</script>

<style lang="less" scoped>
  .captcha-config {
    padding: 16px;
  }

  .captcha-desc,
  .captcha-section {
    margin-bottom: 16px;
  }

  .captcha-section:last-child {
    margin-bottom: 0;
  }

  .captcha-section-subtitle,
  .captcha-clear-secret-tip {
    color: var(--color-text-3);
    font-size: 12px;
  }

  .captcha-provider-status,
  .captcha-clear-secret {
    margin-top: 8px;
  }

  .captcha-clear-secret-tip {
    margin-top: 4px;
  }
</style>
