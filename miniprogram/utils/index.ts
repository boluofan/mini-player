export { getImageColor, getAverageColor } from './color';
export {
  request,
  buildResourceUrl,
  saveAuth,
  clearAuth,
  saveServerUrl,
  hasAuth,
} from './request';

export const noop = () => {};

export const random = <T>(arr: T[]) =>
  arr[Math.floor(Math.random() * arr.length)];

export const safeJSONParse = <T>(
  str: string,
  defaultValue?: T,
): T | undefined => {
  try {
    return JSON.parse(str);
  } catch {
    return defaultValue;
  }
};

const formatNumber = (n: number) => {
  const s = n.toString();
  return s[1] ? s : '0' + s;
};

export const formatTime = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();
  const minute = date.getMinutes();
  const second = date.getSeconds();
  return (
    [year, month, day].map(formatNumber).join('/') +
    ' ' +
    [hour, minute, second].map(formatNumber).join(':')
  );
};

export const sleep = (time?: number) => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(null), time);
  });
};

export const formatDuration = (seconds: number): string => {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};
