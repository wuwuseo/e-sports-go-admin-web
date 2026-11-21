const pad = (value: number) => String(value).padStart(2, '0');

/** 分转元：保留两位小数，不带货币符号。 */
export function fenToYuan(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** 分转元：带人民币符号，两位小数。 */
export function formatYuan(cents: number): string {
  return `¥${fenToYuan(cents)}`;
}

/**
 * 时间展示到分钟；空值统一为 '-'。
 * 用 Date + pad 而非 dayjs，与存量实现的解析与输出逐字节一致
 * （纯日期字符串按 UTC 解析，非法值输出 NaN 而非 'Invalid Date'）。
 */
export function fmtMinute(value?: string | null): string {
  if (!value) return '-';
  const d = new Date(value);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}
