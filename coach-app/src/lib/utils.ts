import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function deepCleanObject(obj: any, seen = new WeakSet()): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // Prevent circular structure errors
  if (seen.has(obj)) {
    return undefined;
  }
  seen.add(obj);

  // Handle Date and Timestamp objects
  if (obj instanceof Date) {
    return obj.toISOString();
  }
  if (typeof (obj as any).toDate === 'function') {
    return (obj as any).toDate().toISOString();
  }

  // Ignore DOM elements / React Fiber / Event nodes
  if (typeof Element !== 'undefined' && obj instanceof Element) {
    return undefined;
  }
  if ((obj as any).$$typeof) {
    return undefined;
  }

  if (Array.isArray(obj)) {
    return obj
      .map(item => deepCleanObject(item, seen))
      .filter(item => item !== undefined);
  }

  const newObj: any = {};
  Object.keys(obj).forEach(key => {
    const value = obj[key];
    if (value !== undefined && typeof value !== 'function' && typeof value !== 'symbol') {
      const cleaned = deepCleanObject(value, seen);
      if (cleaned !== undefined) {
        newObj[key] = cleaned;
      }
    }
  });
  return newObj;
}

export function safeJsonStringify(obj: any, defaultValue: string = "{}"): string {
  try {
    const seen = new WeakSet();
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return undefined;
        }
        seen.add(value);
      }
      return value;
    });
  } catch (error) {
    console.warn("safeJsonStringify failed to serialize:", error);
    return defaultValue;
  }
}

export const getEmbedUrl = (url: string) => {
  if (!url) return "";
  let videoId = "";
  if (url.includes("youtu.be/")) {
    videoId = url.split("youtu.be/")[1].split("?")[0];
  } else if (url.includes("youtube.com/watch?v=")) {
    videoId = url.split("watch?v=")[1].split("&")[0];
  } else if (url.includes("youtube.com/shorts/")) {
    videoId = url.split("shorts/")[1].split("?")[0];
  }
  return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
};
