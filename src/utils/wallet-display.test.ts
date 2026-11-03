import { describe, expect, it, vi } from 'vitest';
import {
  createWalletDisplayCache,
  normalizeWalletDisplay,
  walletAmountText,
  walletPrimaryAmount,
  WALLET_DISPLAY_TTL,
} from './wallet-display';

const config = () =>
  normalizeWalletDisplay({
    customer_balance: {
      display_name: '星币',
      unit_name: '星币',
      unit_cents: 30,
      display_amount: '999.00',
    },
    player_catfood: { display_name: '能量', unit_name: '点', unit_cents: 50 },
  });

function fixture() {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) || null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
  return { values, storage, cache: createWalletDisplayCache(storage) };
}

describe('钱包展示与配置缓存', () => {
  it('按倍率截断两位小数，分项不误用另一笔余额的展示值', () => {
    const display = config().customer_balance;
    expect(walletAmountText(100, display)).toBe('3.33 星币');
    expect(walletAmountText(-101, display)).toBe('-3.36 星币');
    expect(walletAmountText(2, { unit_cents: 300, unit_name: '点' })).toBe(
      '0.00 点'
    );
    expect(
      walletPrimaryAmount(100, { ...display, display_amount: '3.33' })
    ).toBe('3.33');
    expect(walletAmountText(100, { ...display, display_amount: '999' })).toBe(
      '3.33 星币'
    );
  });

  it('合并并发请求，跨页面和重建缓存实例复用，过期后重新获取', async () => {
    vi.useFakeTimers();
    try {
      const { cache, storage, values } = fixture();
      const loader = vi.fn(async () => ({
        ...config(),
        customer_balance: {
          ...config().customer_balance,
          display_amount: '999.00',
        },
      }));
      await Promise.all([cache.load('a', loader), cache.load('a', loader)]);
      await cache.load('a', loader);
      await createWalletDisplayCache(storage).load('a', loader);
      expect(loader).toHaveBeenCalledTimes(1);
      expect([...values.values()].join('')).not.toContain('display_amount');
      vi.advanceTimersByTime(WALLET_DISPLAY_TTL + 1);
      await cache.load('a', loader);
      expect(loader).toHaveBeenCalledTimes(2);
      await cache.load('b', loader);
      expect(loader).toHaveBeenCalledTimes(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it('清除缓存后旧请求不能覆盖新配置，余额不会从缓存回填', async () => {
    const { cache } = fixture();
    let finish: ((value: ReturnType<typeof config>) => void) | undefined;
    const previous = cache.load(
      'a',
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    await Promise.resolve();
    cache.clear('a');
    await cache.load('a', async () => config());
    finish?.(
      normalizeWalletDisplay({
        ...config(),
        customer_balance: { display_name: '旧名称' },
      })
    );
    await previous;
    expect(cache.state('a').value.customer_balance.display_name).toBe('星币');
    cache.remember('a', 'customer_balance', {
      ...config().customer_balance,
      display_amount: '800',
    });
    expect(
      cache.state('a').value.customer_balance.display_amount
    ).toBeUndefined();
  });

  it('请求失败保留旧配置且不延长有效期，损坏缓存与存储异常可恢复', async () => {
    vi.useFakeTimers();
    try {
      const { cache, storage, values } = fixture();
      await cache.load('a', async () => config());
      vi.advanceTimersByTime(WALLET_DISPLAY_TTL + 1);
      await cache.load('a', async () => {
        throw new Error('离线');
      });
      expect(cache.state('a').value.customer_balance.display_name).toBe('星币');
      const loader = vi.fn(async () => config());
      await cache.load('a', loader);
      expect(loader).toHaveBeenCalledTimes(1);
      values.set('esports-wallet-display:v1:broken', '{');
      await createWalletDisplayCache(storage).load('broken', loader);
      const brokenStorage = createWalletDisplayCache({
        getItem: () => {
          throw new Error('不可读');
        },
        setItem: () => {
          throw new Error('不可写');
        },
        removeItem: () => {
          throw new Error('不可删');
        },
      });
      await brokenStorage.load('a', loader);
      brokenStorage.clear('a');
      expect(brokenStorage.state('a').value.player_catfood.display_name).toBe(
        '能量'
      );
    } finally {
      vi.useRealTimers();
    }
  });
});
