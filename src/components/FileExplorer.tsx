interface FileExplorerProps {
  files: string[];
  selected: string;
  dirty: ReadonlySet<string>;
  onSelect(path: string): void;
}

export function FileExplorer({
  files,
  selected,
  dirty,
  onSelect,
}: FileExplorerProps) {
  return (
    <nav className="fileExplorer" aria-label="Project files">
      <div className="fileExplorerHeader">
        <span>Files</span>
        <small>{files.length}</small>
      </div>
      <div className="fileList">
        {files.map((path) => (
          <button
            key={path}
            type="button"
            className={path === selected ? 'fileItem fileItemActive' : 'fileItem'}
            onClick={() => onSelect(path)}
          >
            <span>{path}</span>
            {dirty.has(path) ? <strong title="Locally changed">●</strong> : null}
          </button>
        ))}
      </div>
    </nav>
  );
}
