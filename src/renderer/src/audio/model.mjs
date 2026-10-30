export const SLOT_COUNT = 12;
export const MAX_BANKS = 12;
export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 256 * 1024 * 1024;
export const MAX_DURATION_SECONDS = 600;

const defaultBank = () => ({ id: 'bank-default', name: 'Soundboard', slots: Array.from({ length: SLOT_COUNT }, (_, i) => ({ id: `pad-${i + 1}`, asset: null, volume: 100, loop: false })) });
export const defaultAudioConfig = () => ({ version: 1, masterVolume: 100, banks: [defaultBank()], selectedBankId: 'bank-default', assets: [] });

const safeName = value => typeof value === 'string' && value.length <= 80 && value.trim().length > 0 && !/[\\/\0]/.test(value);
const assetValid = a => a && typeof a === 'object' && /^a_[a-f0-9]{32}$/.test(a.id) && safeName(a.name) && ['wav', 'mp3', 'ogg'].includes(a.format) && Number.isSafeInteger(a.size) && a.size > 0 && a.size <= MAX_FILE_BYTES && Number.isFinite(a.duration) && a.duration > 0 && a.duration <= MAX_DURATION_SECONDS && Object.keys(a).every(k => ['id','name','format','size','duration'].includes(k));
export function validateAudioConfig(value) {
  if (!value || typeof value !== 'object' || value.version !== 1 || !Array.isArray(value.banks) || value.banks.length < 1 || value.banks.length > MAX_BANKS || !Array.isArray(value.assets) || value.assets.some(a => !assetValid(a)) || new Set(value.assets.map(a => a.id)).size !== value.assets.length) return defaultAudioConfig();
  const ids = new Set();
  const banks = value.banks.map((b, bi) => {
    if (!b || typeof b.id !== 'string' || !/^bank-[a-z0-9-]{1,48}$/.test(b.id) || ids.has(b.id) || !safeName(b.name) || !Array.isArray(b.slots) || b.slots.length !== SLOT_COUNT) return null;
    ids.add(b.id);
    const slotIds = new Set();
    const slots = b.slots.map((s, i) => {
      if (!s || s.id !== `pad-${i + 1}` || slotIds.has(s.id) || (s.asset !== null && !value.assets.some(a => a.id === s.asset)) || !Number.isInteger(s.volume) || s.volume < 0 || s.volume > 100 || typeof s.loop !== 'boolean') return null;
      slotIds.add(s.id); return { id: s.id, asset: s.asset, volume: s.volume, loop: s.loop };
    });
    return slots.some(s => !s) ? null : { id: b.id, name: b.name, slots };
  });
  if (banks.some(b => !b) || !Number.isInteger(value.masterVolume) || value.masterVolume < 0 || value.masterVolume > 100 || !ids.has(value.selectedBankId)) return defaultAudioConfig();
  const total = value.assets.reduce((n, a) => n + a.size, 0);
  if (total > MAX_TOTAL_BYTES) return defaultAudioConfig();
  return { version: 1, masterVolume: value.masterVolume, banks, selectedBankId: value.selectedBankId, assets: value.assets.map(a => ({ id: a.id, name: a.name, format: a.format, size: a.size, duration: a.duration })) };
}

export function assignAsset(config, bankId, slotId, asset) {
  const next = validateAudioConfig(config);
  if (!assetValid(asset) || !next.banks.some(b => b.id === bankId) || !/^pad-(?:[1-9]|1[0-2])$/.test(slotId)) return next;
  const assets = next.assets.some(a => a.id === asset.id) ? next.assets : [...next.assets, asset];
  const bank = next.banks.find(b => b.id === bankId);
  return validateAudioConfig({ ...next, assets, banks: next.banks.map(b => b.id === bankId ? { ...b, slots: b.slots.map(s => s.id === slotId ? { ...s, asset: asset.id } : s) } : b) });
}
