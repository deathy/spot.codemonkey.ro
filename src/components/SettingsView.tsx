import { useRef, useState } from 'preact/hooks';
import type { Settings } from '../lib/types';
import { downloadExport, importFromJson } from '../lib/export';
import { clearAll } from '../lib/db';

interface Props {
  settings: Settings;
  noteCount: number;
  onChange: (patch: Partial<Settings>) => void;
  onDataChanged: () => void;
}

export function SettingsView({ settings, noteCount, onChange, onDataChanged }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  async function handleImport(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const { imported, skipped } = await importFromJson(text);
      onDataChanged();
      setStatus(`Imported ${imported} note${imported === 1 ? '' : 's'}` +
        (skipped ? `, skipped ${skipped}` : ''));
    } catch {
      setStatus('Import failed — is that a Spot export file?');
    }
  }

  async function handleClear() {
    await clearAll();
    setConfirmClear(false);
    onDataChanged();
    setStatus('All notes deleted.');
  }

  return (
    <div class="settings-view">
      <h2>Settings</h2>

      <label class="setting">
        <div class="setting-text">
          <span class="setting-label">Remember map position</span>
          <span class="setting-hint">
            Reopen the map where you left it, instead of jumping to your current location.
          </span>
        </div>
        <input
          type="checkbox"
          checked={settings.rememberMapView}
          onChange={(e) =>
            onChange({ rememberMapView: (e.target as HTMLInputElement).checked })
          }
        />
      </label>

      <h3>Your data</h3>
      <p class="setting-hint">
        {noteCount} note{noteCount === 1 ? '' : 's'} stored on this device.
      </p>

      <div class="data-buttons">
        <button onClick={() => void downloadExport()}>⬇️ Export JSON</button>
        <button onClick={() => fileRef.current?.click()}>⬆️ Import JSON</button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={handleImport}
        />
      </div>

      <div class="data-buttons">
        {confirmClear ? (
          <>
            <button onClick={() => setConfirmClear(false)}>Cancel</button>
            <button class="danger" onClick={handleClear}>
              Delete everything
            </button>
          </>
        ) : (
          <button class="danger" onClick={() => setConfirmClear(true)}>
            🗑️ Clear all notes
          </button>
        )}
      </div>

      {status && <p class="status">{status}</p>}

      <p class="privacy-note">
        Everything stays on this device. No accounts, no servers, no analytics. Your
        notes, locations and photos never leave your browser unless you export them
        yourself. The only network requests are for map tiles from OpenStreetMap.
      </p>

      <p class="build-info">
        <a
          href={`https://github.com/deathy/spot.codemonkey.ro/commit/${__COMMIT__}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {__COMMIT__}
        </a>{' '}
        · built {__BUILD_TIME__.slice(0, 19)}Z
      </p>
    </div>
  );
}
