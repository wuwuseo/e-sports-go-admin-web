import 'axios';

declare module 'axios' {
  interface AxiosRequestConfig {
    silentError?: boolean;
  }
}
