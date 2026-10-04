import type { LayoutLabSettings } from '../review/layout-lab';

interface LayoutLabPanelProps {
  enabled: boolean;
  settings: LayoutLabSettings;
  onEnabledChange(enabled: boolean): void;
  onChange(settings: LayoutLabSettings): void;
  onReset(): void;
}

export function LayoutLabPanel({
  enabled,
  settings,
  onEnabledChange,
  onChange,
  onReset,
}: LayoutLabPanelProps) {
  function patch(next: Partial<LayoutLabSettings>) {
    onChange({ ...settings, ...next });
  }

  return (
    <section className="layoutLabPanel">
      <header>
        <div>
          <p className="eyebrow">Layout Lab</p>
          <strong>Temporary browser experiment</strong>
        </div>
        <label className="labToggle">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => onEnabledChange(event.target.checked)}
          />
          <span>{enabled ? 'On' : 'Off'}</span>
        </label>
      </header>

      <p className="labIntro">
        Try layout changes without writing to Git. Reset or copy the resulting
        settings into a ChatGPT improvement brief later.
      </p>

      <div className="labGrid">
        <label>
          <span>Page size</span>
          <select
            value={settings.pageSize}
            onChange={(event) =>
              patch({
                pageSize: event.target.value as LayoutLabSettings['pageSize'],
              })
            }
            disabled={!enabled}
          >
            <option value="keep">Keep source</option>
            <option value="A5">A5</option>
            <option value="A4">A4</option>
            <option value="6x9">6 × 9 in</option>
          </select>
        </label>

        <label>
          <span>Margins</span>
          <select
            value={settings.margins}
            onChange={(event) =>
              patch({
                margins: event.target.value as LayoutLabSettings['margins'],
              })
            }
            disabled={!enabled}
          >
            <option value="keep">Keep source</option>
            <option value="compact">Compact</option>
            <option value="standard">Standard</option>
            <option value="airy">Airy</option>
          </select>
        </label>

        <label>
          <span>Columns</span>
          <select
            value={String(settings.columns)}
            onChange={(event) =>
              patch({
                columns:
                  event.target.value === 'keep'
                    ? 'keep'
                    : (Number(event.target.value) as 1 | 2 | 3),
              })
            }
            disabled={!enabled}
          >
            <option value="keep">Keep source</option>
            <option value="1">1 column</option>
            <option value="2">2 columns</option>
            <option value="3">3 columns</option>
          </select>
        </label>

        <label>
          <span>Body font scale</span>
          <select
            value={settings.fontScale}
            onChange={(event) =>
              patch({ fontScale: Number(event.target.value) })
            }
            disabled={!enabled}
          >
            <option value={90}>90%</option>
            <option value={95}>95%</option>
            <option value={100}>100%</option>
            <option value={105}>105%</option>
            <option value={110}>110%</option>
          </select>
        </label>

        <label>
          <span>Image emphasis</span>
          <select
            value={settings.imageScale}
            onChange={(event) =>
              patch({
                imageScale: event.target.value as LayoutLabSettings['imageScale'],
              })
            }
            disabled={!enabled}
          >
            <option value="keep">Keep source</option>
            <option value="restrained">Restrained</option>
            <option value="emphasis">Emphasis</option>
          </select>
        </label>
      </div>

      <div className="labPresets">
        <button
          type="button"
          className="secondaryButton"
          disabled={!enabled}
          onClick={() =>
            onChange({
              pageSize: 'A5',
              margins: 'airy',
              columns: 'keep',
              fontScale: 100,
              imageScale: 'restrained',
            })
          }
        >
          Book airy
        </button>
        <button
          type="button"
          className="secondaryButton"
          disabled={!enabled}
          onClick={() =>
            onChange({
              pageSize: 'A4',
              margins: 'standard',
              columns: 3,
              fontScale: 95,
              imageScale: 'emphasis',
            })
          }
        >
          Editorial
        </button>
        <button
          type="button"
          className="secondaryButton"
          disabled={!enabled}
          onClick={() =>
            onChange({
              pageSize: 'keep',
              margins: 'compact',
              columns: 2,
              fontScale: 90,
              imageScale: 'restrained',
            })
          }
        >
          Compact
        </button>
        <button
          type="button"
          className="secondaryButton"
          onClick={onReset}
        >
          Reset
        </button>
      </div>
    </section>
  );
}
