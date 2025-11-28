
// Utilities for client-side encryption using Web Crypto API

export const generateSalt = (): string => {
  const array = new Uint8Array(16);
  window.crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
};

export const generateDataKey = async (): Promise<CryptoKey> => {
  return window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
};

export const deriveKeyFromPassword = async (password: string, salt: string): Promise<CryptoKey> => {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const saltBuffer = Uint8Array.from(atob(salt), c => c.charCodeAt(0));

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
  );
};

export const exportKey = async (key: CryptoKey): Promise<string> => {
  const exported = await window.crypto.subtle.exportKey('raw', key);
  return btoa(String.fromCharCode(...new Uint8Array(exported)));
};

export const importKey = async (base64Key: string): Promise<CryptoKey> => {
  const raw = Uint8Array.from(atob(base64Key), c => c.charCodeAt(0));
  return window.crypto.subtle.importKey(
    'raw',
    raw,
    { name: 'AES-GCM' },
    true,
    ['encrypt', 'decrypt']
  );
};

// Wraps (encrypts) the Data Key using the User's Derived Key (Key Encryption Key)
export const wrapKey = async (keyToWrap: CryptoKey, wrappingKey: CryptoKey): Promise<string> => {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const wrapped = await window.crypto.subtle.wrapKey(
    'raw',
    keyToWrap,
    wrappingKey,
    { name: 'AES-GCM', iv }
  );
  
  const wrappedBytes = new Uint8Array(wrapped);
  const combined = new Uint8Array(iv.length + wrappedBytes.length);
  combined.set(iv);
  combined.set(wrappedBytes, iv.length);
  
  return btoa(String.fromCharCode(...combined));
};

// Unwraps (decrypts) the Data Key
export const unwrapKey = async (wrappedKeyStr: string, unwrappingKey: CryptoKey): Promise<CryptoKey> => {
  const raw = Uint8Array.from(atob(wrappedKeyStr), c => c.charCodeAt(0));
  const iv = raw.slice(0, 12);
  const ciphertext = raw.slice(12);

  return window.crypto.subtle.unwrapKey(
    'raw',
    ciphertext,
    unwrappingKey,
    { name: 'AES-GCM', iv },
    { name: 'AES-GCM' },
    true,
    ['encrypt', 'decrypt']
  );
};

const ENC_PREFIX = '__ENC__:';

export const encryptData = async (data: any, key: CryptoKey): Promise<string> => {
  if (data === null || data === undefined) return data;
  
  const enc = new TextEncoder();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const json = JSON.stringify(data);
  
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(json)
  );

  const cipherBytes = new Uint8Array(ciphertext);
  const combined = new Uint8Array(iv.length + cipherBytes.length);
  combined.set(iv);
  combined.set(cipherBytes, iv.length);

  return ENC_PREFIX + btoa(String.fromCharCode(...combined));
};

export const decryptData = async (encryptedStr: string, key: CryptoKey): Promise<any> => {
  if (typeof encryptedStr !== 'string' || !encryptedStr.startsWith(ENC_PREFIX)) {
    return encryptedStr; // Return as-is if not encrypted (migration path)
  }

  try {
    const raw = Uint8Array.from(atob(encryptedStr.slice(ENC_PREFIX.length)), c => c.charCodeAt(0));
    const iv = raw.slice(0, 12);
    const ciphertext = raw.slice(12);

    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );

    const dec = new TextDecoder();
    return JSON.parse(dec.decode(decrypted));
  } catch (e) {
    console.error('Decryption failed:', e);
    return null; // Or return original string?
  }
};

export const hashPassword = async (password: string, salt: string = ''): Promise<string> => {
  const enc = new TextEncoder();
  const passwordBuffer = enc.encode(password);
  let dataToHash = passwordBuffer;

  if (salt) {
    try {
        const saltBuffer = Uint8Array.from(atob(salt), c => c.charCodeAt(0));
        const combined = new Uint8Array(saltBuffer.length + passwordBuffer.length);
        combined.set(saltBuffer);
        combined.set(passwordBuffer, saltBuffer.length);
        dataToHash = combined;
    } catch (e) {
        console.warn("Invalid salt provided to hashPassword, proceeding with unsalted hash");
    }
  }

  const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataToHash);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};
