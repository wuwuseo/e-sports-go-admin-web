const GEETEST_SCRIPT_ID = 'geetest-gt4-script';
const GEETEST_SCRIPT_URL = 'https://static.geetest.com/v4/gt4.js';

export interface CaptchaPoint {
  x: number;
  y: number;
}

export interface GeeTestValidation {
  lot_number: string;
  captcha_output: string;
  pass_token: string;
  gen_time: string;
}

export interface GeeTestInstance {
  onReady(callback: () => void): GeeTestInstance;
  onSuccess(callback: () => void): GeeTestInstance;
  onError(callback: (error?: unknown) => void): GeeTestInstance;
  onClose?(callback: () => void): GeeTestInstance;
  showCaptcha(): void;
  getValidate(): GeeTestValidation | false;
  reset(): void;
  destroy?(): void;
}

type InitGeeTest = (
  options: { captchaId: string; product: 'bind' },
  callback: (instance: GeeTestInstance) => void
) => void;

type GeeTestWindow = Window & { initGeetest4?: InitGeeTest };

let scriptPromise: Promise<void> | undefined;

export function normalizeClickPoint(
  clientX: number,
  clientY: number,
  bounds: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>
): CaptchaPoint {
  const clamp = (value: number) => Math.min(1, Math.max(0, value));
  return {
    x: clamp((clientX - bounds.left) / bounds.width),
    y: clamp((clientY - bounds.top) / bounds.height),
  };
}

export function loadGeeTestScript(): Promise<void> {
  const target = window as GeeTestWindow;
  if (target.initGeetest4) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  const promise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(
      GEETEST_SCRIPT_ID
    ) as HTMLScriptElement | null;
    const script = existing || document.createElement('script');
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener(
      'error',
      () => reject(new Error('Failed to load GeeTest')),
      { once: true }
    );
    if (!existing) {
      script.id = GEETEST_SCRIPT_ID;
      script.src = GEETEST_SCRIPT_URL;
      script.async = true;
      document.head.appendChild(script);
    }
  }).catch((error) => {
    scriptPromise = undefined;
    throw error;
  });
  scriptPromise = promise;
  return promise;
}

export async function initGeeTest(captchaId: string) {
  await loadGeeTestScript();
  const init = (window as GeeTestWindow).initGeetest4;
  if (!init) throw new Error('GeeTest is unavailable');
  return new Promise<GeeTestInstance>((resolve) => {
    init({ captchaId, product: 'bind' }, resolve);
  });
}
