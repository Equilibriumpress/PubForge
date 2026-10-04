import type { PdfEdition } from '../engine/output-profile';
import { resolvePdfProfile } from '../engine/output-profile';
import { exportEpub } from '../export/epub';
import { exportProjectZip } from '../export/project-zip';
import { exportWebPublication } from '../export/webpub';
import type { LoadedProject } from '../lib/load-project';

interface ExportPanelProps {
  project: LoadedProject;
}

export function ExportPanel({ project }: ExportPanelProps) {
  const pdfProfile = resolvePdfProfile(project.manifest);
  const editions: PdfEdition[] =
    project.manifest.pdf?.editions?.length
      ? project.manifest.pdf.editions
      : ['normal'];

  function printPublication(edition: PdfEdition) {
    const url = new URL(window.location.href);
    url.searchParams.set(
      'repo',
      `${project.snapshot.repository}@${project.snapshot.commitSha}`,
    );
    url.searchParams.set('print', '1');
    url.searchParams.set('edition', edition);
    window.open(url, '_blank', 'noopener');
  }

  const pdfOutputs = editions.map((edition) => ({
    id: `pdf-${edition}`,
    enabled: project.manifest.pdf?.enabled !== false,
    title: `PDF · ${edition}`,
    detail:
      edition === 'print'
        ? 'Print-theme variant using the same Vivliostyle pagination.'
        : edition === 'high-quality'
          ? 'High-quality theme variant; final raster/PDF quality still depends on the PDF producer.'
          : 'Default Vivliostyle paginated browser PDF variant.',
    action: () => printPublication(edition),
    label: `Open ${edition} PDF`,
  }));

  const outputs = [
    ...pdfOutputs,
    {
      id: 'epub',
      enabled: project.manifest.epub?.enabled !== false,
      title: 'EPUB 3',
      detail: 'Reflowable EPUB with navigation, metadata and semantic reading order.',
      action: () => exportEpub(project),
      label: 'Export EPUB',
    },
    {
      id: 'webpub',
      enabled: project.manifest.webpub?.enabled !== false,
      title: 'Web Publication',
      detail: 'Portable web publication with a W3C publication manifest.',
      action: () => exportWebPublication(project),
      label: 'Export WebPub',
    },
    {
      id: 'project',
      enabled: project.manifest.projectZip?.enabled !== false,
      title: 'Source snapshot',
      detail: 'Exact committed Git project snapshot; derived browser assets are excluded.',
      action: () => exportProjectZip(project),
      label: 'Project ZIP',
    },
  ].filter((output) => output.enabled);

  return (
    <section className="exportPanel">
      <div>
        <p className="eyebrow">Output</p>
        <h2>One publication engine</h2>
        <p>
          Preview and outputs are compiled from commit{' '}
          {project.snapshot.commitSha.slice(0, 7)} using the same reading order,
          VFM settings, metadata and project assets.
        </p>
        <dl className="profileSummary">
          <div><dt>PDF profile</dt><dd>{pdfProfile.profile}</dd></div>
          <div><dt>Page size</dt><dd>{pdfProfile.pageSize}</dd></div>
          <div><dt>Binding</dt><dd>{pdfProfile.binding}</dd></div>
          <div><dt>Bleed</dt><dd>{pdfProfile.bleed}</dd></div>
          <div><dt>Crop marks</dt><dd>{pdfProfile.cropMarks ? 'yes' : 'no'}</dd></div>
          <div><dt>Crop offset</dt><dd>{pdfProfile.cropOffset}</dd></div>
          <div><dt>Bookmarks</dt><dd>{pdfProfile.bookmarks ? 'requested' : 'no'}</dd></div>
          <div><dt>Mermaid</dt><dd>{project.preparedAssets.mermaidDiagrams}</dd></div>
          <div><dt>Highlighted code</dt><dd>{project.preparedAssets.highlightedBlocks}</dd></div>
          <div><dt>Optimized images</dt><dd>{project.preparedAssets.optimizedImages}</dd></div>
        </dl>
        {pdfProfile.profile === 'press' ? (
          <p className="pressNote">
            Press profile includes trim/bleed/crop layout. Crop offset, PDF
            outlines/bookmarks, PDF/X conversion and output-intent color work
            are finalized by the optional production pipeline rather than the
            browser print dialog.
          </p>
        ) : null}
      </div>
      <div className="outputCards">
        {outputs.map((output) => (
          <article className="outputCard" key={output.id}>
            <div>
              <strong>{output.title}</strong>
              <p>{output.detail}</p>
            </div>
            <button type="button" onClick={output.action}>
              {output.label}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}