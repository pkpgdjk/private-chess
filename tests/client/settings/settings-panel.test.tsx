import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactElement, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import {
  getCoachModelNormalizationPatch,
  SettingsPanel,
} from '@/components/web/settings/SettingsPanel';
import { defaultSettings } from '@/constants/settings';
import type { Settings } from '@/types/chess';

function normalizeNode(node: ReactNode): ReactNode {
  if (!node || typeof node !== 'object' || !('type' in node)) {
    return node;
  }

  const element = node as ReactElement<Record<string, unknown>>;

  if (typeof element.type !== 'function') {
    return {
      ...element,
      props: {
        ...element.props,
        children: normalizeNode(element.props.children as ReactNode),
      },
    };
  }

  const Component = element.type as (
    props: Record<string, unknown>,
  ) => ReactNode;

  return normalizeNode(Component(element.props));
}

function flattenNodes(node: ReactNode): ReactElement<Record<string, unknown>>[] {
  if (Array.isArray(node)) {
    return node.flatMap((child) => flattenNodes(child));
  }

  if (!node || typeof node !== 'object' || !('type' in node)) {
    return [];
  }

  const element = normalizeNode(node) as ReactElement<Record<string, unknown>>;
  const children = element.props.children as ReactNode;

  return [element, ...flattenNodes(children)];
}

function textContent(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map((child) => textContent(child)).join('');
  }

  if (!node || typeof node !== 'object' || !('type' in node)) {
    return '';
  }

  const element = normalizeNode(node) as ReactElement<Record<string, unknown>>;

  return textContent(element.props.children as ReactNode);
}

function renderPanel(settings: Settings, onPatch = vi.fn()) {
  const element = (
    <SettingsPanel
      error={null}
      isLoading={false}
      onPatch={onPatch}
      settings={settings}
    />
  );

  return {
    nodes: flattenNodes(element),
    onPatch,
  };
}

function findElement(
  nodes: ReactElement<Record<string, unknown>>[],
  type: string,
  text: string,
) {
  const element = nodes.find(
    (node) => node.type === type && textContent(node).includes(text),
  );

  if (!element) {
    throw new Error(`Could not find ${type} with text "${text}"`);
  }

  return element;
}

function findLabeledSelect(
  nodes: ReactElement<Record<string, unknown>>[],
  label: string,
) {
  const field = findElement(nodes, 'label', label);
  const select = flattenNodes(field).find((node) => node.type === 'select');

  if (!select) {
    throw new Error(`Could not find select for "${label}"`);
  }

  return select;
}

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

  it('calls onPatch when controls change', () => {
    const { nodes, onPatch } = renderPanel(defaultSettings);
    const blackButton = findElement(nodes, 'button', 'Black');
    const legalMoveToggle = findElement(nodes, 'label', 'Legal move overlay');
    const providerSelect = findLabeledSelect(nodes, 'Provider');

    (blackButton.props.onClick as () => void)();
    (
      flattenNodes(legalMoveToggle).find((node) => node.type === 'input')?.props
        .onChange as (event: { currentTarget: { checked: boolean } }) => void
    )({ currentTarget: { checked: false } });
    (providerSelect.props.onChange as (event: {
      currentTarget: { value: string };
    }) => void)({ currentTarget: { value: 'openai' } });

    expect(onPatch).toHaveBeenCalledWith({ playerColor: 'b' });
    expect(onPatch).toHaveBeenCalledWith({ legalMoveOverlay: false });
    expect(onPatch).toHaveBeenCalledWith({
      coachProvider: 'openai',
      coachModel: 'gpt-mini',
    });
  });

  it('changes model options by provider', () => {
    const anthropicMarkup = renderToStaticMarkup(
      <SettingsPanel
        error={null}
        isLoading={false}
        onPatch={vi.fn()}
        settings={{ ...defaultSettings, coachProvider: 'anthropic' }}
      />,
    );
    const openaiMarkup = renderToStaticMarkup(
      <SettingsPanel
        error={null}
        isLoading={false}
        onPatch={vi.fn()}
        settings={{
          ...defaultSettings,
          coachProvider: 'openai',
          coachModel: 'gpt-mini',
        }}
      />,
    );

    expect(anthropicMarkup).toContain('Haiku');
    expect(anthropicMarkup).toContain('Sonnet');
    expect(anthropicMarkup).not.toContain('GPT mini');
    expect(openaiMarkup).toContain('GPT mini');
    expect(openaiMarkup).toContain('GPT');
    expect(openaiMarkup).not.toContain('Haiku');
  });

  it('returns a normalization patch for mismatched provider and model state', () => {
    expect(
      getCoachModelNormalizationPatch({
        ...defaultSettings,
        coachProvider: 'openai',
        coachModel: 'haiku',
      }),
    ).toEqual({ coachModel: 'gpt-mini' });
    expect(getCoachModelNormalizationPatch(defaultSettings)).toBeNull();
  });
});
