import { useState } from 'react';

import { downloadBytes, zipFiles } from '../export/utils';
import {
  PUBLICATION_TEMPLATES,
  type PublicationTemplate,
} from '../templates/catalog';

async function loadTemplate(template: PublicationTemplate): Promise<Uint8Array> {
  const entries: Array<[string, Uint8Array]> = [];
  for (const path of template.files) {
    const source = new URL(
      `templates/${template.id}/${path}`,
      document.baseURI,
    );
    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`Unable to load template file: ${path}`);
    }
    entries.push([path, new Uint8Array(await response.arrayBuffer())]);
  }
  return zipFiles(entries);
}

export function TemplateGallery() {
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  async function download(template: PublicationTemplate) {
    setBusy(template.id);
    setMessage('');
    try {
      const archive = await loadTemplate(template);
      downloadBytes(
        archive,
        `pubforge-${template.id}-starter.zip`,
        'application/zip',
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to prepare template.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="templateSection">
      <header>
        <p className="eyebrow">Starter projects</p>
        <h2>Start from plain Git files</h2>
        <p>
          Each starter is a complete PubForge project. Unzip it into a repository,
          edit the files, then open that repository above.
        </p>
      </header>
      <div className="templateGrid">
        {PUBLICATION_TEMPLATES.map((template) => (
          <article key={template.id} className="templateCard">
            <h3>{template.name}</h3>
            <p>{template.description}</p>
            <button
              type="button"
              className="secondaryButton"
              onClick={() => void download(template)}
              disabled={busy !== null}
            >
              {busy === template.id ? 'Preparing…' : 'Download starter'}
            </button>
          </article>
        ))}
      </div>
      {message ? <p className="templateMessage" role="status">{message}</p> : null}
    </section>
  );
}
