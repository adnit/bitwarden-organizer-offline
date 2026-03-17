import { argon2id } from 'hash-wasm';

/**
 * Parses a Bitwarden cipherstring (e.g., "1.iv|ciphertext|mac")
 */
export function parseCipherstring(cipherText: string) {
  const [typeStr, rest] = cipherText.split('.');
  if (!rest) throw new Error('Invalid cipherstring format: missing type');
  
  const type = parseInt(typeStr, 10);
  const parts = rest.split('|');
  
  if (parts.length < 2) throw new Error('Invalid cipherstring format: missing parts');
  
  return {
    type,
    iv: parts[0],
    ciphertext: parts[1],
    mac: parts[2] || null,
  };
}

/**
 * Base64 string to Uint8Array
 */
function b64ToUint8(b64: string): Uint8Array {
  const binaryString = window.atob(b64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Derives a key using PBKDF2 (Web Crypto API)
 */
async function derivePBKDF2(password: string, salt: string, iterations: number): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);
  const saltData = encoder.encode(salt);

  const baseKey = await crypto.subtle.importKey(
    'raw',
    passwordData,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltData,
      iterations: iterations,
      hash: 'SHA-256'
    },
    baseKey,
    256 // Derive 256 bits (32 bytes)
  );
}

/**
 * Derives a key using Argon2id (hash-wasm)
 */
async function deriveArgon2id(
  password: string,
  salt: string,
  iterations: number,
  memory: number,
  parallelism: number
): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  return await argon2id({
    password: password,
    salt: encoder.encode(salt),
    iterations: iterations,
    memorySize: memory, // memory is already in KB from Bitwarden export
    parallelism: parallelism,
    hashLength: 32,
    outputType: 'binary',
  }) as Uint8Array;
}

/**
 * Derives a sub-key using HKDF (Web Crypto API)
 */
async function deriveHKDF(masterKey: ArrayBuffer, info: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    masterKey,
    'HKDF',
    false,
    ['deriveBits']
  );

  return await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(0),
      info: encoder.encode(info)
    },
    baseKey,
    256
  );
}

/**
 * Decrypts AesCbc256_HmacSha256 (Type 1)
 */
async function decryptAesCbc256_HmacSha256(
  ivB64: string,
  ciphertextB64: string,
  macB64: string | null,
  masterKey: ArrayBuffer
): Promise<string> {
  const iv = b64ToUint8(ivB64);
  const ciphertext = b64ToUint8(ciphertextB64);
  
  // Expand Master Key into Encryption Key and MAC Key
  const encKeyBuffer = await deriveHKDF(masterKey, 'enc');
  const macKeyBuffer = await deriveHKDF(masterKey, 'mac');

  // Verify MAC if present
  if (macB64) {
    const mac = b64ToUint8(macB64);
    const hmacKey = await crypto.subtle.importKey(
      'raw',
      macKeyBuffer,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    // Bitwarden Type 1 MAC is calculated over IV + Ciphertext
    const dataToVerify = new Uint8Array(iv.length + ciphertext.length);
    dataToVerify.set(iv);
    dataToVerify.set(ciphertext, iv.length);

    const isValid = await crypto.subtle.verify(
      'HMAC',
      hmacKey,
      mac as any,
      dataToVerify as any
    );

    if (!isValid) {
      throw new Error('MAC verification failed');
    }
  }
  
  const encKey = await crypto.subtle.importKey(
    'raw',
    encKeyBuffer,
    { name: 'AES-CBC' },
    false,
    ['decrypt']
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-CBC', iv: iv } as AesCbcParams,
    encKey,
    ciphertext as any
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * Main vault decryption entry point
 */
export async function decryptVault(
  encryptedData: string,
  password: string,
  kdfType: number,
  kdfIterations: number,
  kdfMemory: number,
  kdfParallelism: number,
  salt: string
): Promise<string> {
  let masterKey: ArrayBuffer;

  if (kdfType === 0) {
    // PBKDF2
    masterKey = await derivePBKDF2(password, salt, kdfIterations);
  } else if (kdfType === 1) {
    // Argon2id
    const hash = await deriveArgon2id(password, salt, kdfIterations, kdfMemory, kdfParallelism);
    masterKey = hash.buffer as ArrayBuffer;
  } else {
    throw new Error(`Unsupported KDF type: ${kdfType}`);
  }

  const cipher = parseCipherstring(encryptedData);
  
  try {
    return await decryptAesCbc256_HmacSha256(cipher.iv, cipher.ciphertext, cipher.mac, masterKey);
  } catch (err) {
    throw new Error('Decryption failed. Please check your master password.');
  }
}
