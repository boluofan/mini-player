import type { AuthTokens } from '@/miniprogram/types';

const STORAGE_KEY_AUTH = 'songloftAuth';
const STORAGE_KEY_SERVER = 'songloftServer';

let cachedAuth: AuthTokens | null = null;
let isRefreshing = false;
let refreshQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: any) => void;
}> = [];

function getServerUrl(): string {
  return wx.getStorageSync(STORAGE_KEY_SERVER) || '';
}

function getAuth(): AuthTokens | null {
  if (cachedAuth) return cachedAuth;
  const raw = wx.getStorageSync(STORAGE_KEY_AUTH);
  if (!raw) return null;
  cachedAuth = raw as AuthTokens;
  if (cachedAuth.expiresAt < Date.now()) {
    clearAuth();
    return null;
  }
  return cachedAuth;
}

export function saveAuth(tokens: AuthTokens) {
  cachedAuth = tokens;
  wx.setStorageSync(STORAGE_KEY_AUTH, tokens);
}

export function clearAuth() {
  cachedAuth = null;
  wx.removeStorageSync(STORAGE_KEY_AUTH);
}

export function saveServerUrl(url: string) {
  wx.setStorageSync(STORAGE_KEY_SERVER, url.replace(/\/+$/, ''));
}

export function hasAuth(): boolean {
  return getAuth() !== null;
}

async function refreshToken(): Promise<string> {
  const auth = cachedAuth;
  if (!auth?.refreshToken) throw new Error('no refresh token');

  const baseUrl = getServerUrl();
  if (!baseUrl) throw new Error('server not configured');

  const res = await wx.request({
    url: `${baseUrl}/api/v1/auth/refresh`,
    method: 'POST',
    data: { refresh_token: auth.refreshToken },
    header: { 'content-type': 'application/json' },
  });

  if (res.statusCode !== 200) {
    clearAuth();
    throw new Error('token refresh failed');
  }

  const data = res.data as any;
  const newTokens: AuthTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + (data.expires_in || 604800) * 1000,
  };
  saveAuth(newTokens);
  return newTokens.accessToken;
}

function getAccessToken(): Promise<string> {
  const auth = getAuth();
  if (!auth?.accessToken) return Promise.reject('not authenticated');

  if (auth.expiresAt > Date.now() + 60000) {
    return Promise.resolve(auth.accessToken);
  }

  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      refreshQueue.push({ resolve, reject });
    });
  }

  isRefreshing = true;
  return refreshToken()
    .then((token) => {
      refreshQueue.forEach((q) => q.resolve(token));
      return token;
    })
    .catch((err) => {
      refreshQueue.forEach((q) => q.reject(err));
      throw err;
    })
    .finally(() => {
      isRefreshing = false;
      refreshQueue = [];
    });
}

interface RequestParams {
  url: string;
  method?:
    | 'OPTIONS'
    | 'GET'
    | 'HEAD'
    | 'POST'
    | 'PUT'
    | 'DELETE'
    | 'TRACE'
    | 'CONNECT';
  data?: any;
  timeout?: number;
  header?: Record<string, string>;
  noAuth?: boolean;
}

export const request = <T>({
  url,
  method = 'GET',
  data,
  timeout = 15000,
  header = {},
  noAuth = false,
}: RequestParams) => {
  const baseUrl = getServerUrl();
  if (!baseUrl) return Promise.reject('server not configured');

  const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
  const headers: Record<string, string> = { ...header };

  return new Promise<{ data: T; statusCode: number; header: any }>(
    async (resolve, reject) => {
      try {
        if (!noAuth) {
          const token = await getAccessToken();
          headers['Authorization'] = `Bearer ${token}`;
        }

        if (data && method !== 'GET') {
          headers['content-type'] = 'application/json';
        }

        wx.request({
          url: fullUrl,
          method,
          data,
          header: headers,
          timeout,
          success: (res) => {
            if (res.statusCode === 401 && !noAuth) {
              clearAuth();
              const pages = getCurrentPages();
              const page = pages[pages.length - 1];
              if (page?.route !== 'pages/login/index') {
                wx.reLaunch({ url: '/pages/login/index' });
              }
              reject(new Error('unauthorized'));
              return;
            }
            resolve({
              data: res.data as T,
              statusCode: res.statusCode,
              header: res.header,
            });
          },
          fail: (err) => {
            showNetworkError(err.errMsg || '');
            reject(err);
          },
        });
      } catch (err) {
        reject(err);
      }
    },
  );
};

export function showNetworkError(errMsg: string) {
  if (errMsg === 'request:fail url not in domain list') {
    wx.showModal({
      title: '网络异常',
      content: '局域网访问请确保小程序与 Songloft 服务在同一网段下',
      showCancel: false,
    });
  } else if (errMsg.includes('-109')) {
    wx.showModal({
      title: '请求异常',
      content: '局域网访问请确认【系统设置-隐私-本地网络】权限已授予微信',
      showCancel: false,
    });
  }
}

export function getServerBaseUrl(): string {
  return getServerUrl();
}

export function buildResourceUrl(path: string): string {
  const baseUrl = getServerUrl();
  if (!baseUrl || !path) return '';
  const auth = getAuth();
  if (!auth) return `${baseUrl}${path}`;
  const sep = path.includes('?') ? '&' : '?';
  return `${baseUrl}${path}${sep}access_token=${auth.accessToken}`;
}
