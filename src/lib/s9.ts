import { useEffect, useSyncExternalStore } from "react";
import {
  applyS9,
  emptyS9,
  validS9,
  s9Location,
  type S9Action,
  type S9Doc,
} from "./s9-model";
const KEY = "lumix-s9:plan:v1";
interface Snapshot {
  doc: S9Doc;
  busy: boolean;
  ready: boolean;
  message: string;
  error: boolean;
}
let state: Snapshot = {
  doc: emptyS9(),
  busy: false,
  ready: false,
  message: "Loading local list…",
  error: false,
};
const listeners = new Set<() => void>();
const emit = (patch: Partial<Snapshot>) => {
  state = { ...state, ...patch };
  listeners.forEach((fn) => fn());
};
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};
function read(): S9Doc {
  const raw = localStorage.getItem(KEY);
  if (raw === null) return emptyS9();
  const doc: unknown = JSON.parse(raw);
  if (!validS9(doc)) throw new Error("Cannot read the local list format. Existing data was not overwritten.");
  return doc;
}
export async function refreshS9() {
  try {
    emit({
      doc: read(),
      ready: true,
      error: false,
      message: "Saved in this browser for planning only. No camera is connected.",
    });
  } catch (error) {
    emit({
      ready: false,
      error: true,
      message: `Unable to load the local list: ${String(error)}`,
    });
  }
}
let started = false;
window.addEventListener("storage", (event) => {
  if (event.key === KEY || event.key === null) void refreshS9();
});
export function useS9() {
  useEffect(() => {
    if (!started) {
      started = true;
      void refreshS9();
    }
  }, []);
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );
}
export async function changeS9(action: S9Action) {
  if (!state.ready || state.busy) return;
  emit({ busy: true });
  const save = () => {
    const previous = read();
    const existing = s9Location(previous, action.code);
    if (action.type === "add" && existing) {
      emit({ doc: previous, message: `Already in ${existing}`, error: false });
      return;
    }
    const next = applyS9(previous, action);
    if (next === previous) return;
    next.rev = previous.rev + 1;
    localStorage.setItem(KEY, JSON.stringify(next));
    emit({
      doc: next,
      error: false,
      message:
        action.type === "add"
          ? "Added to candidates · Saved in this browser"
          : "Saved in this browser",
    });
  };
  try {
    if (navigator.locks) await navigator.locks.request(KEY, save);
    else
      throw new Error(
        "This browser does not support safe cross-tab locking. Use a browser with Web Locks support.",
      );
  } catch (error) {
    emit({ error: true, message: `Save failed. Changes were not applied: ${String(error)}` });
  } finally {
    emit({ busy: false });
  }
}
