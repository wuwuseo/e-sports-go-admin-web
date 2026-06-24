import axios from 'axios';
import type {
  ApiResponse,
  CaptchaChallenge,
  CaptchaProviderSettingsRequest,
  CaptchaProviderSettingsResponse,
  CaptchaScene,
  CaptchaSceneSettings,
  CaptchaSettings,
  CaptchaVerification,
} from '@/types/api';

const SCENE = 'admin_login' as const;

interface ResolvedChallengeBase {
  id: string;
  provider: string;
}

export interface ResolvedImageTextChallenge extends ResolvedChallengeBase {
  type: 'image_text';
  image: string;
  mimeType: string;
}

export interface ResolvedImageClickChallenge extends ResolvedChallengeBase {
  type: 'image_click';
  image: string;
  mimeType: string;
  prompt: string;
  pointCount: number;
}

export interface ResolvedGeeTestChallenge extends ResolvedChallengeBase {
  type: 'geetest_gt4';
  captchaId: string;
}

export type ResolvedCaptchaChallenge =
  | ResolvedImageTextChallenge
  | ResolvedImageClickChallenge
  | ResolvedGeeTestChallenge;

export function resolveCaptchaChallenge(
  challenge: CaptchaChallenge
): ResolvedCaptchaChallenge | null {
  if (!challenge.required) return null;
  if (!challenge.challenge_id || !challenge.provider) {
    throw new Error('Unsupported captcha challenge');
  }

  if (
    challenge.challenge_type === 'image_text' &&
    challenge.payload?.image_base64
  ) {
    return {
      type: 'image_text',
      id: challenge.challenge_id,
      provider: challenge.provider,
      image: challenge.payload.image_base64,
      mimeType: challenge.payload.mime_type || 'image/png',
    };
  }

  if (
    challenge.challenge_type === 'image_click' &&
    challenge.payload?.image_base64 &&
    challenge.payload.prompt &&
    challenge.payload.point_count
  ) {
    return {
      type: 'image_click',
      id: challenge.challenge_id,
      provider: challenge.provider,
      image: challenge.payload.image_base64,
      mimeType: challenge.payload.mime_type || 'image/png',
      prompt: challenge.payload.prompt,
      pointCount: challenge.payload.point_count,
    };
  }

  if (
    challenge.challenge_type === 'geetest_gt4' &&
    challenge.payload?.captcha_id
  ) {
    return {
      type: 'geetest_gt4',
      id: challenge.challenge_id,
      provider: challenge.provider,
      captchaId: challenge.payload.captcha_id,
    };
  }

  throw new Error('Unsupported captcha challenge');
}

export function createCaptchaChallenge() {
  return axios.post<ApiResponse<CaptchaChallenge>>(
    '/api/v1/public/captcha/challenges',
    { scene: SCENE },
    { silentError: true }
  );
}

export function verifyCaptchaChallenge(
  id: string,
  data: Record<string, unknown>
) {
  return axios.post<ApiResponse<CaptchaVerification>>(
    '/api/v1/public/captcha/verifications',
    {
      challenge_id: id,
      response: data,
    },
    { silentError: true }
  );
}

export function getCaptchaSettings() {
  return axios.get<ApiResponse<CaptchaSettings>>(
    '/api/v1/admin/auth/captcha/settings'
  );
}

export function validateCaptchaProvider(
  provider: string,
  data: CaptchaProviderSettingsRequest
) {
  return axios.post<ApiResponse<null>>(
    `/api/v1/admin/auth/captcha/providers/${provider}/test`,
    data
  );
}

export function updateCaptchaProvider(
  provider: string,
  data: CaptchaProviderSettingsRequest
) {
  return axios.put<ApiResponse<CaptchaProviderSettingsResponse>>(
    `/api/v1/admin/auth/captcha/providers/${provider}`,
    data
  );
}

export function updateCaptchaScene(
  scene: CaptchaScene,
  data: CaptchaSceneSettings
) {
  return axios.put<ApiResponse<CaptchaSceneSettings>>(
    `/api/v1/admin/auth/captcha/scenes/${scene}`,
    data
  );
}
