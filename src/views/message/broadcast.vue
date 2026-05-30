<template>
  <div class="container">
    <a-card class="general-card" :title="$t('message.broadcast.title')">
      <a-form
        ref="formRef"
        :model="form"
        :rules="rules"
        :style="{ width: '720px', margin: '0 auto' }"
        layout="vertical"
      >
        <!-- 消息类型 -->
        <a-form-item
          field="type"
          :label="$t('message.broadcast.type')"
          required
        >
          <a-radio-group v-model="form.type">
            <a-radio value="system">
              {{ $t('message.center.tab.system') }}
            </a-radio>
            <a-radio value="business">
              {{ $t('message.center.tab.business') }}
            </a-radio>
            <a-radio value="task">
              {{ $t('message.center.tab.task') }}
            </a-radio>
          </a-radio-group>
        </a-form-item>

        <!-- 消息级别 -->
        <a-form-item
          field="level"
          :label="$t('message.broadcast.level')"
          required
        >
          <a-radio-group v-model="form.level">
            <a-radio value="info">{{
              $t('message.center.level.info')
            }}</a-radio>
            <a-radio value="warning">{{
              $t('message.center.level.warning')
            }}</a-radio>
            <a-radio value="error">{{
              $t('message.center.level.error')
            }}</a-radio>
          </a-radio-group>
        </a-form-item>

        <!-- 标题 -->
        <a-form-item
          field="title"
          :label="$t('message.broadcast.titleField')"
          required
        >
          <a-input
            v-model="form.title"
            :max-length="200"
            show-word-limit
            :placeholder="$t('message.broadcast.titleField.placeholder')"
          />
        </a-form-item>

        <!-- 纯文本内容 -->
        <a-form-item
          field="content"
          :label="$t('message.broadcast.content')"
          required
        >
          <a-textarea
            v-model="form.content"
            :placeholder="$t('message.broadcast.content.placeholder')"
            :auto-size="{ minRows: 3, maxRows: 8 }"
          />
        </a-form-item>

        <!-- 富文本（可选） -->
        <a-form-item
          field="content_html"
          :label="$t('message.broadcast.contentHtml')"
        >
          <a-textarea
            v-model="form.content_html"
            :placeholder="$t('message.broadcast.contentHtml.placeholder')"
            :auto-size="{ minRows: 3, maxRows: 10 }"
          />
        </a-form-item>

        <!-- 扩展字段 extra（JSON） -->
        <a-form-item field="extraText" :label="$t('message.broadcast.extra')">
          <a-textarea
            v-model="extraText"
            :placeholder="$t('message.broadcast.extra.placeholder')"
            :auto-size="{ minRows: 2, maxRows: 6 }"
          />
          <template #extra>
            {{ $t('message.broadcast.extra.tip') }}
          </template>
        </a-form-item>

        <a-divider />

        <!-- 推送目标 -->
        <a-form-item
          field="target.scope"
          :label="$t('message.broadcast.target')"
          required
        >
          <a-radio-group v-model="form.target.scope">
            <a-radio value="all">
              {{ $t('message.broadcast.target.all') }}
            </a-radio>
            <a-radio value="users">
              {{ $t('message.broadcast.target.users') }}
            </a-radio>
            <a-radio value="roles">
              {{ $t('message.broadcast.target.roles') }}
            </a-radio>
          </a-radio-group>
        </a-form-item>

        <!-- 指定用户 -->
        <a-form-item
          v-if="form.target.scope === 'users'"
          field="target.user_uids"
          :label="$t('message.broadcast.userUids')"
          required
        >
          <a-input-tag
            v-model="form.target.user_uids"
            :placeholder="$t('message.broadcast.userUids.placeholder')"
            allow-clear
          />
          <template #extra>
            {{ $t('message.broadcast.userUids.tip') }}
          </template>
        </a-form-item>

        <!-- 指定角色 -->
        <a-form-item
          v-if="form.target.scope === 'roles'"
          field="target.role_codes"
          :label="$t('message.broadcast.roleCodes')"
          required
        >
          <a-input-tag
            v-model="form.target.role_codes"
            :placeholder="$t('message.broadcast.roleCodes.placeholder')"
            allow-clear
          />
          <template #extra>
            {{ $t('message.broadcast.roleCodes.tip') }}
          </template>
        </a-form-item>

        <a-divider />

        <a-form-item>
          <a-space>
            <a-button
              type="primary"
              :loading="submitting"
              @click="handleSubmit"
            >
              <template #icon><icon-send /></template>
              {{ $t('message.broadcast.submit') }}
            </a-button>
            <a-button @click="handleReset">
              {{ $t('message.broadcast.reset') }}
            </a-button>
            <a-button @click="handlePreview">
              {{ $t('message.broadcast.preview') }}
            </a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-card>

    <!-- 预览弹窗 -->
    <a-modal
      v-model:visible="previewVisible"
      :title="$t('message.broadcast.preview')"
      :ok-text="$t('message.broadcast.submit')"
      :cancel-text="$t('message.broadcast.close')"
      :on-before-ok="handleConfirmSubmit"
    >
      <a-descriptions :column="1" :data="previewData" bordered />
      <div class="preview-section">
        <div class="preview-label">{{ $t('message.broadcast.content') }}</div>
        <div class="preview-text">{{ form.content }}</div>
      </div>
      <div v-if="form.content_html" class="preview-section">
        <div class="preview-label">
          {{ $t('message.broadcast.contentHtml') }}
        </div>
        <!-- eslint-disable vue/no-v-html -->
        <div class="preview-html" v-html="form.content_html"></div>
        <!-- eslint-enable vue/no-v-html -->
      </div>
    </a-modal>
  </div>
</template>

<script lang="ts" setup>
  import { computed, reactive, ref } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { Message } from '@arco-design/web-vue';
  import {
    broadcastMessage,
    BroadcastReq,
    MessageBizType,
    MessageLevel,
    BroadcastScope,
  } from '@/api/message';

  const { t } = useI18n();

  // 表单
  const form = reactive<{
    type: MessageBizType;
    level: MessageLevel;
    title: string;
    content: string;
    content_html: string;
    target: {
      scope: BroadcastScope;
      user_uids: string[];
      role_codes: string[];
    };
  }>({
    type: 'system',
    level: 'info',
    title: '',
    content: '',
    content_html: '',
    target: {
      scope: 'all',
      user_uids: [],
      role_codes: [],
    },
  });

  // 扩展字段（用户编辑 JSON 字符串）
  const extraText = ref('');

  // 校验规则
  const rules = {
    'type': [{ required: true, message: t('message.broadcast.required.type') }],
    'level': [
      { required: true, message: t('message.broadcast.required.level') },
    ],
    'title': [
      { required: true, message: t('message.broadcast.required.title') },
      { maxLength: 200, message: t('message.broadcast.required.titleMax') },
    ],
    'content': [
      { required: true, message: t('message.broadcast.required.content') },
    ],
    'target.scope': [
      { required: true, message: t('message.broadcast.required.scope') },
    ],
  };

  const formRef = ref();
  const submitting = ref(false);
  const previewVisible = ref(false);

  // 预览展示数据
  const previewData = computed(() => {
    const typeLabelMap: Record<MessageBizType, string> = {
      system: t('message.center.tab.system'),
      business: t('message.center.tab.business'),
      task: t('message.center.tab.task'),
    };
    const levelLabelMap: Record<MessageLevel, string> = {
      info: t('message.center.level.info'),
      warning: t('message.center.level.warning'),
      error: t('message.center.level.error'),
    };
    const scopeLabelMap: Record<BroadcastScope, string> = {
      all: t('message.broadcast.target.all'),
      users: t('message.broadcast.target.users'),
      roles: t('message.broadcast.target.roles'),
    };
    let targetDetail = '';
    if (form.target.scope === 'users') {
      targetDetail = form.target.user_uids.join(', ') || '-';
    } else if (form.target.scope === 'roles') {
      targetDetail = form.target.role_codes.join(', ') || '-';
    } else {
      targetDetail = t('message.broadcast.target.allTip');
    }
    return [
      { label: t('message.broadcast.type'), value: typeLabelMap[form.type] },
      { label: t('message.broadcast.level'), value: levelLabelMap[form.level] },
      { label: t('message.broadcast.titleField'), value: form.title },
      {
        label: t('message.broadcast.target'),
        value: scopeLabelMap[form.target.scope],
      },
      { label: t('message.broadcast.target.detail'), value: targetDetail },
    ];
  });

  // 解析 extra JSON
  const parseExtra = (): { ok: boolean; value?: Record<string, unknown> } => {
    const text = extraText.value.trim();
    if (!text) return { ok: true, value: undefined };
    try {
      const obj = JSON.parse(text);
      if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
        return { ok: false };
      }
      return { ok: true, value: obj as Record<string, unknown> };
    } catch {
      return { ok: false };
    }
  };

  // 业务校验：target 内容
  const validateTarget = (): boolean => {
    if (form.target.scope === 'users' && !form.target.user_uids.length) {
      Message.warning(t('message.broadcast.required.userUids'));
      return false;
    }
    if (form.target.scope === 'roles' && !form.target.role_codes.length) {
      Message.warning(t('message.broadcast.required.roleCodes'));
      return false;
    }
    return true;
  };

  // 组装请求体
  const buildPayload = (): BroadcastReq | null => {
    const extraResult = parseExtra();
    if (!extraResult.ok) {
      Message.warning(t('message.broadcast.extra.invalid'));
      return null;
    }
    const payload: BroadcastReq = {
      type: form.type,
      level: form.level,
      title: form.title.trim(),
      content: form.content.trim(),
      target: {
        scope: form.target.scope,
      },
    };
    if (form.content_html.trim()) {
      payload.content_html = form.content_html;
    }
    if (extraResult.value) {
      payload.extra = extraResult.value;
    }
    if (form.target.scope === 'users') {
      payload.target.user_uids = [...form.target.user_uids];
    } else if (form.target.scope === 'roles') {
      payload.target.role_codes = [...form.target.role_codes];
    }
    return payload;
  };

  // 预览
  const handlePreview = async () => {
    const valid = await formRef.value?.validate();
    if (valid) return;
    if (!validateTarget()) return;
    previewVisible.value = true;
  };

  // 真正提交
  const doSubmit = async (): Promise<boolean> => {
    const payload = buildPayload();
    if (!payload) return false;
    submitting.value = true;
    try {
      const resp = await broadcastMessage(payload);
      const data = (
        resp as unknown as { data?: { data?: { delivered?: number } } }
      )?.data?.data;
      const delivered = data?.delivered ?? 0;
      Message.success(
        t('message.broadcast.submitSuccess', { count: delivered })
      );
      previewVisible.value = false;
      return true;
    } catch {
      return false;
    } finally {
      submitting.value = false;
    }
  };

  // 弹窗中点击「发送」时执行
  const handleConfirmSubmit = async () => {
    return doSubmit();
  };

  // 直接点击「发送」按钮
  const handleSubmit = async () => {
    const valid = await formRef.value?.validate();
    if (valid) return;
    if (!validateTarget()) return;
    await doSubmit();
  };

  // 重置
  const handleReset = () => {
    form.type = 'system';
    form.level = 'info';
    form.title = '';
    form.content = '';
    form.content_html = '';
    form.target.scope = 'all';
    form.target.user_uids = [];
    form.target.role_codes = [];
    extraText.value = '';
    formRef.value?.clearValidate();
  };
</script>

<style scoped lang="less">
  .container {
    padding: 16px 20px;
  }

  .preview-section {
    margin-top: 16px;

    .preview-label {
      margin-bottom: 8px;
      color: rgb(var(--gray-8));
      font-weight: 500;
    }

    .preview-text,
    .preview-html {
      padding: 12px;
      background: var(--color-fill-2);
      border-radius: 4px;
      line-height: 1.7;
      word-break: break-word;
    }
  }
</style>
