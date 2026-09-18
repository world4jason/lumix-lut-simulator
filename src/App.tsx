import { useEffect, useState } from "react";
import type { Lut } from "./types";
import { catalog, setUploadedCatalog } from "./lib/catalog";
import {
  importUpload,
  inspectUpload,
  loadUploads,
  renderUpload,
  SUPPORTED_UPLOAD_INPUT_STYLES,
  type UploadedLut,
  type UploadInspection,
} from "./lib/uploads";
import { useS9 } from "./lib/s9";
import { LutCard } from "./components/LutCard";
import { LutDetail } from "./components/LutDetail";
import { S9Page } from "./components/S9Page";
import { FALLBACK_SAMPLE_ID, SampleStrip } from "./components/SampleStrip";
import "./standalone.css";
import { DEFAULT_PREVIEW } from "./lib/ownStill";
export default function App() {
  const [tab, setTab] = useState<"s9" | "catalog" | "upload">("s9");
  const [sample, setSample] = useState(DEFAULT_PREVIEW);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Lut | null>(null);
  const [uploads, setUploads] = useState<UploadedLut[]>([]);
  const [uploadError, setUploadError] = useState("");
  const [uploadsReady, setUploadsReady] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [inspection, setInspection] = useState<UploadInspection | null>(null);
  const [style, setStyle] = useState("");
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState("");
  const [previews, setPreviews] = useState<Map<string, string>>(new Map());
  const { doc, message, error } = useS9();
  function register(items: UploadedLut[]) {
    setUploadedCatalog(items.map((x) => x.lut));
    setUploads(items);
  }
  async function reloadUploads() {
    setUploadError("");
    try {
      register(await loadUploads());
      setUploadsReady(true);
    } catch (e) {
      setUploadError(String((e as Error).message));
      setUploadsReady(false);
    }
  }
  useEffect(() => {
    void reloadUploads();
  }, []);
  useEffect(() => {
    let alive = true;
    setPreviews(new Map());
    const codes = new Set([...doc.slots, ...doc.candidates]);
    const needed =
      tab === "upload" ? uploads : uploads.filter((u) => codes.has(u.lut.code));
    void (async () => {
      for (const u of needed) {
        try {
          const url = await renderUpload(
            u,
            sample === DEFAULT_PREVIEW ? FALLBACK_SAMPLE_ID : sample,
          );
          if (!alive) return;
          setPreviews((current) => new Map(current).set(u.lut.code, url));
        } catch {
          /* Detail displays the precise unavailable-input message. */
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [uploads, sample, tab, doc]);
  async function pickFile(next: File | undefined) {
    setFile(null);
    setInspection(null);
    setStyle("");
    setNotice("");
    if (!next) return;
    setWorking(true);
    try {
      const result = await inspectUpload(next);
      setFile(next);
      setInspection(result);
      setStyle(
        result.inputStyleRequired ? "" : (result.declaredInputStyle ?? ""),
      );
    } catch (e) {
      setNotice(String((e as Error).message));
    } finally {
      setWorking(false);
    }
  }
  async function saveUpload() {
    if (!file || !style) return;
    setWorking(true);
    setNotice("");
    try {
      const item = await importUpload(file, style);
      register([...uploads, item]);
      setFile(null);
      setInspection(null);
      setNotice("LUT saved in this browser. Open its details or add it to LUT List.");
    } catch (e) {
      setNotice(String((e as Error).message));
    } finally {
      setWorking(false);
    }
  }
  const tokens = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const matches = catalog.luts.filter((lut) =>
    tokens.every((t) =>
      `${lut.title} ${lut.creator.name} ${lut.code} ${lut.overview}`
        .toLowerCase()
        .includes(t),
    ),
  );
  return (
    <main className="app">
      <header className="masthead">
        <div className="brand">
          <span className="brand-mark">LUT</span>
          <div>
            <h1>Lumix LUT Simulator</h1>
          </div>
        </div>
        <nav className="tabs" aria-label="Pages">
          <button
            className={`tab ${tab === "s9" ? "on" : ""}`}
            onClick={() => setTab("s9")}
          >
            LUT List
          </button>
          <button
            className={`tab ${tab === "catalog" ? "on" : ""}`}
            onClick={() => setTab("catalog")}
          >
            Official LUTs
          </button>
          <button
            className={`tab ${tab === "upload" ? "on" : ""}`}
            onClick={() => setTab("upload")}
          >
            Your LUTs
          </button>
        </nav>
      </header>
      <SampleStrip
        id={
          tab === "upload" && sample === DEFAULT_PREVIEW
            ? FALLBACK_SAMPLE_ID
            : sample
        }
        onChange={setSample}
        includeOwn={tab !== "upload"}
      />
      {tab === "s9" ? (
        <S9Page
          frame={
            sample === DEFAULT_PREVIEW
              ? { kind: "own" }
              : { kind: "global", id: sample }
          }
          previews={previews}
          onOpen={setSelected}
          onCollect={() => {}}
        />
      ) : (
        <>
          <p className={`s9-status${error ? " error" : ""}`} role="status">
            {message}
          </p>
          {tab === "catalog" ? (
            <section aria-label="Official LUTs">
              <div className="filters">
                <div className="filter-row">
                  <input
                    className="search"
                    type="search"
                    aria-label="Search official LUTs or creators"
                    placeholder="Search LUT names or creators"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  <span className="count">{matches.length} / 199</span>
                </div>
              </div>
              <div className="grid">
                {matches.map((lut) => (
                  <LutCard
                    key={lut.code}
                    lut={lut}
                    sampleId={sample}
                    onSelect={setSelected}
                  />
                ))}
              </div>
              {!matches.length ? <p>No official LUTs match your search.</p> : null}
            </section>
          ) : (
            <section aria-label="Your LUTs">
              <h2>Your LUTs</h2>
              <p className="fineprint">
                Saved only in this browser. Clearing site data removes your LUTs. Files are not uploaded to a server.
              </p>
              <div className="upload-panel">
                <label>
                  Choose a 3D .cube file{" "}
                  <input
                    type="file"
                    accept=".cube"
                    disabled={working || !uploadsReady}
                    onChange={(e) => {
                      void pickFile(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </label>
                {inspection ? (
                  <>
                    <p>
                      {inspection.title} · {inspection.size}³{" "}
                      {inspection.declaredInputStyle
                        ? `· File tag: ${inspection.declaredInputStyle}`
                        : "· No input color space tag found. Please select one."}
                    </p>
                    <label>
                      Input Photo Style{" "}
                      <select
                        aria-label="Input Photo Style"
                        value={style}
                        disabled={working}
                        onChange={(e) => setStyle(e.target.value)}
                      >
                        <option value="">Select the LUT input</option>
                        {SUPPORTED_UPLOAD_INPUT_STYLES.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                            {s.preview ? "" : " (preview unavailable)"}
                          </option>
                        ))}
                      </select>
                    </label>
                    <p className="fineprint">
                      Use the input specified by the LUT creator. Styles without matching sample inputs can be saved and added to your list, but previews are unavailable.
                    </p>
                    <button
                      className="primary"
                      disabled={!style || working}
                      onClick={() => void saveUpload()}
                    >
                      Save LUT
                    </button>
                  </>
                ) : null}
                {working ? <p role="status">Processing…</p> : null}
                {notice ? <p role="status">{notice}</p> : null}
              </div>
              <div className="grid">
                {uploads.map((u) => (
                  <LutCard
                    key={u.id}
                    lut={u.lut}
                    previewUrl={previews.get(u.lut.code)}
                    sampleId={sample}
                    onSelect={setSelected}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
      {uploadError ? (
        <p role="alert">
          {uploadError}{" "}
          <button className="ghost" onClick={() => void reloadUploads()}>
            Retry loading your LUTs
          </button>
        </p>
      ) : null}
      {selected ? (
        <LutDetail
          key={selected.code}
          lut={selected}
          upload={uploads.find((u) => u.lut.code === selected.code)}
          sampleId={sample}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </main>
  );
}
