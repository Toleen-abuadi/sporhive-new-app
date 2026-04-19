import { Linking, Platform, Share } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const BASE64_TABLE =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const DEFAULT_FILE_NAME = 'invoice.pdf';
const DEFAULT_CONTENT_TYPE = 'application/pdf';

const normalizeFileName = (fileName) => {
  const value = String(fileName || DEFAULT_FILE_NAME).trim();
  if (!value) return DEFAULT_FILE_NAME;
  return value.replace(/[^\w.-]+/g, '_');
};

const ensureArrayBuffer = (value) => {
  if (value instanceof ArrayBuffer) return value;

  if (ArrayBuffer.isView(value)) {
    const view = value;
    return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength);
  }

  throw new Error('Invoice payload is invalid.');
};

const encodeBase64 = (input) => {
  const arrayBuffer = ensureArrayBuffer(input);
  const bytes = new Uint8Array(arrayBuffer);
  let output = '';

  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index];
    const b = index + 1 < bytes.length ? bytes[index + 1] : 0;
    const c = index + 2 < bytes.length ? bytes[index + 2] : 0;

    const triple = (a << 16) | (b << 8) | c;

    output += BASE64_TABLE[(triple >> 18) & 63];
    output += BASE64_TABLE[(triple >> 12) & 63];
    output += index + 1 < bytes.length ? BASE64_TABLE[(triple >> 6) & 63] : '=';
    output += index + 2 < bytes.length ? BASE64_TABLE[triple & 63] : '=';
  }

  return output;
};

const createWebObjectUrl = (arrayBuffer, contentType) => {
  const blob = new Blob([arrayBuffer], {
    type: contentType || DEFAULT_CONTENT_TYPE,
  });
  return URL.createObjectURL(blob);
};

const ensureDirectoryAvailable = () => {
  const baseDir =
    FileSystem.cacheDirectory || FileSystem.documentDirectory || null;

  if (!baseDir) {
    throw new Error('File storage is unavailable on this device.');
  }

  return baseDir.endsWith('/') ? baseDir : `${baseDir}/`;
};

const buildNativeFileUri = (fileName) => {
  const baseDir = ensureDirectoryAvailable();
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${baseDir}${stamp}-${normalizeFileName(fileName)}`;
};

export async function createInvoiceDocument({
  arrayBuffer,
  fileName = DEFAULT_FILE_NAME,
  contentType = DEFAULT_CONTENT_TYPE,
} = {}) {
  const safeBuffer = ensureArrayBuffer(arrayBuffer);

  if (safeBuffer.byteLength === 0) {
    throw new Error('Invoice file is empty.');
  }

  const safeName = normalizeFileName(fileName);
  const safeType = String(contentType || DEFAULT_CONTENT_TYPE).trim() || DEFAULT_CONTENT_TYPE;

  if (Platform.OS === 'web') {
    const objectUrl = createWebObjectUrl(safeBuffer, safeType);
    return {
      uri: objectUrl,
      fileName: safeName,
      contentType: safeType,
      isWebObjectUrl: true,
      isNativeFile: false,
    };
  }

  const fileUri = buildNativeFileUri(safeName);
  const base64 = encodeBase64(safeBuffer);

  await FileSystem.writeAsStringAsync(fileUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return {
    uri: fileUri,
    fileName: safeName,
    contentType: safeType,
    isWebObjectUrl: false,
    isNativeFile: true,
  };
}

export async function openInvoiceDocument(docRef) {
  const uri = String(docRef?.uri || '').trim();
  if (!uri) {
    throw new Error('Invoice URI is missing.');
  }

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && typeof window.open === 'function') {
      window.open(uri, '_blank', 'noopener,noreferrer');
      return;
    }
    throw new Error('Unable to open invoice on this browser.');
  }

  const canOpen = await Linking.canOpenURL(uri);
  if (!canOpen) {
    throw new Error('No application can open this invoice file.');
  }

  await Linking.openURL(uri);
}

export async function shareInvoiceDocument(docRef, { message = '' } = {}) {
  const uri = String(docRef?.uri || '').trim();
  if (!uri) {
    throw new Error('Invoice URI is missing.');
  }

  if (Platform.OS === 'web') {
    await downloadInvoiceDocument(docRef);
    return;
  }

  const sharingAvailable = await Sharing.isAvailableAsync();
  if (sharingAvailable) {
    await Sharing.shareAsync(uri, {
      mimeType: docRef?.contentType || DEFAULT_CONTENT_TYPE,
      dialogTitle: docRef?.fileName || 'Invoice',
      UTI: 'com.adobe.pdf',
    });
    return;
  }

  await Share.share({
    url: uri,
    message: message || undefined,
    title: docRef?.fileName || 'Invoice',
  });
}

export async function downloadInvoiceDocument(docRef) {
  const uri = String(docRef?.uri || '').trim();
  if (!uri) {
    throw new Error('Invoice URI is missing.');
  }

  if (Platform.OS !== 'web') {
    await shareInvoiceDocument(docRef);
    return;
  }

  if (typeof document === 'undefined') {
    throw new Error('Document API is unavailable.');
  }

  const link = document.createElement('a');
  link.href = uri;
  link.download = normalizeFileName(docRef?.fileName || DEFAULT_FILE_NAME);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function deleteInvoiceDocument(docRef) {
  if (Platform.OS === 'web') return;
  if (!docRef?.isNativeFile) return;

  const uri = String(docRef?.uri || '').trim();
  if (!uri) return;

  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    }
  } catch {
    // no-op
  }
}

export function revokeInvoiceDocument(documentRef) {
  if (Platform.OS === 'web') {
    if (!documentRef?.isWebObjectUrl) return;
    const uri = String(documentRef?.uri || '').trim();
    if (!uri) return;

    try {
      URL.revokeObjectURL(uri);
    } catch {
      // no-op
    }
  }
}