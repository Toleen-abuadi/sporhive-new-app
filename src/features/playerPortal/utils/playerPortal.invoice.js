import { Linking, Platform, Share } from 'react-native';

const BASE64_TABLE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const normalizeFileName = (fileName) => {
  const value = String(fileName || 'invoice.pdf').trim();
  if (!value) return 'invoice.pdf';
  return value.replace(/[^\w.-]+/g, '_');
};

const encodeBase64 = (arrayBuffer) => {
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
  const blob = new Blob([arrayBuffer], { type: contentType || 'application/pdf' });
  return URL.createObjectURL(blob);
};

export async function createInvoiceDocument({
  arrayBuffer,
  fileName = 'invoice.pdf',
  contentType = 'application/pdf',
} = {}) {
  if (!(arrayBuffer instanceof ArrayBuffer)) {
    throw new Error('Invoice payload is invalid.');
  }

  const safeName = normalizeFileName(fileName);

  if (Platform.OS === 'web') {
    const objectUrl = createWebObjectUrl(arrayBuffer, contentType);
    return {
      uri: objectUrl,
      fileName: safeName,
      contentType,
      isWebObjectUrl: true,
    };
  }

  const base64 = encodeBase64(arrayBuffer);
  return {
    uri: `data:${contentType};base64,${base64}`,
    fileName: safeName,
    contentType,
    isWebObjectUrl: false,
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
  link.download = normalizeFileName(docRef?.fileName || 'invoice.pdf');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function revokeInvoiceDocument(documentRef) {
  if (Platform.OS !== 'web') return;
  if (!documentRef?.isWebObjectUrl) return;
  const uri = String(documentRef?.uri || '').trim();
  if (!uri) return;

  try {
    URL.revokeObjectURL(uri);
  } catch {
    // no-op
  }
}
