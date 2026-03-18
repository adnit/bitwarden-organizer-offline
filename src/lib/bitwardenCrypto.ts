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
  
  // Bitwarden hashes the salt with SHA-256 before using it in Argon2id
  const saltBuffer = encoder.encode(salt);
  const saltHash = await crypto.subtle.digest('SHA-256', saltBuffer);

  return await argon2id({
    password: password,
    salt: new Uint8Array(saltHash),
    iterations: iterations,
    memorySize: memory * 1024, // Bitwarden export memory is in MB, hash-wasm expects KB
    parallelism: parallelism,
    hashLength: 32,
    outputType: 'binary',
  }) as Uint8Array;
}

/**
 * HKDF-Expand (RFC 5869)
 * Web Crypto API's HKDF always performs the Extract step. 
 * Bitwarden skips Extract for key stretching, so we implement Expand manually.
 */
async function hkdfExpand(prk: ArrayBuffer, info: string): Promise<ArrayBuffer> {
  const hmacKey = await crypto.subtle.importKey(
    'raw',
    prk,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const encoder = new TextEncoder();
  const infoBytes = encoder.encode(info);
  
  // Bitwarden stretches 32 bytes (256 bits). SHA-256 outputs 32 bytes.
  // Therefore, N=1, and we only need to compute T(1) = HMAC-SHA256(PRK, info | 0x01)
  const dataToSign = new Uint8Array(infoBytes.length + 1);
  dataToSign.set(infoBytes);
  dataToSign[infoBytes.length] = 0x01; // Append the counter 0x01
  
  return await crypto.subtle.sign('HMAC', hmacKey, dataToSign);
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
  const encKeyBuffer = await hkdfExpand(masterKey, 'enc');
  const macKeyBuffer = await hkdfExpand(masterKey, 'mac');

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
/**
 * Uint8Array to Base64 string
 */
function uint8ToB64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Encrypts data to AesCbc256_HmacSha256 (Type 2 cipher string)
 */
async function encryptAesCbc256_HmacSha256(
  plaintext: string,
  masterKey: ArrayBuffer
): Promise<string> {
  const encKeyBuffer = await hkdfExpand(masterKey, 'enc');
  const macKeyBuffer = await hkdfExpand(masterKey, 'mac');

  const iv = crypto.getRandomValues(new Uint8Array(16));
  
  const encKey = await crypto.subtle.importKey(
    'raw',
    encKeyBuffer,
    { name: 'AES-CBC' },
    false,
    ['encrypt']
  );

  const encoder = new TextEncoder();
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-CBC', iv: iv } as AesCbcParams,
    encKey,
    encoder.encode(plaintext)
  );
  
  const ciphertext = new Uint8Array(encryptedBuffer);

  const hmacKey = await crypto.subtle.importKey(
    'raw',
    macKeyBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const dataToSign = new Uint8Array(iv.length + ciphertext.length);
  dataToSign.set(iv);
  dataToSign.set(ciphertext, iv.length);

  const macBuffer = await crypto.subtle.sign('HMAC', hmacKey, dataToSign);
  const mac = new Uint8Array(macBuffer);

  // Format: 2.iv|ciphertext|mac
  return `2.${uint8ToB64(iv)}|${uint8ToB64(ciphertext)}|${uint8ToB64(mac)}`;
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
  } catch (err: any) {
    console.error('Decryption ERROR:', err.message || err);
    throw new Error(`Decryption failed: ${err.message || 'unknown error'}. Please check your master password.`);
  }
}

/**
 * Main vault encryption entry point
 * Generates Bitwarden password-protected encrypted format (PBKDF2/600000).
 */
export async function encryptVault(
  plaintextJson: string,
  password: string
) {
  // Use PBKDF2 for new exports, with OWASP recommended 600,000 iterations
  const kdfIterations = 600000;
  
  // Generate random 32-byte salt
  const saltBytes = crypto.getRandomValues(new Uint8Array(32));
  const salt = uint8ToB64(saltBytes);

  // Derive master key
  const masterKey = await derivePBKDF2(password, salt, kdfIterations);

  // Encrypt the main vault payload
  const encryptedData = await encryptAesCbc256_HmacSha256(plaintextJson, masterKey);

  // Encrypt a known string for password validation (standard Bitwarden practice)
  const validationRandom = await encryptAesCbc256_HmacSha256('bitwarden-organizer-offline', masterKey);

  return {
    encrypted: true,
    passwordProtected: true,
    kdfType: 0, // PBKDF2
    kdfIterations,
    salt,
    data: encryptedData,
    encKeyValidation_DO_NOT_EDIT: validationRandom,
  };
}
