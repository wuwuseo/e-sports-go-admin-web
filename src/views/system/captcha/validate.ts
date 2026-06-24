import type {
  CaptchaLocalizedText,
  CaptchaProviderDescriptor,
  CaptchaProviderSettingsRequest,
  CaptchaSceneSettings,
  CaptchaSettings,
} from '@/types/api';

export interface CaptchaProviderDraft {
  provider: string;
  descriptor: CaptchaProviderDescriptor;
  config: Record<string, any>;
  savedConfig: Record<string, any>;
  secret: string;
  clearSecret: boolean;
  secretConfigured: boolean;
}

export interface CaptchaConfigState {
  providerNames: string[];
  providers: Record<string, CaptchaProviderDraft>;
  selectedProvider: string;
  activeProvider: string;
  sceneEnabled: boolean;
  persistedSceneEnabled: boolean;
  challengeTtl: number;
  proofTtl: number;
}

export interface CaptchaValidationMessages {
  required: string;
  minLength: string;
  maxLength: string;
  numberRange: string;
  secretRequired: string;
  secretMinLength: string;
  clearSecretLocked: string;
}

export interface CaptchaValidationError {
  field: string;
  message: string;
}

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function defaultFieldValue(field: CaptchaProviderDescriptor['fields'][number]) {
  if (field.default_value !== undefined) return cloneValue(field.default_value);
  if (field.type === 'multi_select') return [];
  if (field.type === 'text' || field.type === 'textarea') return '';
  return undefined;
}

export function localizeCaptchaText(
  text: CaptchaLocalizedText | undefined,
  locale: string
) {
  if (!text) return '';
  return text[locale] || text['en-US'] || Object.values(text)[0] || '';
}

export function readCaptchaSettings(
  settings: CaptchaSettings
): CaptchaConfigState {
  const providers: Record<string, CaptchaProviderDraft> = {};
  const providerNames = Object.keys(settings.providers || {})
    .filter((name) => Boolean(settings.providers[name].descriptor))
    .sort();

  providerNames.forEach((name) => {
    const item = settings.providers[name];
    const descriptor = item.descriptor as CaptchaProviderDescriptor;
    const defaults = Object.fromEntries(
      descriptor.fields.map((field) => [field.key, defaultFieldValue(field)])
    );
    const config = { ...defaults, ...(item.config || {}) };
    providers[name] = {
      provider: name,
      descriptor,
      config,
      savedConfig: cloneValue(config),
      secret: '',
      clearSecret: false,
      secretConfigured: Boolean(item.secret_configured),
    };
  });

  const scene = settings.scenes?.admin_login;
  const activeProvider = scene?.provider || '';
  const selectedProvider = providers[activeProvider]
    ? activeProvider
    : providerNames[0] || '';

  return {
    providerNames,
    providers,
    selectedProvider,
    activeProvider,
    sceneEnabled: scene?.enabled ?? false,
    persistedSceneEnabled: scene?.enabled ?? false,
    challengeTtl: scene?.challenge_ttl ?? 120,
    proofTtl: scene?.proof_ttl ?? 90,
  };
}

function isEmpty(value: unknown) {
  return (
    value === undefined ||
    value === null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)
  );
}

export function validateCaptchaProviderDraft(
  draft: CaptchaProviderDraft,
  clearSecretLocked: boolean,
  messages: CaptchaValidationMessages
): CaptchaValidationError | null {
  const secret = draft.secret.trim();
  if (draft.clearSecret && clearSecretLocked) {
    return { field: 'secret', message: messages.clearSecretLocked };
  }
  if (
    !draft.clearSecret &&
    draft.descriptor.secret.required &&
    !draft.secretConfigured &&
    !secret
  ) {
    return { field: 'secret', message: messages.secretRequired };
  }
  if (
    secret &&
    draft.descriptor.secret.min_length &&
    secret.length < draft.descriptor.secret.min_length
  ) {
    return { field: 'secret', message: messages.secretMinLength };
  }

  const fieldError = draft.descriptor.fields
    .map((field): CaptchaValidationError | null => {
      const value = draft.config[field.key];
      if (field.required && isEmpty(value)) {
        return { field: field.key, message: messages.required };
      }
      if (typeof value === 'string') {
        if (field.min_length && value.length < field.min_length) {
          return { field: field.key, message: messages.minLength };
        }
        if (field.max_length && value.length > field.max_length) {
          return { field: field.key, message: messages.maxLength };
        }
      }
      if (
        typeof value === 'number' &&
        ((field.min !== undefined && value < field.min) ||
          (field.max !== undefined && value > field.max))
      ) {
        return { field: field.key, message: messages.numberRange };
      }
      return null;
    })
    .find((error) => error !== null);
  return fieldError || null;
}

export function buildCaptchaProviderRequest(
  draft: CaptchaProviderDraft
): CaptchaProviderSettingsRequest {
  const secret = draft.secret.trim();
  return {
    config: cloneValue(draft.config),
    ...(!draft.clearSecret && secret ? { secret } : {}),
    clear_secret: draft.clearSecret,
  };
}

export function buildCaptchaSceneRequest(
  state: CaptchaConfigState
): CaptchaSceneSettings {
  return {
    enabled: state.sceneEnabled,
    provider: state.selectedProvider,
    challenge_ttl: state.challengeTtl,
    proof_ttl: state.proofTtl,
  };
}

export function isProviderDraftDirty(draft: CaptchaProviderDraft) {
  return (
    JSON.stringify(draft.config) !== JSON.stringify(draft.savedConfig) ||
    Boolean(draft.secret.trim()) ||
    draft.clearSecret
  );
}
