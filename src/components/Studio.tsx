import { useMemo, useState } from 'react';

import type { LoadedProject } from '../lib/load-project';
import { contentPath } from '../types/publication';
import { ExportPanel } from './ExportPanel';
import { FileExplorer } from './FileExplorer';
import { MetadataPanel } from './MetadataPanel';
import { PublicationPreview } from './PublicationPreview';
import { SourceEditor } from './SourceEditor';
import { ThemePanel } from './ThemePanel';

type StudioTab = 'preview' | 'source' | 'metadata' | 'theme' | 'export';

const TEXT_EXTENSIONS = new Set([
  'css', 'csv', 'html', 'htm', 'js', 'json', 'md', 'markdown', 'svg',
  'txt', 'ts', 'tsx', 'xml', 'yaml', 'yml',
]);

function isTextFile(path: string): boolean {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  return TEXT_EXTENSIONS.has(ext);
}

export function Studio({ project }: { project: LoadedProject }) {
  const firstContent = contentPath(project.manifest.content[0]);
  const [tab, setTab] = useState<StudioTab>('preview');
  const [selectedFile, setSelectedFile] = useState(firstContent);
  const [revision, setRevision] = useState(0);
  const [dirtyFiles, setDirtyFiles] = useState<Set<string>>(
    () => new Set(project.workspace.changedPaths()),
  );

  const files = useMemo(() => project.workspace.list(), [project, revision]);
  const selectedText = isTextFile(selectedFile)
    ? project.workspace.text(selectedFile)
    : '';
  const themePath = project.manifest.theme.css;

  function refreshDirty() {
    setDirtyFiles(new Set(project.workspace.changedPaths()));
    setRevision((value) => value + 1);
  }

  function editText(path: string, value: string) {
    project.workspace.writeText(path, value);
    refreshDirty();
  }

  function reset(path: string) {
    project.workspace.reset(path);
    refreshDirty();
  }

  return (
    <section className="studio">
      <header className="studioTopbar">
        <div>
          <p className="eyebrow">Publication Studio</p>
          <h2>{project.manifest.title}</h2>
          <p>
            {project.snapshot.repository}@{project.snapshot.ref}
            {' · '}
            {project.snapshot.commitSha.slice(0, 7)}
          </p>
        </div>
        <div className="studioStatus">
          <span>{files.length} files</span>
          <span>{dirtyFiles.size} local changes</span>
        </div>
      </header>

      <div className="studioTabs" role="tablist" aria-label="Studio views">
        {(['preview', 'source', 'metadata', 'theme', 'export'] as StudioTab[]).map((value) => (
          <button
            key={value}
            type="button"
            className={tab === value ? 'studioTab studioTabActive' : 'studioTab'}
            onClick={() => setTab(value)}
          >
            {value[0].toUpperCase() + value.slice(1)}
          </button>
        ))}
      </div>

      <div className="studioBody">
        <FileExplorer
          files={files}
          selected={selectedFile}
          dirty={dirtyFiles}
          onSelect={(path) => {
            setSelectedFile(path);
            setTab('source');
          }}
        />

        <div className="studioMain">
          {tab === 'preview' ? (
            <PublicationPreview project={project} revision={revision} />
          ) : null}
          {tab === 'source' ? (
            <SourceEditor
              path={selectedFile}
              value={selectedText}
              editable={isTextFile(selectedFile)}
              dirty={dirtyFiles.has(selectedFile)}
              onChange={(value) => editText(selectedFile, value)}
              onReset={() => reset(selectedFile)}
            />
          ) : null}
          {tab === 'metadata' ? <MetadataPanel project={project} /> : null}
          {tab === 'theme' ? (
            <ThemePanel
              path={themePath}
              css={project.workspace.text(themePath)}
              dirty={dirtyFiles.has(themePath)}
              onChange={(value) => editText(themePath, value)}
              onReset={() => reset(themePath)}
            />
          ) : null}
          {tab === 'export' ? <ExportPanel project={project} /> : null}
        </div>
      </div>
    </section>
  );
}
