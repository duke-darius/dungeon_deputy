const sceneIds = new Set(['ashen-road', 'moonlit-fen', 'old-bridge']);
const modifierKeys = new Set(['Control', 'Shift', 'Alt', 'Meta', 'OS', 'AltGraph']);

export function normalizeChord(event) {
  const key = event?.key;
  if (!key || modifierKeys.has(key) || key === 'Dead' || key === 'Process' || event.isComposing) return null;
  if (!(event.ctrlKey || event.metaKey) || !(event.shiftKey || event.altKey)) return null;
  const label = event.metaKey ? 'Cmd' : 'Ctrl';
  const other = event.shiftKey ? 'Shift' : 'Alt';
  const normalizedKey = key.length === 1 ? key.toUpperCase() : key;
  if (!/^(?:[A-Z0-9]|F(?:[1-9]|1[0-2])|Arrow(?:Up|Down|Left|Right)|Space|Enter|Escape|Home|End|PageUp|PageDown|Insert|Delete|Backspace|Tab)$/.test(normalizedKey)) return null;
  return `${label}+${other}+${normalizedKey}`;
}

function validTarget(target, bankIds) {
  if (!target || typeof target !== 'object') return false;
  switch (target.kind) {
    case 'pad': return bankIds.includes(target.bankId) && /^pad-(?:[1-9]|1[0-2])$/.test(target.slotId);
    case 'scene': return sceneIds.has(target.sceneId);
    case 'current': case 'blackout': return true;
    default: return false;
  }
}

export function validateCueBindings(value, bankIds) {
  if (!Array.isArray(value) || !Array.isArray(bankIds)) return [];
  const chords = new Set();
  const counts = new Map();
  for (const binding of value) if (binding?.chord) counts.set(binding.chord, (counts.get(binding.chord) ?? 0) + 1);
  const valid = [];
  for (const binding of value) {
    const chord = typeof binding?.chord === 'string' ? binding.chord : '';
    if ((chord !== '' && !/^(?:Ctrl|Cmd)\+(?:Shift|Alt)\+(?:[A-Z0-9]|F(?:[1-9]|1[0-2])|Arrow(?:Up|Down|Left|Right)|Space|Enter|Escape|Home|End|PageUp|PageDown|Insert|Delete|Backspace|Tab)$/.test(chord))
      || (chord !== '' && (chords.has(chord) || counts.get(chord) !== 1)) || !validTarget(binding.target, bankIds)) continue;
    chords.add(chord);
    valid.push({ chord, target: { ...binding.target } });
  }
  return valid;
}

export function shouldIgnoreCueEvent(event) {
  if (!event || event.defaultPrevented || event.repeat || event.isComposing) return true;
  const target = event.target;
  const tag = target?.tagName?.toLowerCase();
  return ['input', 'textarea', 'select'].includes(tag) || target?.isContentEditable === true
    || target?.isContentEditable === true || target?.getAttribute?.('contenteditable') === 'true' || target?.role === 'textbox' || target?.getAttribute?.('role') === 'textbox';
}

export function isCueWindowActive(documentLike) {
  return !!documentLike && documentLike.visibilityState === 'visible' && documentLike.hasFocus?.() === true;
}

export async function dispatchCue(target, actions) {
  switch (target?.kind) {
    case 'pad': return actions.playPad(target.bankId, target.slotId);
    case 'scene': return actions.showScene(target.sceneId);
    case 'current': return actions.showCurrent();
    case 'blackout': return actions.blackout();
    default: throw new Error('Unsupported cue target.');
  }
}
