import { onActivated, onMounted } from 'vue';
import axios from 'axios';
import {
  createWalletDisplayCache,
  walletAmountText,
} from '@/utils/wallet-display';
import type { WalletAccountType, WalletDisplay } from '@/utils/wallet-display';
import { getWalletDisplayConfig } from './api';

const cache = createWalletDisplayCache({
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
  removeItem: (key) => localStorage.removeItem(key),
});
const scope = () => `${axios.defaults.baseURL || ''}:admin`;

export const refreshWalletDisplay = (force = false) =>
  cache.load(
    scope(),
    async () => (await getWalletDisplayConfig()).data.data,
    force
  );

export function invalidateWalletDisplay() {
  cache.clear(scope());
  return refreshWalletDisplay(true);
}

export const rememberWalletDisplay = (
  type: WalletAccountType,
  display?: WalletDisplay
) => cache.remember(scope(), type, display);

export function useWalletDisplay() {
  const displays = cache.state(scope());
  const displayName = (type: WalletAccountType) =>
    displays.value[type].display_name || '';
  const amountText = (cents: number | undefined, type: WalletAccountType) =>
    walletAmountText(cents, displays.value[type]);
  onMounted(refreshWalletDisplay);
  onActivated(refreshWalletDisplay);
  return { displays, displayName, amountText };
}
