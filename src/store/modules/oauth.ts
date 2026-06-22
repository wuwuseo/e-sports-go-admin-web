import { defineStore } from 'pinia';
import {
  getCurrentOAuthIdentities,
  getPublicOAuthProviders,
} from '@/api/oauth';
import type { OAuthIdentity, PublicOAuthProvider } from '@/types/api';

interface OAuthState {
  providers: PublicOAuthProvider[];
  identities: OAuthIdentity[];
  providerLoaded: boolean;
  loading: boolean;
}

const useOAuthStore = defineStore('oauth', {
  state: (): OAuthState => ({
    providers: [],
    identities: [],
    providerLoaded: false,
    loading: false,
  }),

  getters: {
    adminGithubProvider(state) {
      return state.providers.find((item) => item.provider === 'github');
    },
  },

  actions: {
    async fetchProviders(
      subjectType: 'admin' | 'user' = 'admin',
      force = false
    ) {
      if (this.providerLoaded && !force) return this.providers;
      this.loading = true;
      try {
        const res = await getPublicOAuthProviders({
          subject_type: subjectType,
        });
        this.providers = res.data.data || [];
        this.providerLoaded = true;
        return this.providers;
      } finally {
        this.loading = false;
      }
    },

    async fetchCurrentIdentities() {
      this.loading = true;
      try {
        const res = await getCurrentOAuthIdentities();
        this.identities = res.data.data || [];
        return this.identities;
      } finally {
        this.loading = false;
      }
    },
  },
});

export default useOAuthStore;
