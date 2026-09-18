import { useEffect, useRef, useState, type PointerEvent } from 'react';
import type { Lut } from '../types';
import { findLut } from '../lib/catalog';
import { asset } from '../lib/format';
import { LutCard } from './LutCard';
import { photoStyleLabel } from '../lib/photoStyle';
import { useS9, changeS9, refreshS9 } from '../lib/s9';
import { DEFAULT_SLOT, type S9Target } from '../lib/s9-model';
import { GLOBAL_SAMPLES, FALLBACK_SAMPLE_ID, type SampleChoice } from './SampleStrip';
import './s9.css';
const byCode = { get: findLut };
const number = (i: number) => String(i + 1).padStart(2, '0');
interface Props { originalUrl?: string; frame: SampleChoice; previews: ReadonlyMap<string, string>; onOpen: (lut: Lut) => void; onCollect: (code: string) => void }
export function S9Page({ frame, originalUrl, previews, onOpen, onCollect }: Props) {
  const { doc, busy, ready, message, error } = useS9();
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const enabled = ready && !busy;
  const originalSample = GLOBAL_SAMPLES.find(sample => sample.id === (frame.kind === 'global' ? frame.id : FALLBACK_SAMPLE_ID));
  const original = frame.kind === 'user' ? originalUrl : originalSample ? asset(originalSample.before) : undefined;
  const title = (code: string | null) => code === DEFAULT_SLOT ? 'V-Log' : code ? byCode.get(code)?.title ?? code : 'Empty slot';
  const drag = useRef<{ code: string; pointerId: number; startX: number; startY: number; x: number; y: number; moved: boolean; frame: number } | null>(null);
  useEffect(() => () => { if (drag.current) cancelAnimationFrame(drag.current.frame); }, []);
  function targetAt(x: number, y: number) {
    const element = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-s9-target]');
    if (!element) return null;
    const target = JSON.parse(element.dataset.s9Target!) as S9Target;
    if (target.kind === 'slot' && drag.current && doc.slots.indexOf(drag.current.code) > 0) {
      const rect = element.getBoundingClientRect();
      const edge = Math.min(18, rect.height / 4);
      const before = y < rect.top + edge ? target.index : y > rect.bottom - edge ? target.index + 1 : null;
      if (before !== null) return { key: `insert-${before}`, target: { kind: 'slot-insert', before } as S9Target };
    }
    return { key: element.dataset.s9Key!, target };
  }
  function trackPointer() {
    const current = drag.current;
    if (!current) return;
    const list = document.querySelector<HTMLElement>('.s9-list');
    if (list && current.moved) {
      const rect = list.getBoundingClientRect();
      const bottom = Math.min(rect.bottom, window.innerHeight);
      if (current.x >= rect.left && current.x <= rect.right) {
        if (current.y < rect.top + 48) list.scrollTop -= 12;
        else if (current.y > bottom - 48) list.scrollTop += 12;
      }
      setOver(targetAt(current.x, current.y)?.key ?? null);
    }
    current.frame = requestAnimationFrame(trackPointer);
  }
  function begin(event: PointerEvent<HTMLSpanElement>, code: string) {
    if (!enabled || event.button !== 0 || drag.current) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { code, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, moved: false, frame: 0 };
    setDragging(code);
    trackPointer();
  }
  function move(event: PointerEvent<HTMLSpanElement>) {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    if (Math.hypot(event.clientX - current.startX, event.clientY - current.startY) > 3) current.moved = true;
    current.x = event.clientX; current.y = event.clientY;
    if (current.moved) setOver(targetAt(current.x, current.y)?.key ?? null);
  }
  function finish(event: PointerEvent<HTMLSpanElement>, cancelled = false) {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    cancelAnimationFrame(current.frame);
    const target = current.moved && !cancelled ? targetAt(event.clientX, event.clientY)?.target : null;
    drag.current = null;
    setDragging(null); setOver(null);
    if (enabled && target) void changeS9({ type: 'move', code: current.code, target });
  }
  function zone(key: string, target: S9Target) {
    return { 'data-s9-key': key, 'data-s9-target': JSON.stringify(target) };
  }
  function tile(code: string | null, label: string, key: string) {
    const lut = code ? byCode.get(code) : undefined;
    return <article className="s9-tile" key={key}>
      <div className="s9-position">{label}</div>
      {lut ? <LutCard
        lut={lut} previewUrl={previews.get(lut.code)} sampleId={frame.kind === 'global' ? frame.id : null}
        onSelect={onOpen} onCollect={onCollect}
      /> : <div className="card s9-fixed-card">
        <span className="card-frame">
          {code === DEFAULT_SLOT && original
            ? <img src={original} alt="Original image (no LUT applied)" loading="lazy" draggable={false} />
            : <span className="s9-empty-frame">{code ? 'Preview unavailable' : 'Empty slot'}</span>}
          {code === DEFAULT_SLOT ? <span className="badge">Original</span> : null}
        </span>
        <span className="card-title">{title(code)}</span>
        <span className="card-meta">{code === DEFAULT_SLOT
          ? `No LUT applied · ${frame.kind === 'own' ? originalSample?.name : 'Fixed slot'}`
          : code ? 'LUT not found in the current catalog' : 'Drag a LUT from the list into this slot'}</span>
      </div>}
    </article>;
  }
  function row(code: string | null, label: string, key: string, target: S9Target) {
    const fixed = code === DEFAULT_SLOT;
    const lut = code ? byCode.get(code) : undefined;
    return <li key={key} className={`s9-row${over === key ? ' s9-over' : ''}${dragging === code ? ' s9-dragging' : ''}${target.kind === 'slot' && over === `insert-${target.index}` ? ' s9-insert-before' : ''}${target.kind === 'slot' && target.index === 38 && over === 'insert-39' ? ' s9-insert-after' : ''}`}
      {...(fixed ? {} : zone(key, target))}>
      <span className="s9-slot-label">{label}</span>
      <div className="s9-row-name"><span>{title(code)}</span><small>{fixed ? 'Default · Fixed' : lut ? `${lut.creator.name} · ${photoStyleLabel(lut.photoStyle)}` : code ? 'LUT not found in the current catalog' : 'Drag a LUT here'}</small></div>
      {code && !fixed ? <>
        <button type="button" className="s9-remove" disabled={!enabled}
          aria-label={`Remove from LUT List ${title(code)}${lut ? ` · ${lut.creator.name}` : ''}`}
          title={target.kind === 'slot' ? 'Remove from the list and leave the slot empty' : 'Remove from candidates'}
          onClick={() => void changeS9({ type: 'remove', code })}>×</button>
        <span className="s9-handle" title={`Drag ${title(code)}${lut ? ` · ${lut.creator.name}` : ''}`}
          onPointerDown={event => begin(event, code)} onPointerMove={move}
          onPointerUp={event => finish(event)} onPointerCancel={event => finish(event, true)}
          onLostPointerCapture={event => finish(event, true)}>☰</span>
      </> : <span className="s9-lock">{fixed ? 'Fixed' : '—'}</span>}
    </li>;
  }
  return <section className="s9-page" aria-label="LUT List configuration">
    <header className="s9-heading"><div><h2>LUT List</h2><p>Drop between rows to reorder, or onto a row to swap slots.</p></div>
      <span>{doc.slots.filter(Boolean).length} / 39 · Candidate {doc.candidates.length}</span></header>
    <div className="s9-status" role="status">{message}{error ? <button type="button" onClick={() => void refreshS9()}>Retry</button> : null}</div>
    <div className="s9-layout">
      <div className="s9-previews">
        <h3>List slots · 01–39</h3>
        <div className="grid s9-grid">{doc.slots.map((code, i) => tile(code, number(i), `slot-${i}`))}</div>
        <section className="s9-candidates"><h3>Candidates <span>{doc.candidates.length}</span></h3>
          <div className="grid s9-grid">{doc.candidates.map((code, i) => tile(code, `Candidate ${i + 1}`, code))}</div>
          {!doc.candidates.length ? <p className="s9-empty">Click “Add to LUT List” on a LUT card to add it here.</p> : null}
        </section>
      </div>
      <aside className="s9-list" aria-label="Reorder LUTs">
        <h3>List slots · 01–39</h3>
        <ol>{doc.slots.map((code, i) => row(code, number(i), `slot-${i}`, { kind: 'slot', index: i }))}</ol>
        <section className="s9-candidates"><h3>Candidates <span>{doc.candidates.length}</span></h3>
          <ol>{doc.candidates.map((code, i) => row(code, String(i + 1), code, { kind: 'candidate', before: code }))}</ol>
          <div className={`s9-drop-end${over === 'end' ? ' s9-over' : ''}`} {...zone('end', { kind: 'candidate', before: null })}>
            Drop here to move to the end of the candidate list
          </div>
        </section>
      </aside>
    </div>
  </section>;
}
