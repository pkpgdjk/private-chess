import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { SettingsPanel } from '@/components/web/settings/SettingsPanel';
import { defaultSettings } from '@/constants/settings';

describe('SettingsPanel', () => {
  it('renders useful controls without provider secret fields', () => {
    const markup = renderToStaticMarkup(
      <SettingsPanel
        error={null}
        isLoading={false}
        onPatch={vi.fn()}
        settings={defaultSettings}
      />,
    );

    expect(markup).toContain('Player color');
    expect(markup).toContain('Bot strength');
    expect(markup).toContain('Move time');
    expect(markup).toContain('Provider');
    expect(markup).toContain('Model');
    expect(markup).toContain('Effort');
    expect(markup).toContain('Legal move overlay');
    expect(markup).toContain('Critical moments only');
    expect(markup.toLowerCase()).not.toContain('api key');
    expect(markup.toLowerCase()).not.toContain('secret');
  });
});
