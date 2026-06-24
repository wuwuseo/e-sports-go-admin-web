// eslint-disable-next-line import/no-unresolved
import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import {
  createCaptchaChallenge,
  getCaptchaSettings,
  resolveCaptchaChallenge,
  updateCaptchaProvider,
  updateCaptchaScene,
  validateCaptchaProvider,
  verifyCaptchaChallenge,
} from './captcha';

vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
  },
}));

describe('captcha api contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates an admin_login challenge', () => {
    createCaptchaChallenge();
    expect(axios.post).toHaveBeenCalledWith(
      '/api/v1/public/captcha/challenges',
      { scene: 'admin_login' },
      { silentError: true }
    );
  });

  it('submits provider-specific verification data', () => {
    verifyCaptchaChallenge('challenge-123', {
      points: [{ x: 0.25, y: 0.5 }],
    });
    expect(axios.post).toHaveBeenCalledWith(
      '/api/v1/public/captcha/verifications',
      {
        challenge_id: 'challenge-123',
        response: { points: [{ x: 0.25, y: 0.5 }] },
      },
      { silentError: true }
    );
  });

  it('uses the existing settings and mutation endpoints', () => {
    const payload = {
      config: { captcha_id: 'id', timeout_ms: 3000 },
      secret: 'key',
      clear_secret: false,
    };
    getCaptchaSettings();
    validateCaptchaProvider('geetest_gt4', payload);
    updateCaptchaProvider('geetest_gt4', payload);
    updateCaptchaScene('admin_login', {
      enabled: true,
      provider: 'geetest_gt4',
      challenge_ttl: 120,
      proof_ttl: 90,
    });

    expect(axios.get).toHaveBeenCalledWith(
      '/api/v1/admin/auth/captcha/settings'
    );
    expect(axios.post).toHaveBeenCalledWith(
      '/api/v1/admin/auth/captcha/providers/geetest_gt4/test',
      payload
    );
    expect(axios.put).toHaveBeenCalledWith(
      '/api/v1/admin/auth/captcha/providers/geetest_gt4',
      payload
    );
    expect(axios.put).toHaveBeenCalledWith(
      '/api/v1/admin/auth/captcha/scenes/admin_login',
      {
        enabled: true,
        provider: 'geetest_gt4',
        challenge_ttl: 120,
        proof_ttl: 90,
      }
    );
  });

  it('returns null when the scene does not require captcha', () => {
    expect(resolveCaptchaChallenge({ required: false })).toBeNull();
  });

  it('resolves an image_text challenge', () => {
    expect(
      resolveCaptchaChallenge({
        required: true,
        challenge_id: 'text-id',
        provider: 'image_math',
        challenge_type: 'image_text',
        payload: {
          image_base64: 'image',
          mime_type: 'image/png',
          width: 180,
          height: 64,
        },
      })
    ).toEqual({
      type: 'image_text',
      id: 'text-id',
      provider: 'image_math',
      image: 'image',
      mimeType: 'image/png',
    });
  });

  it('resolves an image_click challenge', () => {
    expect(
      resolveCaptchaChallenge({
        required: true,
        challenge_id: 'click-id',
        provider: 'image_chinese_click',
        challenge_type: 'image_click',
        payload: {
          image_base64: 'image',
          prompt: '山水火',
          point_count: 3,
        },
      })
    ).toEqual({
      type: 'image_click',
      id: 'click-id',
      provider: 'image_chinese_click',
      image: 'image',
      mimeType: 'image/png',
      prompt: '山水火',
      pointCount: 3,
    });
  });

  it('resolves a geetest challenge', () => {
    expect(
      resolveCaptchaChallenge({
        required: true,
        challenge_id: 'geetest-id',
        provider: 'geetest_gt4',
        challenge_type: 'geetest_gt4',
        payload: { captcha_id: 'captcha-id' },
      })
    ).toEqual({
      type: 'geetest_gt4',
      id: 'geetest-id',
      provider: 'geetest_gt4',
      captchaId: 'captcha-id',
    });
  });

  it('rejects incomplete or unknown challenges', () => {
    expect(() =>
      resolveCaptchaChallenge({
        required: true,
        challenge_id: 'bad',
        provider: 'unknown',
      })
    ).toThrow('Unsupported captcha challenge');
  });
});
