export function splitText(text, maxLen) {
  if (text.length <= maxLen) return [text];

  const chunks = [];
  let remaining = text;

  while (remaining.length > maxLen) {
    let splitAt = -1;
    const slice = remaining.slice(0, maxLen);

    const dblNewline = slice.lastIndexOf('\n\n');
    if (dblNewline > 0) {
      splitAt = dblNewline;
    } else {
      const newline = slice.lastIndexOf('\n');
      if (newline > 0) {
        splitAt = newline;
      } else {
        const space = slice.lastIndexOf(' ');
        if (space > 0) {
          splitAt = space;
        } else {
          splitAt = maxLen;
        }
      }
    }

    chunks.push(remaining.slice(0, splitAt).trimEnd());
    remaining = remaining.slice(splitAt).trimStart();
  }

  if (remaining.length > 0) chunks.push(remaining);
  return chunks;
}

export async function retry(fn, { maxAttempts = 3, delayMs = 1000 } = {}) {
  let lastError;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < maxAttempts - 1) await delay(delayMs * (i + 1));
    }
  }
  throw lastError;
}

export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
