export function extractCompleteJsonString(source, targetKey) {
  if (typeof source !== 'string' || typeof targetKey !== 'string' || !targetKey) {
    return { status: 'invalid' };
  }

  function scanString(start) {
    let escaped = false;

    for (let index = start + 1; index < source.length; index++) {
      const char = source[index];

      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        return index;
      }
    }

    return -1;
  }

  function decodeString(start, end) {
    try {
      return JSON.parse(source.slice(start, end + 1));
    } catch {
      return null;
    }
  }

  let objectDepth = 0;

  for (let index = 0; index < source.length; index++) {
    if (source[index] === '{') {
      objectDepth++;
      continue;
    }
    if (source[index] === '}') {
      objectDepth = Math.max(0, objectDepth - 1);
      continue;
    }
    if (source[index] !== '"') continue;

    const keyEnd = scanString(index);
    if (keyEnd === -1) return { status: 'pending' };

    const decodedKey = decodeString(index, keyEnd);
    if (decodedKey === null) return { status: 'invalid' };

    let cursor = keyEnd + 1;
    while (cursor < source.length && /\s/.test(source[cursor])) cursor++;

    if (objectDepth === 1 && decodedKey === targetKey && source[cursor] === ':') {
      cursor++;
      while (cursor < source.length && /\s/.test(source[cursor])) cursor++;

      if (cursor >= source.length) return { status: 'pending' };
      if (source[cursor] !== '"') return { status: 'invalid' };

      const valueEnd = scanString(cursor);
      if (valueEnd === -1) return { status: 'pending' };

      const value = decodeString(cursor, valueEnd);
      return value === null
        ? { status: 'invalid' }
        : { status: 'complete', value };
    }

    index = keyEnd;
  }

  return { status: 'pending' };
}

if (typeof window !== 'undefined') {
  window.PrismStreamJson = { extractCompleteJsonString };
}
