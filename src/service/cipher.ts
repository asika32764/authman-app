import { concatUnit8 } from '@/utilities/arr';
import { base64UrlEncode, uint82text, wrapUint8 } from '@/utilities/convert';
import { hashHkdf, hashPbkdf2 } from '@/utilities/crypto';
import { timingSafeEquals } from '@windwalker-io/srp';
import { uint8ToHex } from 'bigint-toolkit';
import sodium from 'libsodium-wrappers-sumo';

class SodiumCipher {
  SALT_SIZE = 16;
  HKDF_SIZE = 32;

  get HMAC_SIZE() {
    return sodium.crypto_auth_BYTES;
  }

  get NONCE_SIZE() {
    return sodium.crypto_secretbox_NONCEBYTES;
  }

  async encrypt(str: Uint8Array | string, key: Uint8Array | string) {
    await sodium.ready;

    str = wrapUint8(str);
    key = wrapUint8(key);

    const nonce = sodium.randombytes_buf(this.NONCE_SIZE);
    const salt = sodium.randombytes_buf(this.SALT_SIZE);
    const encKey = await this.deriveSubKey(key, 'Enc', salt);
    const hmacKey = await this.deriveSubKey(key, 'Auth', salt);

    const enc = sodium.crypto_secretbox_easy(str, nonce, encKey);

    const hmac = await this.auth(concatUnit8(nonce, salt, enc), hmacKey);

    return concatUnit8(nonce, salt, enc, hmac);
  }

  async decrypt(str: Uint8Array | string, key: Uint8Array | string) {
    await sodium.ready;

    str = wrapUint8(str);
    key = wrapUint8(key);

    let current = 0;
    const nonce = str.slice(0, current += this.NONCE_SIZE);
    const salt = str.slice(current, current += this.SALT_SIZE);
    const encrypted = str.slice(
      current,
      current += (str.length - (this.NONCE_SIZE + this.SALT_SIZE + this.HMAC_SIZE))
    );

    const hmac = str.slice(current);

    const encKey = await this.deriveSubKey(key, 'Enc', salt);
    const hmacKey = await this.deriveSubKey(key, 'Auth', salt);

    sodium.memzero(str);

    if (!sodium.crypto_auth_verify(hmac, concatUnit8(nonce, salt, encrypted), hmacKey)) {
      throw new Error('\'Invalid message authentication code');
    }

    const plaintext = sodium.crypto_secretbox_open_easy(encrypted, nonce, encKey);

    sodium.memzero(encrypted);
    sodium.memzero(nonce);

    return plaintext;
  }

  async auth(
    message: Uint8Array | string,
    key: Uint8Array | string
  ) {
    await sodium.ready;

    message = wrapUint8(message);
    key = wrapUint8(key);

    return sodium.crypto_auth(
      message,
      key,
    );
  }

  deriveSubKey(
    key: Uint8Array | string,
    info: Uint8Array | string = '',
    salt: Uint8Array | string = ''
  ) {
    return hashHkdf('SHA-256', key, this.HKDF_SIZE, info, salt);
  }
}

export const sodiumCipher = new SodiumCipher();
