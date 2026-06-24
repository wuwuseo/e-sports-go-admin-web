// eslint-disable-next-line import/no-unresolved
import { describe, expect, it } from 'vitest';
import type { CaptchaProviderDescriptor, CaptchaSettings } from '@/types/api';
import {
  buildCaptchaProviderRequest,
  buildCaptchaSceneRequest,
  isProviderDraftDirty,
  localizeCaptchaText,
  readCaptchaSettings,
  validateCaptchaProviderDraft,
} from './validate';

const mathDescriptor: CaptchaProviderDescriptor = {
  display_name: { 'zh-CN': '算术图片', 'en-US': 'Math image' },
  challenge_type: 'image_text',
  secret: {
    label: { 'zh-CN': '签名密钥', 'en-US': 'Signing secret' },
    required: true,
    min_length: 16,
  },
  fields: [
    {
      key: 'operators',
      type: 'multi_select',
      label: { 'zh-CN': '运算符', 'en-US': 'Operators' },
      default_value: ['+', '-'],
      required: true,
      options: [
        { value: '+', label: { 'zh-CN': '加法', 'en-US': 'Addition' } },
        { value: '-', label: { 'zh-CN': '减法', 'en-US': 'Subtraction' } },
      ],
    },
    {
      key: 'max_operand',
      type: 'number',
      label: { 'zh-CN': '最大操作数', 'en-US': 'Maximum operand' },
      default_value: 20,
      required: true,
      min: 2,
      max: 100,
    },
  ],
};

const geetestDescriptor: CaptchaProviderDescriptor = {
  display_name: { 'zh-CN': '极验 GT4', 'en-US': 'GeeTest GT4' },
  challenge_type: 'geetest_gt4',
  secret: {
    label: { 'zh-CN': 'Captcha Key', 'en-US': 'Captcha Key' },
    required: true,
  },
  fields: [
    {
      key: 'captcha_id',
      type: 'text',
      label: { 'zh-CN': 'Captcha ID', 'en-US': 'Captcha ID' },
      required: true,
      min_length: 1,
    },
    {
      key: 'timeout_ms',
      type: 'number',
      label: { 'zh-CN': '请求超时', 'en-US': 'Request timeout' },
      default_value: 3000,
      min: 100,
      max: 10000,
    },
  ],
};

function settings(): CaptchaSettings {
  return {
    providers: {
      image_math: {
        provider: 'image_math',
        config: { max_operand: 10 },
        secret_configured: true,
        descriptor: mathDescriptor,
      },
      geetest_gt4: {
        provider: 'geetest_gt4',
        config: {},
        secret_configured: false,
        descriptor: geetestDescriptor,
      },
      hidden_provider: {
        provider: 'hidden_provider',
        config: {},
        secret_configured: false,
      },
    },
    scenes: {
      admin_login: {
        enabled: true,
        provider: 'image_math',
        challenge_ttl: 120,
        proof_ttl: 90,
      },
    },
  };
}

const messages = {
  required: 'REQUIRED',
  minLength: 'MIN_LENGTH',
  maxLength: 'MAX_LENGTH',
  numberRange: 'NUMBER_RANGE',
  secretRequired: 'SECRET_REQUIRED',
  secretMinLength: 'SECRET_MIN_LENGTH',
  clearSecretLocked: 'CLEAR_SECRET_LOCKED',
};

describe('dynamic captcha provider configuration', () => {
  it('localizes with requested locale, English fallback, then first value', () => {
    expect(
      localizeCaptchaText({ 'zh-CN': '中文', 'en-US': 'English' }, 'zh-CN')
    ).toBe('中文');
    expect(localizeCaptchaText({ 'en-US': 'English' }, 'fr-FR')).toBe(
      'English'
    );
    expect(localizeCaptchaText({ 'zh-CN': '中文' }, 'fr-FR')).toBe('中文');
  });

  it('builds drafts only for providers that expose descriptors', () => {
    const state = readCaptchaSettings(settings());

    expect(state.providerNames).toEqual(['geetest_gt4', 'image_math']);
    expect(state.selectedProvider).toBe('image_math');
    expect(state.activeProvider).toBe('image_math');
    expect(state.providers.hidden_provider).toBeUndefined();
  });

  it('merges descriptor defaults with stored provider config', () => {
    const state = readCaptchaSettings(settings());

    expect(state.providers.image_math.config).toEqual({
      operators: ['+', '-'],
      max_operand: 10,
    });
    expect(state.providers.geetest_gt4.config).toEqual({
      captcha_id: '',
      timeout_ms: 3000,
    });
  });

  it('requires a new secret when the provider has none configured', () => {
    const state = readCaptchaSettings(settings());
    const draft = state.providers.geetest_gt4;

    expect(validateCaptchaProviderDraft(draft, false, messages)).toEqual({
      field: 'secret',
      message: 'SECRET_REQUIRED',
    });
  });

  it('accepts an empty secret when an existing secret is configured', () => {
    const state = readCaptchaSettings(settings());
    const draft = state.providers.image_math;

    expect(validateCaptchaProviderDraft(draft, false, messages)).toBeNull();
  });

  it('validates dynamic required, length, and number constraints', () => {
    const state = readCaptchaSettings(settings());
    const draft = state.providers.geetest_gt4;
    draft.secret = '0123456789abcdef';

    expect(validateCaptchaProviderDraft(draft, false, messages)).toEqual({
      field: 'captcha_id',
      message: 'REQUIRED',
    });

    draft.config.captcha_id = 'id';
    draft.config.timeout_ms = 99;
    expect(validateCaptchaProviderDraft(draft, false, messages)).toEqual({
      field: 'timeout_ms',
      message: 'NUMBER_RANGE',
    });
  });

  it('prevents clearing the active enabled provider secret', () => {
    const state = readCaptchaSettings(settings());
    const draft = state.providers.image_math;
    draft.clearSecret = true;

    expect(validateCaptchaProviderDraft(draft, true, messages)).toEqual({
      field: 'secret',
      message: 'CLEAR_SECRET_LOCKED',
    });
  });

  it('builds generic provider and selected scene requests', () => {
    const state = readCaptchaSettings(settings());
    const draft = state.providers.geetest_gt4;
    draft.secret = 'geetest-secret';
    draft.config.captcha_id = 'captcha-id';

    expect(buildCaptchaProviderRequest(draft)).toEqual({
      config: { captcha_id: 'captcha-id', timeout_ms: 3000 },
      secret: 'geetest-secret',
      clear_secret: false,
    });
    state.selectedProvider = 'geetest_gt4';
    expect(buildCaptchaSceneRequest(state)).toEqual({
      enabled: true,
      provider: 'geetest_gt4',
      challenge_ttl: 120,
      proof_ttl: 90,
    });
  });

  it('detects unsaved config, secret, and clear-secret changes', () => {
    const state = readCaptchaSettings(settings());
    const draft = state.providers.image_math;
    expect(isProviderDraftDirty(draft)).toBe(false);

    draft.config.max_operand = 11;
    expect(isProviderDraftDirty(draft)).toBe(true);
  });
});
