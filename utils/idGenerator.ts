
// Custom Alphabet: Removed 0, O, I, L, 1 to prevent confusion
const NANO_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/**
 * Generates a custom NanoID.
 * @param size Length of the ID (default 6)
 * @returns Random string
 */
export const generateNanoID = (size: number = 6): string => {
  let res = '';
  const values = new Uint8Array(size);
  window.crypto.getRandomValues(values);
  for (let i = 0; i < size; i++) {
    res += NANO_ALPHABET[values[i] % NANO_ALPHABET.length];
  }
  return res;
};

/**
 * Generates a UUID v7-compatible string.
 * Structure: [Unix Timestamp in Hex (12 chars)]-[Random Hex (4 chars)]-[Random Hex (4 chars)]-[Random Hex (12 chars)]
 * This ensures items are naturally sorted by time when sorted by ID.
 */
export const generateUUIDv7 = (): string => {
  const timestamp = Date.now().toString(16).padStart(12, '0');
  
  const randomHex = (length: number) => {
    const values = new Uint8Array(Math.ceil(length / 2));
    window.crypto.getRandomValues(values);
    return Array.from(values)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .substring(0, length);
  };

  return `${timestamp}-${randomHex(4)}-${randomHex(4)}-${randomHex(12)}`;
};

/**
 * Helper to ensure uniqueness against an existing array
 */
export const generateUniqueNanoID = <T>(
  existingItems: T[],
  checkFn: (item: T, id: string) => boolean,
  size: number = 6,
  prefix: string = ''
): string => {
  let id = '';
  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 50) {
    id = prefix + generateNanoID(size);
    // eslint-disable-next-line no-loop-func
    isUnique = !existingItems.some(item => checkFn(item, id));
    attempts++;
  }

  if (!isUnique) {
    // Fallback to timestamp if we somehow fail collision check (highly unlikely)
    return `${prefix}${Date.now().toString(36).toUpperCase()}`;
  }

  return id;
};
