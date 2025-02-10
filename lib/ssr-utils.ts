export const isClient = typeof window !== "undefined";

export const getStableTime = () => {
  if (isClient) {
    return Date.now();
  }
  return 0; // Return stable value for SSR
};

export const withStableId = (prefix: string) => {
  if (isClient) {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
  }
  return `${prefix}-ssr`;
};
