import type { PublicOAuthProvider } from '@/types/api';

export default function shouldShowProviderLogin(
  provider?: Partial<PublicOAuthProvider>
) {
  return provider?.provider === 'github';
}
