// Optional AI pack client (A3). Topic matching only: proposes an entity id or an announcement link.
// The engine re-checks every hint against the shipped records; a hint never sets a status. No LLM.
import { Platform } from 'react-native';
import type { Data, Hints } from '../../engine/types.ts';

export type AiState = { status: 'off' | 'loading' | 'ready' | 'unavailable'; reason?: string; loadMs?: number };
const TIMEOUT_MS = 15000;
// ponytail: provisional thresholds; E3 (entity) and E6 (margin) set them on the library half before the freeze.
const MIN_SIM = 0.85, MARGIN = 0.03;

export const isPhone = () => Platform.OS === 'web' && /Android|iPhone|iPad|Mobile/i.test(globalThis.navigator?.userAgent ?? '');

let worker: Worker | null = null, seq = 0;
const pending = new Map<number, (m: any) => void>();
function call(msg: object): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = ++seq;
    const t = setTimeout(() => { pending.delete(id); reject(new Error('timed out after 15 s')); }, TIMEOUT_MS);
    pending.set(id, m => { clearTimeout(t); m.ok ? resolve(m) : reject(new Error(m.error)); });
    worker!.postMessage({ id, ...msg });
  });
}
const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0);

let entVecs: { id: string; v: number[] }[] = [], annVecs: { link: string; v: number[] }[] = [];

export async function startAi(data: Data, set: (s: AiState) => void) {
  if (Platform.OS !== 'web' || typeof Worker === 'undefined') return set({ status: 'unavailable', reason: 'no web worker' });
  set({ status: 'loading' });
  try {
    const head = await fetch(new URL('models/e5/onnx/model_quantized.onnx', document.baseURI).href, { method: 'HEAD' });
    if (!head.ok || (head.headers.get('content-type') ?? '').includes('text/html')) throw new Error('AI pack files not installed');
    worker = new Worker(new URL('embed-worker.js', document.baseURI).href, { type: 'module' });
    worker.onmessage = e => pending.get(e.data.id)?.(e.data);
    worker.onerror = e => { for (const f of pending.values()) f({ ok: false, error: String(e.message) }); };
    const { loadMs } = await call({ op: 'load' });
    const ents = data.registry.entities.flatMap(e => [...e.names_en, ...e.names_ar, ...e.aliases].filter(Boolean).map(n => ({ id: e.id, n })));
    if (ents.length) { const r = await call({ op: 'embed', texts: ents.map(x => x.n), prefix: 'passage: ' }); entVecs = ents.map((x, i) => ({ id: x.id, v: r.vectors[i] })); }
    const anns = data.announcements.items;
    if (anns.length) { const r = await call({ op: 'embed', texts: anns.map(a => a.title), prefix: 'passage: ' }); annVecs = anns.map((a, i) => ({ link: a.link, v: r.vectors[i] })); }
    set({ status: 'ready', loadMs: Math.round(loadMs) });
  } catch (err) {
    worker?.terminate(); worker = null;
    set({ status: 'unavailable', reason: String((err as Error).message || err) });
  }
}

/** Best match only if it beats the runner-up (a different target) by MARGIN; otherwise abstain. */
function pick<T extends { v: number[] }>(q: number[], xs: T[], key: (x: T) => string): string | undefined {
  const best = new Map<string, number>();
  for (const x of xs) { const s = dot(q, x.v), k = key(x); if (s > (best.get(k) ?? -1)) best.set(k, s); }
  const [a, b] = [...best.entries()].sort((p, q2) => q2[1] - p[1]);
  if (!a || a[1] < MIN_SIM || (b && a[1] - b[1] < MARGIN)) return undefined;
  return a[0];
}

export async function aiHints(text: string): Promise<Hints> {
  if (!worker || !text.trim()) return {};
  try {
    const { vectors: [q] } = await call({ op: 'embed', texts: [text], prefix: 'query: ' });
    return { entityId: pick(q, entVecs, x => x.id), announcementLink: pick(q, annVecs, x => x.link) };
  } catch { return {}; }
}
