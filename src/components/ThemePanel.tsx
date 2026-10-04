import { useEffect, useState } from 'react';

interface ThemePanelProps {
  path: string;
  css: string;
  dirty: boolean;
  onChange(css: string): void;
  onReset(): void;
}

export function ThemePanel({
  path,
  css,
  dirty,
  onChange,
  onReset,
}: ThemePanelProps) {
  const [draft, setDraft] = useState(css);

  useEffect(() => setDraft(css), [path, css]);

  return (
    <section className="sourceEditor">
      <header className="studioPanelHeader">
        <div>
          <p className="eyebrow">Theme</p>
          <strong>{path}</strong>
        </div>
        <div className="sourceActions">
          {dirty ? <span className="dirtyBadge">Local changes</span> : null}
          {dirty ? (
            <button type="button" className="secondaryButton" onClick={onReset}>
              Reset theme
            </button>
          ) : null}
        </div>
      </header>
      <textarea
        className="sourceTextarea themeTextarea"
        value={draft}
        spellCheck={false}
        onChange={(event) => {
          setDraft(event.target.value);
          onChange(event.target.value);
        }}
      />
    </section>
  );
}
