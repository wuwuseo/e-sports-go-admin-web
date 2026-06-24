// eslint-disable-next-line import/no-unresolved
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('login captcha form binding', () => {
  it('binds text input and renders all supported challenge interactions', () => {
    const source = readFileSync(
      resolve(__dirname, 'components/login-form.vue'),
      'utf8'
    );

    expect(source).toContain('v-model="userInfo.captcha"');
    expect(source).toContain("captcha: ''");
    expect(source).toContain("captchaChallenge?.type === 'image_click'");
    expect(source).toContain("captchaChallenge?.type === 'geetest_gt4'");
    expect(source).toContain('@click="handleCaptchaImageClick"');
    expect(source).toContain('requestGeeTestValidation');
  });
});
