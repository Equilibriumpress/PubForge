import { useEffect, useState } from 'react';

interface SourceEditorProps {
  path: string;
  value: string;
  editable: boolean;
  dirty: boolean;
  onChange(value: string): void;
  onReset(): void;
}

export function SourceEditor({
  path,
  value,
  editable,
  dirty,
  onChange,
  onReset,
}: SourceEditorProps) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [path, value]);

  function update(next: string) {
    setDraft(next);
    onChange(next);
  }

  return (
    <section className="sourceEditor">
      <header className="studioPanelHeader">
        <div>
          <p className="eyebrow">Source</p>
          <strong>{path}</strong>
        </div>
        <div className="sourceActions">
          {dirty ? <span className="dirtyBadge">Local changes</span> : null}
          {dirty ? (
            <button type="button" className="secondaryButton" onClick={onReset}>
              Reset file
            </button>
          ) : null}
        </div>
      </header>
      {editable ? (
        <textarea
          className="sourceTextarea"
          value={draft}
          spellCheck={false}
          onChange={(event) => update(event.target.value)}
        />
      ) : (
        <div className="binaryNotice">
          <strong>Binary asset</strong>
          <p>This file is available to the renderer but is not editable as text.</p>
        </div>
      )}
    </section>
  );
}
