import { validSession, validDraft } from './reading.js';
export const KEYS = {journal:'luna.journal.v1',draft:'luna.draft.v1'};
export function readJSON(key, fallback, storage=globalThis.localStorage) {
  try { const raw=storage.getItem(key); return raw===null?fallback:JSON.parse(raw); } catch { return fallback; }
}
export function writeJSON(key,value,storage=globalThis.localStorage) {
  try { storage.setItem(key,JSON.stringify(value)); return true; } catch { return false; }
}
export function getJournal() {
  const entries=readJSON(KEYS.journal,[]);
  return Array.isArray(entries)?entries.filter(e=>validSession(e)&&e.selected.length===({single:1,three:3}[e.spread])&&typeof e.note==='string'&&e.note.length<=3000&&typeof e.starred==='boolean').slice(0,200):[];
}
export function getDraft() { const s=readJSON(KEYS.draft,null); return validDraft(s)?s:null; }
