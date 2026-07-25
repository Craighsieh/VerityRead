/** Simple stable fingerprint for source block ids (non-crypto, local only). */
export function fingerprintText(text: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim().slice(0, 200);
  let hash = 2166136261;
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function buildSourceBlockId(locator: string, fingerprint: string): string {
  return `sb_${fingerprint}_${locator.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40)}`;
}

export function cssPath(el: Element): string {
  const parts: string[] = [];
  let current: Element | null = el;
  while (current && current.nodeType === Node.ELEMENT_NODE && parts.length < 8) {
    let part = current.tagName.toLowerCase();
    if (current.id) {
      part += `#${CSS.escape(current.id)}`;
      parts.unshift(part);
      break;
    }
    const parent: Element | null = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (c) => c.tagName === current!.tagName,
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        part += `:nth-of-type(${index})`;
      }
    }
    parts.unshift(part);
    current = parent;
  }
  return parts.join(' > ');
}
