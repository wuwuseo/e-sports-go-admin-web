/**
 * 生成 UUID v4。
 *
 * `crypto.randomUUID()` 只在**安全上下文**（HTTPS 或 localhost）下存在，
 * 通过 HTTP + 域名/IP 访问（如 http://1.2.3.4:9501）时它是 undefined，
 * 直接调用会抛 `TypeError: crypto.randomUUID is not a function`，
 * 且在页面 setup 阶段调用会导致整个组件渲染中断。
 *
 * 这里按可用性逐级降级：
 *   1. crypto.randomUUID()     — 安全上下文
 *   2. crypto.getRandomValues() — 不受安全上下文限制，密码学随机
 *   3. Math.random()            — 极端兜底，仅用于幂等键等非密钥场景
 */
export function uuidV4(): string {
  const globalCrypto =
    typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;

  if (globalCrypto && typeof globalCrypto.randomUUID === 'function') {
    return globalCrypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (globalCrypto && typeof globalCrypto.getRandomValues === 'function') {
    globalCrypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  // 按 RFC 4122 标注版本 4 与变体位；用取模+加法等价位运算，规避 no-bitwise 规则
  bytes[6] = (bytes[6] % 16) + 64; // 高 4 位清零后置 0100
  bytes[8] = (bytes[8] % 64) + 128; // 高 2 位清零后置 10

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join(
    ''
  );
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(
    12,
    16
  )}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export default uuidV4;
