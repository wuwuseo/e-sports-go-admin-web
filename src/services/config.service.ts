import { getConfigByKey } from '@/api/config';

export interface ConfigMetadata<T = any> {
  key: string;
  defaultValue: T;
  transformer?: (value: string) => T;
  validator?: (value: T) => boolean;
}

export const CHUNK_UPLOAD_CONFIGS = {
  CHUNK_THRESHOLD: {
    key: 'attachment.chunk_threshold',
    defaultValue: 10 * 1024 * 1024,
    transformer: (value: string) => Number(value),
    validator: (value: number) => value > 0,
  },
  CHUNK_SIZE: {
    key: 'attachment.chunk_size',
    defaultValue: 5 * 1024 * 1024,
    transformer: (value: string) => Number(value),
    validator: (value: number) => value > 0,
  },
} as const;

const configCache = new Map<string, any>();

export async function getConfig<T>(metadata: ConfigMetadata<T>): Promise<T> {
  if (configCache.has(metadata.key)) {
    return configCache.get(metadata.key) as T;
  }

  try {
    const response = await getConfigByKey(metadata.key);
    const rawValue = response.data.data?.value;

    if (rawValue === undefined || rawValue === null || rawValue === '') {
      configCache.set(metadata.key, metadata.defaultValue);
      return metadata.defaultValue;
    }

    const transformedValue = metadata.transformer
      ? metadata.transformer(rawValue)
      : (rawValue as T);

    if (metadata.validator && !metadata.validator(transformedValue)) {
      // 配置项校验失败，回退到默认值
      // eslint-disable-next-line no-console
      console.warn(
        `Config ${metadata.key} validation failed, using default value`
      );
      configCache.set(metadata.key, metadata.defaultValue);
      return metadata.defaultValue;
    }

    configCache.set(metadata.key, transformedValue);
    return transformedValue;
  } catch (error) {
    // 拉取配置失败，回退到默认值
    // eslint-disable-next-line no-console
    console.error(`Failed to fetch config ${metadata.key}:`, error);
    configCache.set(metadata.key, metadata.defaultValue);
    return metadata.defaultValue;
  }
}

export async function getConfigs<T extends Record<string, ConfigMetadata>>(
  configs: T
): Promise<{
  [K in keyof T]: T[K]['transformer'] extends (value: string) => infer R
    ? R
    : T[K]['defaultValue'];
}> {
  const entries = Object.entries(configs) as [keyof T, ConfigMetadata<any>][];

  const results = await Promise.allSettled(
    entries.map(([, metadata]) => getConfig(metadata))
  );

  return entries.reduce((acc, [key], index) => {
    const result = results[index];
    acc[key] =
      result.status === 'fulfilled' ? result.value : configs[key].defaultValue;
    return acc;
  }, {} as any);
}

export function clearConfigCache(key?: string): void {
  if (key) {
    configCache.delete(key);
  } else {
    configCache.clear();
  }
}

export async function getChunkUploadConfig() {
  return getConfigs(CHUNK_UPLOAD_CONFIGS);
}
