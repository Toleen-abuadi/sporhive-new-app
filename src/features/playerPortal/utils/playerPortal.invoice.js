import { Linking, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const BASE64_TABLE =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const DEFAULT_FILE_NAME = 'invoice.pdf';
const DEFAULT_CONTENT_TYPE = 'application/pdf';
const BASE64_CHUNK_SIZE = 0x8000;

const debugInvoiceDownload = (stage, payload = {}) => {
  if (!__DEV__) return;
  try {
    console.log(`[invoice][download] ${stage}`, payload);
  } catch {
    // no-op
  }
};

const createInvoiceFileError = (code, message, details = null) => {
  const error = new Error(message);
  error.code = code;
  if (details != null) {
    error.details = details;
  }
  return error;
};

const normalizeDirectoryUri = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return raw.endsWith('/') ? raw : `${raw}/`;
};

const parseFileNameFromContentDisposition = (contentDisposition) => {
  const value = String(contentDisposition || '').trim();
  if (!value) return '';

  const utf8Match = value.match(/filename\*=UTF-8''([^;]+)/i);
  const basicMatch = value.match(/filename="?([^"]+)"?/i);
  const candidate = String(utf8Match?.[1] || basicMatch?.[1] || '').trim();
  if (!candidate) return '';

  try {
    return decodeURIComponent(candidate);
  } catch {
    return candidate;
  }
};

const normalizeFileName = (fileName) => {
  const value = String(fileName || DEFAULT_FILE_NAME).trim();
  if (!value) return DEFAULT_FILE_NAME;
  const cleanName = value.replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '');
  if (!cleanName) return DEFAULT_FILE_NAME;
  return cleanName.toLowerCase().endsWith('.pdf') ? cleanName : `${cleanName}.pdf`;
};

const ensureArrayBuffer = (value) => {
  if (value instanceof ArrayBuffer) return value;

  if (ArrayBuffer.isView(value)) {
    const view = value;
    return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength);
  }

  throw new Error('Invoice payload is invalid.');
};

const encodeBinaryStringToBase64 = (binary) => {
  let output = '';

  for (let index = 0; index < binary.length; index += 3) {
    const a = binary.charCodeAt(index);
    const b = index + 1 < binary.length ? binary.charCodeAt(index + 1) : 0;
    const c = index + 2 < binary.length ? binary.charCodeAt(index + 2) : 0;

    const triple = (a << 16) | (b << 8) | c;

    output += BASE64_TABLE[(triple >> 18) & 63];
    output += BASE64_TABLE[(triple >> 12) & 63];
    output += index + 1 < binary.length ? BASE64_TABLE[(triple >> 6) & 63] : '=';
    output += index + 2 < binary.length ? BASE64_TABLE[triple & 63] : '=';
  }

  return output;
};

const encodeBase64 = (input) => {
  const arrayBuffer = ensureArrayBuffer(input);
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';

  for (let index = 0; index < bytes.length; index += BASE64_CHUNK_SIZE) {
    const chunk = bytes.subarray(index, index + BASE64_CHUNK_SIZE);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }

  if (typeof btoa === 'function') {
    return btoa(binary);
  }

  return encodeBinaryStringToBase64(binary);
};

const createWebObjectUrl = (arrayBuffer, contentType) => {
  const blob = new Blob([arrayBuffer], {
    type: contentType || DEFAULT_CONTENT_TYPE,
  });
  return URL.createObjectURL(blob);
};

const ensureDirectoryAvailable = () => {
  const legacyCacheDirectory = normalizeDirectoryUri(FileSystem.cacheDirectory);
  const legacyDocumentDirectory = normalizeDirectoryUri(FileSystem.documentDirectory);
  const modernCacheDirectory = normalizeDirectoryUri(Paths?.cache?.uri);
  const modernDocumentDirectory = normalizeDirectoryUri(Paths?.document?.uri);

  const cacheDirectory = legacyCacheDirectory || modernCacheDirectory;
  const documentDirectory = legacyDocumentDirectory || modernDocumentDirectory;
  const chosenDirectory = cacheDirectory || documentDirectory || '';

  if (!chosenDirectory) {
    throw new Error('File storage is unavailable on this device.');
  }

  return chosenDirectory;
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
  contentDisposition = '',
} = {}) {
  const safeBuffer = ensureArrayBuffer(arrayBuffer);

  if (safeBuffer.byteLength === 0) {
    throw createInvoiceFileError('INVOICE_EMPTY', 'Invoice file is empty.');
  }

  const nameFromDisposition = parseFileNameFromContentDisposition(contentDisposition);
  const safeName = normalizeFileName(nameFromDisposition || fileName);
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
  const byteLength = safeBuffer.byteLength;


  await FileSystem.writeAsStringAsync(fileUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const fileInfo = await FileSystem.getInfoAsync(fileUri);

  const hasNumericSize = fileInfo?.size != null && Number.isFinite(Number(fileInfo.size));
  if (!fileInfo?.exists || (hasNumericSize && Number(fileInfo.size) <= 0)) {
    throw createInvoiceFileError('INVOICE_EMPTY', 'Invoice file is empty. Please try again.', {
      uri: fileUri,
      exists: Boolean(fileInfo?.exists),
      size: fileInfo?.size ?? null,
    });
  }

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
      mimeType: DEFAULT_CONTENT_TYPE,
      dialogTitle: docRef?.fileName || 'Invoice',
      UTI: 'com.adobe.pdf',
    });
    return true;
  }

  return false;
}

export async function downloadInvoiceDocument(docRef) {
  const uri = String(docRef?.uri || '').trim();
  if (!uri) {
    throw new Error('Invoice URI is missing.');
  }

  debugInvoiceDownload('platform', { platform: Platform.OS });

  if (Platform.OS === 'android') {
    const fileName = normalizeFileName(docRef?.fileName || DEFAULT_FILE_NAME);

    try {
      const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      debugInvoiceDownload('android-saf-permission', {
        granted: Boolean(permissions?.granted),
        directoryUri: permissions?.directoryUri || null,
      });

      if (!permissions?.granted || !permissions?.directoryUri) {
        throw createInvoiceFileError('STORAGE_PERMISSION_DENIED', 'Storage permission denied');
      }

      const sourceFileInfo = await FileSystem.getInfoAsync(uri);
      debugInvoiceDownload('source-file-info', {
        exists: Boolean(sourceFileInfo?.exists),
        size: sourceFileInfo?.size ?? null,
      });

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      debugInvoiceDownload('base64-length', { length: base64.length });

      const safFileUri = await FileSystem.StorageAccessFramework.createFileAsync(
        permissions.directoryUri,
        fileName,
        DEFAULT_CONTENT_TYPE
      );
      debugInvoiceDownload('saf-file-created', { safFileUri });

      await FileSystem.writeAsStringAsync(safFileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      debugInvoiceDownload('write-complete', { safFileUri });

      return {
        uri: safFileUri,
        fileName,
      };
    } catch (error) {
      if (String(error?.code || '').toUpperCase() === 'STORAGE_PERMISSION_DENIED') {
        throw error;
      }

      throw createInvoiceFileError('DOWNLOAD_FAILED', 'Failed to save invoice to device.', {
        message: String(error?.message || ''),
      });
    }
  }

  if (Platform.OS === 'ios') {
    await shareInvoiceDocument(docRef);
    return { uri };
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
