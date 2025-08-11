// lib/logger.ts
let seen = new Set<string>();

export const logOnce = (key: string, ...args: any[]) => {
  if (seen.has(key)) return;
  seen.add(key);
  // eslint-disable-next-line no-console
  console.log(...args);
};

export const clearLogCache = () => {
  seen.clear();
};
