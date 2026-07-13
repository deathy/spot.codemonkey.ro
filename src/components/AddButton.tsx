import { useState } from 'preact/hooks';

interface Props {
  onAddText: () => void;
  onAddPhoto: () => void;
}

export function AddButton({ onAddText, onAddPhoto }: Props) {
  const [open, setOpen] = useState(false);

  function pick(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <div class={`fab-wrap ${open ? 'open' : ''}`}>
      {open && <div class="fab-scrim" onClick={() => setOpen(false)} />}
      <div class="fab-actions">
        <button class="fab-action" onClick={() => pick(onAddPhoto)}>
          <span class="fab-action-label">Photo note</span>
          <span class="fab-action-icon">📷</span>
        </button>
        <button class="fab-action" onClick={() => pick(onAddText)}>
          <span class="fab-action-label">Text note</span>
          <span class="fab-action-icon">📝</span>
        </button>
      </div>
      <button
        class="fab"
        aria-label={open ? 'Close' : 'Add note'}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? '×' : '+'}
      </button>
    </div>
  );
}
