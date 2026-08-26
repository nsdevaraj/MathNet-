export const DEFAULT_CORPUS_IMAGE_BASE_URL =
  'https://raw.githubusercontent.com/nsdevaraj/MathNet-/main/public/';

export const resolveCorpusAssetUrl = (source: string, baseUrl: string): string => {
  const normalizedSource = source.startsWith('/') ? source.slice(1) : source;
  if (!normalizedSource.startsWith('images/')) return source;

  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return new URL(normalizedSource, normalizedBaseUrl).toString();
};