import type { ConfigValueType } from '@/types/api';

export interface KvItem {
  key: string;
  value: string;
}

export interface ArrayItem {
  value: string;
}

export interface Array2dItem {
  key: string;
  values: Array<{
    value: string;
    type: ConfigValueType;
    list?: ArrayItem[];
    subData?: Array<{
      key: string;
      value: string;
      type: ConfigValueType;
    }>;
  }>;
}

export function parseKvData(value: string): KvItem[] {
  try {
    const parsed = JSON.parse(value || '[]');
    if (Array.isArray(parsed)) {
      return parsed.map((item: any) => ({
        key: item.key ?? item.key_name ?? '',
        value: item.value ?? item.key_value ?? '',
      }));
    }
    if (typeof parsed === 'object' && parsed !== null) {
      return Object.entries(parsed).map(([k, v]) => ({
        key: k,
        value: String(v ?? ''),
      }));
    }
  } catch {
    // ignore parse error
  }
  return [];
}

export function serializeKvData(data: KvItem[]): string {
  return JSON.stringify(data.filter((item) => item.key || item.value));
}

export function parseArrayData(value: string): ArrayItem[] {
  try {
    const parsed = JSON.parse(value || '[]');
    if (Array.isArray(parsed)) {
      return parsed.map((item: any) => ({
        value: String(item ?? ''),
      }));
    }
  } catch {
    // ignore parse error
  }
  return [];
}

export function serializeArrayData(data: ArrayItem[]): string {
  return JSON.stringify(data.map((item) => item.value).filter((v) => v));
}

export function parseArray2dData(value: string): Array2dItem[] {
  try {
    const parsed = JSON.parse(value || '{}');
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      !Array.isArray(parsed)
    ) {
      return Object.entries(parsed).map(([key, val]: [string, any]) => {
        let type: ConfigValueType = 'string';
        let valueStr = '';
        let list: any[] | undefined;
        let subData: any[] | undefined;

        if (Array.isArray(val)) {
          type = 'array';
          list = val.map((item: any) => ({ value: String(item ?? '') }));
        } else if (typeof val === 'object' && val !== null) {
          type = 'array2d';
          subData = Object.entries(val).map(
            ([sdKey, sdVal]: [string, any]) => ({
              key: sdKey,
              value: String(sdVal ?? ''),
              type: 'string' as ConfigValueType,
            })
          );
        } else if (typeof val === 'number') {
          type = 'number';
          valueStr = String(val);
        } else if (typeof val === 'boolean') {
          type = 'boolean';
          valueStr = String(val);
        } else {
          valueStr = String(val ?? '');
        }

        const valueObj: any = {
          value: valueStr,
          type,
        };
        if (list) {
          valueObj.list = list;
        }
        if (subData) {
          valueObj.subData = subData;
        }

        return {
          key,
          values: [valueObj],
        };
      });
    }
    if (Array.isArray(parsed)) {
      return parsed.map((item: any) => {
        if (typeof item === 'object' && item !== null && 'key' in item) {
          return {
            key: String(item.key ?? ''),
            values: Array.isArray(item.values)
              ? item.values.map((v: any) => {
                  if (typeof v === 'object' && v !== null) {
                    const type = (v.type as ConfigValueType) || 'string';
                    const val = {
                      value: String(v.value ?? ''),
                      type,
                    };
                    if (type === 'array' && v.list) {
                      (val as any).list = v.list;
                    }
                    if (type === 'array2d' && v.subData) {
                      (val as any).subData = v.subData.map((sd: any) => ({
                        key: String(sd.key ?? ''),
                        value: String(sd.value ?? ''),
                        type: (sd.type as ConfigValueType) || 'string',
                      }));
                    }
                    return val;
                  }
                  const val = {
                    value: String(v ?? ''),
                    type: 'string' as ConfigValueType,
                  };
                  return val;
                })
              : [],
          };
        }
        if (Array.isArray(item)) {
          return {
            key: '',
            values: item.map((v: any) => {
              if (typeof v === 'object' && v !== null) {
                const type = (v.type as ConfigValueType) || 'string';
                const val = {
                  value: String(v.value ?? ''),
                  type,
                };
                if (type === 'array' && v.list) {
                  (val as any).list = v.list;
                }
                return val;
              }
              const val = {
                value: String(v ?? ''),
                type: 'string' as ConfigValueType,
              };
              return val;
            }),
          };
        }
        return {
          key: '',
          values: [
            {
              value: String(item ?? ''),
              type: 'string' as ConfigValueType,
            },
          ],
        };
      });
    }
  } catch {
    // ignore parse error
  }
  return [];
}

export function serializeArray2dData(data: Array2dItem[]): string {
  const result: Record<string, any> = {};
  data.forEach((row) => {
    if (!row.key) return;
    const val = row.values[0];
    if (!val) {
      result[row.key] = '';
      return;
    }
    switch (val.type) {
      case 'array':
        result[row.key] = (val as any).list
          ? (val as any).list.map((item: any) => item.value)
          : [];
        break;
      case 'array2d':
        result[row.key] = {};
        if ((val as any).subData) {
          (val as any).subData.forEach((sd: any) => {
            if (sd.key) {
              result[row.key][sd.key] = sd.value;
            }
          });
        }
        break;
      case 'number':
        result[row.key] = val.value ? Number(val.value) : 0;
        break;
      case 'boolean':
        result[row.key] = val.value === 'true';
        break;
      default:
        result[row.key] = val.value;
    }
  });
  return JSON.stringify(result);
}

export function getArray2dMaxCols(data: Array2dItem[]): number {
  return data.length > 0
    ? Math.max(...data.map((row) => row.values.length))
    : 1;
}
