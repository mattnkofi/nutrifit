// Supabase Storage helpers for the two image buckets.
//
// Meal photos and avatars are uploaded as real files instead of base64 strings
// so they survive a device change. The buckets are public but every object path
// starts with the owner's user id plus a random suffix, which keeps the URL
// unguessable while still allowing a plain <img src> on any device.

import { supabase } from './supabase';

const AVATAR_BUCKET = 'avatars';
const MEAL_BUCKET = 'meal-images';
const PUBLIC_SEGMENT = '/storage/v1/object/public/';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const isStorageConfigured = Boolean(supabase);

// Once an upload proves that the buckets are missing, stay on the no-migration
// path for the rest of the session instead of retrying every image.
let storageUsable = true;
export const isStorageUsable = () => storageUsable;
const markStorageUnusable = () => {
  storageUsable = false;
};

const asArray = (value) => (Array.isArray(value) ? value : []);

const isHttpUrl = (value) => /^https?:\/\//i.test(String(value || ''));

const randomId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const safeSegment = (value) =>
  String(value || '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .slice(0, 80) || randomId();

const extensionFor = (mime) => {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';
};

const parseDataUrl = (value) => {
  const text = String(value || '').trim();
  const match = /^data:([^;,]+)?(;base64)?,([\s\S]*)$/.exec(text);
  if (!match) return null;
  const mime = (match[1] || 'image/jpeg').toLowerCase();
  const payload = match[3] || '';
  if (!payload) return null;

  let bytes;
  if (match[2]) {
    try {
      const binary = atob(payload);
      bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
      }
    } catch (error) {
      return null;
    }
  } else {
    bytes = new TextEncoder().encode(decodeURIComponent(payload));
  }

  return { mime, bytes };
};

const uploadImage = async (bucket, userId, name, dataUrl) => {
  if (!supabase || !storageUsable) return '';
  if (isHttpUrl(dataUrl)) return String(dataUrl);
  if (!userId || userId === 'guest') return '';

  const parsed = parseDataUrl(dataUrl);
  if (!parsed || !parsed.bytes.length) return '';
  if (parsed.bytes.length > MAX_IMAGE_BYTES) {
    throw new Error('That image is larger than 5 MB. Please choose a smaller photo.');
  }

  const path = `${safeSegment(userId)}/${safeSegment(name)}-${randomId()}.${extensionFor(parsed.mime)}`;
  const blob = new Blob([parsed.bytes], { type: parsed.mime });
  let uploadRes = await supabase.storage.from(bucket).upload(path, blob, {
    cacheControl: '31536000',
    contentType: parsed.mime,
    upsert: false,
  });

  if (uploadRes.error) {
    const message = String(uploadRes.error?.message || uploadRes.error || '').toLowerCase();
    if (
      uploadRes.error?.statusCode === 401 ||
      message.includes('401') ||
      message.includes('unauthorized') ||
      message.includes('exp') ||
      message.includes('jwt')
    ) {
      try {
        const { data } = await supabase.auth.refreshSession();
        if (data?.session) {
          uploadRes = await supabase.storage.from(bucket).upload(path, blob, {
            cacheControl: '31536000',
            contentType: parsed.mime,
            upsert: false,
          });
        }
      } catch (e) {}
    }
  }

  if (uploadRes.error) {
    const error = uploadRes.error;
    const message = String(error?.message || error || '').toLowerCase();
    if (
      error?.statusCode === '404' ||
      error?.statusCode === 404 ||
      message.includes('bucket') ||
      message.includes('not found')
    ) {
      markStorageUnusable();
    }
    throw error;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data?.publicUrl || '';
};

export const uploadMealImage = (userId, mealId, dataUrl) =>
  uploadImage(MEAL_BUCKET, userId, `meal-${mealId}`, dataUrl);

export const uploadAvatarImage = (userId, dataUrl) =>
  uploadImage(AVATAR_BUCKET, userId, 'avatar', dataUrl);

export const isStoredImage = (value) => isHttpUrl(value);

// Shrinks a meal photo before it is embedded in the meal row. History cards are
// small and the detail hero is 165px tall, so 720px on the long edge is plenty
// and keeps the JSON payload light.
export const compressImageDataUrl = (dataUrl, { maxSize = 720, quality = 0.66 } = {}) =>
  new Promise((resolve) => {
    const text = String(dataUrl || '');
    if (!text.startsWith('data:image/') || typeof document === 'undefined') {
      resolve(text);
      return;
    }

    const image = new Image();
    image.onload = () => {
      try {
        const width = image.naturalWidth || image.width;
        const height = image.naturalHeight || image.height;
        const scale = Math.min(1, maxSize / Math.max(width, height));
        if (scale >= 1 && text.length <= 180000) {
          resolve(text);
          return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        const context = canvas.getContext('2d');
        context.imageSmoothingQuality = 'high';
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const next = canvas.toDataURL('image/jpeg', quality);
        resolve(next.length < text.length ? next : text);
      } catch (error) {
        resolve(text);
      }
    };
    image.onerror = () => resolve(text);
    image.src = text;
  });

export const objectPathFromUrl = (url) => {
  const text = String(url || '');
  const index = text.indexOf(PUBLIC_SEGMENT);
  if (index === -1) return null;
  const rest = text.slice(index + PUBLIC_SEGMENT.length);
  const slash = rest.indexOf('/');
  if (slash <= 0) return null;
  return {
    bucket: rest.slice(0, slash),
    path: decodeURIComponent(rest.slice(slash + 1)),
  };
};

export const deleteStoredImage = async (url, userId) => {
  if (!supabase || !isHttpUrl(url)) return false;
  const target = objectPathFromUrl(url);
  if (!target) return false;
  // Never remove an object that lives outside this user's folder.
  if (userId && !target.path.startsWith(`${String(userId)}/`)) return false;
  const { error } = await supabase.storage.from(target.bucket).remove([target.path]);
  if (error) throw error;
  return true;
};
