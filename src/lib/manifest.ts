import { parse } from 'yaml';

import type { PublicationManifest } from '../types/publication';

const OUTPUTS = new Set(['print', 'epub', 'webpub', 'project-zip']);

export function parsePublicationManifest(source: string): PublicationManifest {
  const value = parse(source) as Partial<PublicationManifest> | null;

  if (!value || typeof value !== 'object') {
    throw new Error('publication.yml must contain a YAML object.');
  }
  if (value.version !== 1) {
    throw new Error('publication.yml must declare version: 1.');
  }
  if (!value.title || typeof value.title !== 'string') {
    throw new Error('publication.yml requires a title.');
  }
  if (!value.language || typeof value.language !== 'string') {
    throw new Error('publication.yml requires a language.');
  }
  if (!Array.isArray(value.content) || value.content.length === 0) {
    throw new Error('publication.yml requires at least one content entry.');
  }
  if (!value.theme || typeof value.theme.css !== 'string') {
    throw new Error('publication.yml requires theme.css.');
  }
  if (!Array.isArray(value.outputs) || value.outputs.length === 0) {
    throw new Error('publication.yml requires at least one output.');
  }
  for (const output of value.outputs) {
    if (!OUTPUTS.has(output)) {
      throw new Error(`Unsupported output: ${output}`);
    }
  }

  return value as PublicationManifest;
}
