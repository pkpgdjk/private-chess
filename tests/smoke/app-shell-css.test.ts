import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const globalsCssPath = fileURLToPath(new URL('../../app/globals.css', import.meta.url));

describe('app shell mobile styles', () => {
  it('keeps user identity visible in the mobile base layout', () => {
    const globalsCss = readFileSync(globalsCssPath, 'utf8');
    const appUserBaseRule = globalsCss.match(/\.app-user\s*{(?<body>[^}]*)}/)?.groups
      ?.body;

    expect(appUserBaseRule).toBeDefined();
    expect(appUserBaseRule).not.toMatch(/display\s*:\s*none/);
  });
});
