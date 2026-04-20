import { describe, it, expect } from 'vitest';
import { splitText, retry, delay } from '../src/utils.js';

describe('splitText', () => {
  it('returns single chunk for short text', () => {
    expect(splitText('hello', 100)).toEqual(['hello']);
  });

  it('splits on double newline when possible', () => {
    const text = 'part one\n\npart two';
    const chunks = splitText(text, 12);
    expect(chunks).toEqual(['part one', 'part two']);
  });

  it('splits on single newline as fallback', () => {
    const text = 'line one\nline two\nline three';
    const chunks = splitText(text, 18);
    expect(chunks[0]).toBe('line one\nline two');
    expect(chunks[1]).toBe('line three');
  });

  it('splits on space as second fallback', () => {
    const text = 'word1 word2 word3 word4';
    const chunks = splitText(text, 12);
    expect(chunks[0]).toBe('word1 word2');
    expect(chunks[1]).toBe('word3 word4');
  });

  it('force-splits when no separator found', () => {
    const text = 'abcdefghijklmnop';
    const chunks = splitText(text, 5);
    expect(chunks).toEqual(['abcde', 'fghij', 'klmno', 'p']);
  });

  it('handles empty string', () => {
    expect(splitText('', 100)).toEqual(['']);
  });

  it('handles exact max length', () => {
    expect(splitText('12345', 5)).toEqual(['12345']);
  });
});

describe('retry', () => {
  it('returns result on first success', async () => {
    const result = await retry(() => 'ok', { maxAttempts: 3, delayMs: 1 });
    expect(result).toBe('ok');
  });

  it('retries on failure and eventually succeeds', async () => {
    let attempt = 0;
    const result = await retry(() => {
      attempt++;
      if (attempt < 3) throw new Error('fail');
      return 'ok';
    }, { maxAttempts: 3, delayMs: 1 });
    expect(result).toBe('ok');
    expect(attempt).toBe(3);
  });

  it('throws after max attempts exhausted', async () => {
    await expect(
      retry(() => { throw new Error('always fails'); }, { maxAttempts: 2, delayMs: 1 })
    ).rejects.toThrow('always fails');
  });
});

describe('delay', () => {
  it('resolves after specified ms', async () => {
    const start = Date.now();
    await delay(50);
    expect(Date.now() - start).toBeGreaterThanOrEqual(40);
  });
});
