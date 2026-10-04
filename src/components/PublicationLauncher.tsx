import type { PublicationDescriptor } from '../lib/publications';

interface PublicationLauncherProps {
  publications: PublicationDescriptor[];
  activeManifest?: string;
  loading: boolean;
  onSelect(manifestPath: string): void;
}

const kindLabels: Record<PublicationDescriptor['kind'], string> = {
  primary: 'Primary',
  example: 'Example',
  starter: 'Starter',
};

const outputLabels: Record<string, string> = {
  print: 'PDF',
  epub: 'EPUB',
  webpub: 'WebPub',
  'project-zip': 'Source',
};

export function PublicationLauncher({
  publications,
  activeManifest,
  loading,
  onSelect,
}: PublicationLauncherProps) {
  if (publications.length <= 1) return null;

  return (
    <section className="publicationLauncher" aria-labelledby="publication-launcher-title">
      <header className="launcherHeader">
        <div>
          <p className="eyebrow">Publications</p>
          <h2 id="publication-launcher-title">Choose what to render</h2>
        </div>
        <span>{publications.length} manifests found</span>
      </header>

      <div className="publicationCards">
        {publications.map((publication) => {
          const active = publication.manifestPath === activeManifest;
          return (
            <button
              key={publication.manifestPath}
              type="button"
              className={
                active
                  ? 'publicationCard publicationCardActive'
                  : 'publicationCard'
              }
              disabled={loading}
              aria-pressed={active}
              onClick={() => onSelect(publication.manifestPath)}
            >
              <div className="publicationCardTop">
                <span className="publicationKind">
                  {kindLabels[publication.kind]}
                </span>
                <span className="publicationType">
                  {publication.type ?? 'publication'}
                </span>
              </div>

              <strong>{publication.title}</strong>
              {publication.subtitle ? <p>{publication.subtitle}</p> : null}

              <div className="publicationOutputs">
                {publication.outputs
                  .filter((output) => output !== 'project-zip')
                  .map((output) => (
                    <span key={output}>
                      {outputLabels[output] ?? output}
                    </span>
                  ))}
              </div>

              <small>{publication.manifestPath}</small>
            </button>
          );
        })}
      </div>
    </section>
  );
}
