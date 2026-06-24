// eslint-disable-next-line import/no-unresolved
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initGeeTest, normalizeClickPoint } from './captcha';

describe('login captcha interactions', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('normalizes click coordinates to the image bounds', () => {
    expect(
      normalizeClickPoint(75, 100, {
        left: 25,
        top: 50,
        width: 200,
        height: 100,
      })
    ).toEqual({ x: 0.25, y: 0.5 });
  });

  it('initializes GeeTest in bind mode with the challenge captcha id', async () => {
    const instance = { showCaptcha: vi.fn() };
    const initGeetest4 = vi.fn(
      (
        options: { captchaId: string; product: string },
        callback: (value: unknown) => void
      ) => callback(instance)
    );
    vi.stubGlobal('window', { initGeetest4 });

    await expect(initGeeTest('captcha-id')).resolves.toBe(instance);
    expect(initGeetest4).toHaveBeenCalledWith(
      { captchaId: 'captcha-id', product: 'bind' },
      expect.any(Function)
    );
  });
});
