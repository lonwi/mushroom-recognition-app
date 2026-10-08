import * as tf from '@tensorflow/tfjs';
import type { Platform } from '@tensorflow/tfjs-core/dist/platforms/platform';

/**
 * Platform implementation for React Native / Hermes engine.
 * Solves the known "Cannot read property 'isTypedArray' of undefined" error
 * where Hermes does not identify as browser (no window.document) or Node (no process.versions.node).
 */
export class PlatformReactNative implements Platform {
  fetch(path: string, requestInits?: RequestInit): Promise<Response> {
    return fetch(path, requestInits);
  }

  now(): number {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
      return performance.now();
    }
    return Date.now();
  }

  encode(text: string, encoding: string = 'utf-8'): Uint8Array {
    if (typeof TextEncoder !== 'undefined') {
      return new TextEncoder().encode(text);
    }
    const bytes = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i++) {
      bytes[i] = text.charCodeAt(i) & 0xff;
    }
    return bytes;
  }

  decode(bytes: Uint8Array, encoding: string = 'utf-8'): string {
    if (typeof TextDecoder !== 'undefined') {
      return new TextDecoder(encoding).decode(bytes);
    }
    let res = '';
    for (let i = 0; i < bytes.length; i++) {
      res += String.fromCharCode(bytes[i]);
    }
    return res;
  }

  isTypedArray(a: unknown): a is Float32Array | Int32Array | Uint8Array | Uint8ClampedArray {
    return (
      a instanceof Float32Array ||
      a instanceof Int32Array ||
      a instanceof Uint8Array ||
      a instanceof Uint8ClampedArray
    );
  }
}

/**
 * Ensures TensorFlow.js has a valid Platform registered in Hermes/React Native.
 */
export function ensureTensorFlowPlatform(): void {
  try {
    const currentEnv = tf.env();
    if (!currentEnv.platform) {
      currentEnv.setPlatform('react-native', new PlatformReactNative());
    }
  } catch (err) {
    // Platform may already be registered
  }
}
