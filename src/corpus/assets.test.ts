import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveCorpusAssetUrl } from './assets.js';

const imageBaseUrl = 'https://raw.githubusercontent.com/nsdevaraj/MathNet-/main/public/';

test('resolves corpus image paths against the configured image host', () => {
  assert.equal(
    resolveCorpusAssetUrl('images/obm-2009_p17_data_2accbda8df.png', imageBaseUrl),
    `${imageBaseUrl}images/obm-2009_p17_data_2accbda8df.png`,
  );
  assert.equal(
    resolveCorpusAssetUrl('/images/obm-2009_p17_data_2accbda8df.png', imageBaseUrl),
    `${imageBaseUrl}images/obm-2009_p17_data_2accbda8df.png`,
  );
});

test('leaves external and embedded image URLs unchanged', () => {
  assert.equal(
    resolveCorpusAssetUrl('https://example.com/diagram.png', imageBaseUrl),
    'https://example.com/diagram.png',
  );
  assert.equal(resolveCorpusAssetUrl('data:image/png;base64,AA==', imageBaseUrl), 'data:image/png;base64,AA==');
});