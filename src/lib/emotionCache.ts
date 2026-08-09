import createCache from '@emotion/cache';
import rtlPlugin from 'stylis-plugin-rtl';

export function createDirCache(dir: 'ltr' | 'rtl') {
  return createCache({
    key: dir === 'rtl' ? 'css-rtl' : 'css-ltr',
    stylisPlugins: dir === 'rtl' ? [rtlPlugin] : undefined,
  });
}
