import Big from 'big.js';

/**
 * 按 10 的幂（100、1000 等）缩放并四舍五入取整。
 * 用 big.js 做十进制高精度运算，规避 8.475 * 100 = 847.4999… 这类浮点误差。
 */
export function scaleToInt(value: number | string, factor: number): number {
  return Number(
    new Big(value).times(factor).round(0, Big.roundHalfUp).toString()
  );
}

/** 元转分（百分比转基点同口径：两位小数 ×100 取整）。 */
export default function yuanToCents(value: number | string): number {
  return scaleToInt(value, 100);
}

/** 相除后乘 factor 再取整：用于均摊金额、单位换算等。 */
export function divideToInt(
  value: number | string,
  divisor: number | string,
  factor = 1
): number {
  return Number(
    new Big(value)
      .div(divisor)
      .times(factor)
      .round(0, Big.roundHalfUp)
      .toString()
  );
}
