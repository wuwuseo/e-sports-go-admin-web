import { describe, expect, it } from 'vitest';
import yuanToCents, { divideToInt, scaleToInt } from './money';

describe('yuanToCents', () => {
  it('按字符串计算，规避浮点乘法误差', () => {
    // 浮点直乘会得到 847.4999… / 133.4999… / 100.4999…，取整后少 1 分
    expect(yuanToCents(8.475)).toBe(848);
    expect(yuanToCents(1.335)).toBe(134);
    expect(yuanToCents(1.005)).toBe(101);
  });

  it('常规值与负数', () => {
    expect(yuanToCents(20)).toBe(2000);
    expect(yuanToCents('19.99')).toBe(1999);
    expect(yuanToCents(0.01)).toBe(1);
    expect(yuanToCents(-3.5)).toBe(-350);
    expect(yuanToCents(0)).toBe(0);
  });

  it('scaleToInt 支持 10 的幂因子（如折扣 → 基点）', () => {
    expect(scaleToInt(8.5, 1000)).toBe(8500);
    expect(scaleToInt('8.85', 1000)).toBe(8850);
    expect(scaleToInt(0.145, 1000)).toBe(145);
  });

  it('divideToInt 均摊与单位换算按十进制精确取整', () => {
    // 浮点 ((145 / 1000) * 100) 会得到 14.4999…，直接取整丢 1
    expect(divideToInt(145, 1000, 100)).toBe(15);
    expect(divideToInt(1000, 3)).toBe(333);
    expect(divideToInt(2000, 3)).toBe(667);
  });
});
