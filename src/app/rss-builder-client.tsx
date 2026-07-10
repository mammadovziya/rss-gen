"use client";

import {
  Activity,
  Archive,
  Check,
  Code2,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileInput,
  Globe2,
  Image as ImageIcon,
  Link2,
  Lock,
  Moon,
  Plus,
  RefreshCw,
  Rss,
  Save,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  X
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CustomFieldConfig, ExtractionResult, FeedRecipe, SourceConfig } from "@/types";
import type { FeedHealth } from "@/health";

type SelectorField = keyof SourceConfig["selectors"];
type PickField = SelectorField | `custom:${string}`;
type MessageType = "info" | "error";

type BuilderSelection = {
  field: PickField;
  selector: string;
  sample?: string;
  attr?: CustomFieldConfig["attr"];
};

type PrivacySummary = {
  localOnly: boolean;
  privateNetworkTargets: string;
};

type CustomDraft = {
  originalName?: string;
  name: string;
  mode: "selector" | "static";
  value: string;
};

const standardFields: Array<{ field: SelectorField; label: string; icon: typeof Link2 }> = [
  { field: "item", label: "Feed Card", icon: Archive },
  { field: "title", label: "Title", icon: FileInput },
  { field: "link", label: "Link", icon: Link2 },
  { field: "summary", label: "Summary", icon: Eye },
  { field: "image", label: "Image", icon: ImageIcon },
  { field: "date", label: "Date", icon: Activity }
];

const fieldOrder: PickField[] = ["item", "title", "link", "summary", "image", "date"];

const emptySource: SourceConfig = {
  url: "",
  name: "",
  mode: "auto",
  maxItems: 25,
  cacheMinutes: 30,
  includePatterns: [],
  excludePatterns: [],
  preferExistingFeeds: false,
  selectors: {
    item: "",
    title: "",
    link: "",
    summary: "",
    date: "",
    image: ""
  },
  customFields: [],
  browser: {
    waitForSelector: "",
    waitMs: 0,
    userAgent: ""
  },
  feed: {
    title: "",
    description: "",
    language: "en",
    author: "",
    image: "",
    copyright: ""
  }
};

function cloneSource(source: SourceConfig = emptySource): SourceConfig {
  return structuredClone(source);
}

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function splitLines(value: string) {
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function sanitizeCustomName(value: string) {
  return value
    .trim()
    .replace(/[^A-Za-z0-9_-]+/g, "_")
    .replace(/^[^A-Za-z]+/, "")
    .slice(0, 40);
}

async function responseError(response: Response) {
  try {
    const payload = await response.json();
    if (payload.details) {
      return `${payload.error} ${payload.details.map((item: { path: string; message: string }) => `${item.path}: ${item.message}`).join("; ")}`;
    }
    return payload.error || response.statusText;
  } catch {
    return response.statusText;
  }
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(await responseError(response));
  return response.json() as Promise<T>;
}

function customIsComplete(field: CustomFieldConfig) {
  return field.mode === "static" ? Boolean(field.value) : Boolean(field.selector);
}

export function RssBuilderClient() {
  const builderFrameRef = useRef<HTMLIFrameElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<SourceConfig>(() => cloneSource());
  const [feeds, setFeeds] = useState<FeedRecipe[]>([]);
  const [feedHealth, setFeedHealth] = useState<Record<string, FeedHealth>>({});
  const [privacy, setPrivacy] = useState<PrivacySummary | null>(null);
  const [activeFeedId, setActiveFeedId] = useState<string | null>(null);
  const [activePick, setActivePick] = useState<PickField>("item");
  const [selectionSamples, setSelectionSamples] = useState<Record<string, string>>({});
  const [builderHtml, setBuilderHtml] = useState("");
  const [builderMeta, setBuilderMeta] = useState("Ready");
  const [preview, setPreview] = useState<ExtractionResult | null>(null);
  const [lastAdHocUrl, setLastAdHocUrl] = useState("");
  const [lastSavedUrl, setLastSavedUrl] = useState("");
  const [message, setMessage] = useState<{ text: string; type: MessageType } | null>(null);
  const [busy, setBusy] = useState("");
  const [customDraft, setCustomDraft] = useState<CustomDraft | null>(null);
  const [lightMode, setLightMode] = useState(false);

  const currentSelections = useMemo(() => {
    const selections: Record<string, string> = {};
    for (const { field } of standardFields) {
      const value = source.selectors[field];
      if (value) selections[field] = value;
    }
    for (const field of source.customFields) {
      if (field.mode !== "static" && field.selector) selections[`custom:${field.name}`] = field.selector;
    }
    return selections;
  }, [source.customFields, source.selectors]);

  const customRows = useMemo(
    () =>
      source.customFields.map((field) => ({
        field: `custom:${field.name}` as PickField,
        label: field.name,
        selector: field.mode === "static" ? field.value : field.selector,
        sample: field.mode === "static" ? `Fixed value: ${field.value}` : selectionSamples[`custom:${field.name}`],
        mode: field.mode,
        custom: true
      })),
    [selectionSamples, source.customFields]
  );

  const selectionRows = useMemo(
    () => [
      ...standardFields.map(({ field, label, icon }) => ({
        field: field as PickField,
        label,
        icon,
        selector: source.selectors[field],
        sample: selectionSamples[field],
        custom: false,
        mode: "selector" as const
      })),
      ...customRows
    ],
    [customRows, selectionSamples, source.selectors]
  );

  const activePickLabel = labelForPick(activePick, source.customFields);

  const showMessage = useCallback((text: string, type: MessageType = "info") => {
    setMessage({ text, type });
  }, []);

  const loadFeeds = useCallback(async () => {
    const [feedPayload, healthPayload] = await Promise.all([
      requestJson<{ feeds: FeedRecipe[] }>("/api/feeds"),
      requestJson<{ health: Record<string, FeedHealth> }>("/api/feed-health").catch(() => ({ health: {} }))
    ]);
    setFeeds(feedPayload.feeds);
    setFeedHealth(healthPayload.health);
  }, []);

  const loadPrivacy = useCallback(async () => {
    try {
      const payload = await requestJson<{ privacy: PrivacySummary }>("/api/privacy");
      setPrivacy(payload.privacy);
    } catch {
      setPrivacy(null);
    }
  }, []);

  useEffect(() => {
    void loadFeeds();
    void loadPrivacy();
  }, [loadFeeds, loadPrivacy]);

  const postBuilderState = useCallback(() => {
    const frame = builderFrameRef.current?.contentWindow;
    if (!frame) return;
    frame.postMessage(
      {
        type: "rss-builder-state",
        activeField: activePick,
        itemSelector: source.selectors.item,
        selections: currentSelections
      },
      "*"
    );
  }, [activePick, currentSelections, source.selectors.item]);

  useEffect(() => {
    postBuilderState();
  }, [postBuilderState]);

  const setNestedSource = useCallback(<K extends keyof SourceConfig>(key: K, value: SourceConfig[K]) => {
    setSource((current) => ({ ...current, [key]: value }));
  }, []);

  const updateSelector = useCallback((field: SelectorField, value: string) => {
    setSource((current) => ({
      ...current,
      selectors: {
        ...current.selectors,
        [field]: value
      }
    }));
  }, []);

  const updateBrowser = useCallback(<K extends keyof SourceConfig["browser"]>(key: K, value: SourceConfig["browser"][K]) => {
    setSource((current) => ({
      ...current,
      browser: {
        ...current.browser,
        [key]: value
      }
    }));
  }, []);

  const updateFeed = useCallback(<K extends keyof SourceConfig["feed"]>(key: K, value: SourceConfig["feed"][K]) => {
    setSource((current) => ({
      ...current,
      feed: {
        ...current.feed,
        [key]: value
      }
    }));
  }, []);

  const openBuilder = useCallback(async () => {
    setBusy("Opening page");
    setMessage(null);
    try {
      const payload = await requestJson<{ snapshot: { html: string; strategy: string; status?: number; issues: Array<{ message: string }> } }>(
        "/api/builder-page",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(source)
        }
      );
      setBuilderHtml(payload.snapshot.html);
      setBuilderMeta(`${payload.snapshot.strategy} ${payload.snapshot.status || "OK"}`);
      if (payload.snapshot.issues.length > 0) {
        showMessage(payload.snapshot.issues[0].message, "error");
      } else {
        showMessage("Page opened. Click inside the preview to build the feed.");
      }
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Could not open page.", "error");
    } finally {
      setBusy("");
    }
  }, [showMessage, source]);

  const previewFeed = useCallback(async () => {
    setBusy("Extracting");
    setMessage(null);
    try {
      const payload = await requestJson<{ result: ExtractionResult; rssUrl: string }>("/api/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(source)
      });
      setPreview(payload.result);
      setLastAdHocUrl(payload.rssUrl);
      showMessage("Preview complete.");
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Preview failed.", "error");
    } finally {
      setBusy("");
    }
  }, [showMessage, source]);

  const saveFeed = useCallback(async () => {
    setBusy("Saving");
    setMessage(null);
    try {
      const payload = await requestJson<{ feed: FeedRecipe; rssUrl: string }>(activeFeedId ? `/api/feeds/${activeFeedId}` : "/api/feeds", {
        method: activeFeedId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(source)
      });
      setActiveFeedId(payload.feed.id);
      setLastSavedUrl(payload.rssUrl);
      setSource(cloneSource(payload.feed));
      await loadFeeds();
      showMessage("Feed saved.");
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Could not save feed.", "error");
    } finally {
      setBusy("");
    }
  }, [activeFeedId, loadFeeds, showMessage, source]);

  const selectFeed = useCallback(
    async (id: string) => {
      setBusy("Loading");
      try {
        const payload = await requestJson<{ feed: FeedRecipe }>(`/api/feeds/${id}`);
        setActiveFeedId(payload.feed.id);
        setSource(cloneSource(payload.feed));
        setSelectionSamples({});
        setBuilderHtml("");
        setPreview(null);
        setLastSavedUrl(`${location.origin}/rss/${payload.feed.id}.xml`);
        showMessage("Feed loaded.");
      } catch (error) {
        showMessage(error instanceof Error ? error.message : "Could not load feed.", "error");
      } finally {
        setBusy("");
      }
    },
    [showMessage]
  );

  const deleteFeed = useCallback(async () => {
    if (!activeFeedId) return;
    setBusy("Deleting");
    try {
      const response = await fetch(`/api/feeds/${activeFeedId}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await responseError(response));
      setActiveFeedId(null);
      setSource(cloneSource());
      setSelectionSamples({});
      setBuilderHtml("");
      setPreview(null);
      setLastSavedUrl("");
      await loadFeeds();
      showMessage("Feed deleted.");
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Could not delete feed.", "error");
    } finally {
      setBusy("");
    }
  }, [activeFeedId, loadFeeds, showMessage]);

  const testFeed = useCallback(
    async (id: string) => {
      setFeedHealth((current) => ({ ...current, [id]: { id, status: "unknown", issues: [] } }));
      try {
        const payload = await requestJson<{ health: FeedHealth }>(`/api/feeds/${id}/test`, { method: "POST" });
        setFeedHealth((current) => ({ ...current, [id]: payload.health }));
        showMessage(`${healthLabel(payload.health)}: ${healthSummary(payload.health)}`, payload.health.status === "error" ? "error" : "info");
      } catch (error) {
        showMessage(error instanceof Error ? error.message : "Health check failed.", "error");
      }
    },
    [showMessage]
  );

  const applyVisualSelection = useCallback(
    (selection: BuilderSelection) => {
      if (!selection.selector) return;
      if (selection.field.startsWith("custom:")) {
        const name = selection.field.slice("custom:".length);
        setSource((current) => ({
          ...current,
          customFields: current.customFields.map((field) =>
            field.name === name
              ? { ...field, mode: "selector", selector: selection.selector, value: "", attr: selection.attr || "text" }
              : field
          )
        }));
      } else {
        updateSelector(selection.field, selection.selector);
      }
      setSelectionSamples((current) => ({ ...current, [selection.field]: selection.sample || selection.selector }));
      const currentIndex = fieldOrder.indexOf(selection.field);
      if (currentIndex >= 0 && currentIndex < fieldOrder.length - 1) {
        setActivePick(fieldOrder[currentIndex + 1]);
      }
      showMessage(`${labelForPick(selection.field, source.customFields)} selected.`);
    },
    [showMessage, source.customFields, updateSelector]
  );

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (!event.data || event.data.type !== "rss-builder-selection") return;
      applyVisualSelection(event.data.selection as BuilderSelection);
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [applyVisualSelection]);

  function resetFeed() {
    setActiveFeedId(null);
    setSource(cloneSource());
    setSelectionSamples({});
    setBuilderHtml("");
    setPreview(null);
    setLastAdHocUrl("");
    setLastSavedUrl("");
    setActivePick("item");
    setCustomDraft(null);
    showMessage("New feed ready.");
  }

  function clearPicks() {
    setSource((current) => ({ ...current, selectors: cloneSource().selectors, customFields: [] }));
    setSelectionSamples({});
    setActivePick("item");
    setCustomDraft(null);
    showMessage("Selections cleared.");
  }

  function openCustomDraft(field?: CustomFieldConfig) {
    setCustomDraft({
      originalName: field?.name,
      name: field?.name || "",
      mode: field?.mode === "static" ? "static" : "selector",
      value: field?.value || ""
    });
  }

  function confirmCustomDraft() {
    if (!customDraft) return;
    const name = sanitizeCustomName(customDraft.name);
    if (!name) {
      showMessage("Enter a field name.", "error");
      return;
    }
    if (customDraft.mode === "static" && !customDraft.value.trim()) {
      showMessage("Enter a fixed value.", "error");
      return;
    }

    setSource((current) => {
      const fields = current.customFields.filter((field) => field.name !== customDraft.originalName && field.name !== name);
      const previous = current.customFields.find((field) => field.name === name || field.name === customDraft.originalName);
      const nextField: CustomFieldConfig =
        customDraft.mode === "static"
          ? { name, mode: "static", value: customDraft.value.trim(), selector: "", attr: "text" }
          : {
              name,
              mode: "selector",
              value: "",
              selector: previous?.mode === "selector" ? previous.selector : "",
              attr: previous?.attr || "text"
            };
      return { ...current, customFields: [...fields, nextField] };
    });
    setCustomDraft(null);
    if (customDraft.mode === "selector") {
      setActivePick(`custom:${name}`);
      if (!builderHtml && source.url) void openBuilder();
    } else {
      setSelectionSamples((current) => ({ ...current, [`custom:${name}`]: customDraft.value.trim() }));
      showMessage("Custom field saved.");
    }
  }

  async function copyText(value: string) {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    showMessage("Copied.");
  }

  async function exportBackup() {
    try {
      const response = await fetch("/api/export");
      if (!response.ok) throw new Error(await responseError(response));
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `rss-generator-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Could not export backup.", "error");
    }
  }

  async function importBackup(file: File | undefined) {
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      await requestJson("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feeds: payload.feeds || [], mode: "merge" })
      });
      await loadFeeds();
      showMessage("Backup imported.");
    } catch {
      showMessage("Could not import backup.", "error");
    } finally {
      if (importInputRef.current) importInputRef.current.value = "";
    }
  }

  return (
    <div className={cx("app-frame", lightMode && "light-mode")}>
      <div className="grid-bg" aria-hidden="true" />
      <header className="app-topbar">
        <button className="icon-button" type="button" aria-label="RSS Gen">
          <Code2 size={18} />
        </button>
        <button className="icon-button" type="button" aria-label="Toggle theme" onClick={() => setLightMode((value) => !value)}>
          {lightMode ? <Moon size={18} /> : <Sun size={18} />}
        </button>
      </header>

      <main className="workspace">
        <section className="hero-panel">
          <div className="hero-copy">
            <div className="brand-chip">
              <Rss size={15} />
              Local RSS builder
            </div>
            <h1>Generate RSS feeds from pages that never had one.</h1>
            <p>Open a website, click one repeated card, choose the fields visually, and save a reusable feed recipe.</p>
          </div>

          <div className="url-card">
            <div className="url-input-wrap">
              <span className="input-icon">
                <Link2 size={18} />
              </span>
              <input
                className="url-input"
                value={source.url}
                onChange={(event) => setNestedSource("url", event.target.value)}
                placeholder="https://example.com/news"
                type="url"
              />
            </div>
            <button className="primary-action" type="button" onClick={openBuilder} disabled={Boolean(busy)}>
              {busy === "Opening page" ? "Opening" : "Open Page"}
            </button>
          </div>

          {message && <div className={cx("message-bar", message.type === "error" && "error")}>{message.text}</div>}
        </section>

        <section className="app-grid">
          <aside className="side-panel">
            <PanelHeader icon={Lock} title="Private feeds" meta="Local only" action={<button className="mini-icon" onClick={resetFeed} type="button"><Plus size={15} /></button>} />
            <div className="privacy-line">
              <span className={cx("status-dot", privacy?.localOnly === false && "warn")} />
              {privacy ? (privacy.localOnly ? "Local-only server" : "Network exposed") : "Checking privacy"}
            </div>
            <div className="backup-actions">
              <button className="ghost-button" type="button" onClick={exportBackup}>
                <Download size={14} /> Export
              </button>
              <button className="ghost-button" type="button" onClick={() => importInputRef.current?.click()}>
                <Upload size={14} /> Import
              </button>
              <input ref={importInputRef} hidden type="file" accept="application/json,.json" onChange={(event) => void importBackup(event.target.files?.[0])} />
            </div>
            <div className="feed-list">
              {feeds.length === 0 ? (
                <p className="empty-text">No saved feeds yet</p>
              ) : (
                feeds.map((feed) => (
                  <div className={cx("feed-row", activeFeedId === feed.id && "active")} key={feed.id}>
                    <button type="button" onClick={() => void selectFeed(feed.id)}>
                      <strong>{feed.name || feed.feed.title || new URL(feed.url).hostname}</strong>
                      <span>{feed.url}</span>
                      <small>{healthSummary(feedHealth[feed.id])}</small>
                    </button>
                    <button className={cx("health-pill", healthClass(feedHealth[feed.id]))} type="button" onClick={() => void testFeed(feed.id)}>
                      {healthLabel(feedHealth[feed.id])}
                    </button>
                  </div>
                ))
              )}
            </div>
          </aside>

          <section className="builder-panel">
            <div className="panel-title-row">
              <div>
                <span className="eyebrow">Builder</span>
                <h2>Choose {activePickLabel}</h2>
              </div>
              <span className="active-token">{activePickLabel}</span>
            </div>

            <div className="pick-toolbar">
              {standardFields.map(({ field, label, icon: Icon }) => (
                <button
                  key={field}
                  className={cx("pick-chip", activePick === field && "active", currentSelections[field] && "done")}
                  type="button"
                  onClick={() => setActivePick(field)}
                >
                  <Icon size={14} />
                  {label}
                  {currentSelections[field] && <Check size={12} />}
                </button>
              ))}
              <button className="pick-chip dashed" type="button" onClick={() => openCustomDraft()}>
                <Plus size={14} />
                Custom Data
              </button>
            </div>

            {customDraft && (
              <div className="custom-panel">
                <label>
                  <span>Field name</span>
                  <input value={customDraft.name} onChange={(event) => setCustomDraft({ ...customDraft, name: event.target.value })} placeholder="source" />
                </label>
                <fieldset>
                  <legend>Value source</legend>
                  <div className="mode-switch">
                    <button className={cx(customDraft.mode === "selector" && "selected")} type="button" onClick={() => setCustomDraft({ ...customDraft, mode: "selector" })}>
                      Pick from page
                    </button>
                    <button className={cx(customDraft.mode === "static" && "selected")} type="button" onClick={() => setCustomDraft({ ...customDraft, mode: "static" })}>
                      Fixed value
                    </button>
                  </div>
                </fieldset>
                {customDraft.mode === "static" && (
                  <label className="wide-field">
                    <span>Value</span>
                    <input value={customDraft.value} onChange={(event) => setCustomDraft({ ...customDraft, value: event.target.value })} placeholder="Manual value" />
                  </label>
                )}
                <div className="custom-actions">
                  <button className="primary-action compact" type="button" onClick={confirmCustomDraft}>
                    {customDraft.mode === "static" ? "Add Field" : "Pick Field"}
                  </button>
                  <button className="ghost-button" type="button" onClick={() => setCustomDraft(null)}>
                    <X size={14} /> Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="selection-list">
              {selectionRows.map((row) => {
                const Icon = "icon" in row && row.icon ? row.icon : Sparkles;
                return (
                  <div className="selection-row" key={row.field}>
                    <div className="selection-label">
                      <Icon size={15} />
                      <strong>{row.label}</strong>
                    </div>
                    <span>{row.sample || row.selector || "Not selected"}</span>
                    <div className="selection-actions">
                      {row.custom && row.mode === "static" ? (
                        <button className="mini-button" type="button" onClick={() => openCustomDraft(source.customFields.find((field) => field.name === row.label))}>
                          Change
                        </button>
                      ) : (
                        <button
                          className="mini-button"
                          type="button"
                          onClick={() => {
                            setActivePick(row.field);
                            if (!builderHtml && source.url) void openBuilder();
                          }}
                        >
                          {row.selector ? "Change" : "Pick"}
                        </button>
                      )}
                      {row.custom && (
                        <button
                          className="mini-button danger"
                          type="button"
                          onClick={() =>
                            setSource((current) => ({
                              ...current,
                              customFields: current.customFields.filter((field) => field.name !== row.label)
                            }))
                          }
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="builder-actions">
              <button className="ghost-button" type="button" onClick={clearPicks}>
                <Trash2 size={14} /> Clear Picks
              </button>
              <button className="ghost-button" type="button" onClick={previewFeed} disabled={Boolean(busy)}>
                <Eye size={14} /> Preview
              </button>
              <button className="primary-action compact" type="button" onClick={saveFeed} disabled={Boolean(busy)}>
                <Save size={15} /> Save
              </button>
              {activeFeedId && (
                <button className="ghost-button danger-text" type="button" onClick={deleteFeed} disabled={Boolean(busy)}>
                  <Trash2 size={14} /> Delete
                </button>
              )}
            </div>

            {builderHtml && (
              <div className="iframe-shell">
                <div className="iframe-bar">
                  <span>{activePick === "item" ? "Click one repeated card." : `Click ${activePickLabel} inside the selected card.`}</span>
                  <span>{builderMeta}</span>
                </div>
                <iframe ref={builderFrameRef} title="Visual feed builder" sandbox="allow-scripts allow-forms allow-popups" srcDoc={builderHtml} onLoad={postBuilderState} />
              </div>
            )}

            <details className="settings-panel">
              <summary>Feed Settings</summary>
              <div className="form-grid">
                <Field label="Name" value={source.name} onChange={(value) => setNestedSource("name", value)} placeholder="Example News" />
                <Field label="Max items" value={String(source.maxItems)} onChange={(value) => setNestedSource("maxItems", Number(value || 25))} type="number" />
                <Field label="Feed title" value={source.feed.title} onChange={(value) => updateFeed("title", value)} />
                <Field label="Language" value={source.feed.language} onChange={(value) => updateFeed("language", value)} />
                <label className="field wide-field">
                  <span>Description</span>
                  <textarea value={source.feed.description} onChange={(event) => updateFeed("description", event.target.value)} />
                </label>
                <Field label="Author" value={source.feed.author} onChange={(value) => updateFeed("author", value)} />
                <Field label="Feed image URL" value={source.feed.image} onChange={(value) => updateFeed("image", value)} />
              </div>
            </details>

            <details className="settings-panel">
              <summary>Advanced</summary>
              <div className="form-grid">
                <label className="field">
                  <span>Render mode</span>
                  <div className="mode-switch">
                    {(["auto", "static", "browser"] as const).map((mode) => (
                      <button key={mode} className={cx(source.mode === mode && "selected")} type="button" onClick={() => setNestedSource("mode", mode)}>
                        {mode}
                      </button>
                    ))}
                  </div>
                </label>
                <Field label="Cache minutes" value={String(source.cacheMinutes)} onChange={(value) => setNestedSource("cacheMinutes", Number(value || 30))} type="number" />
                <label className="field">
                  <span>Include patterns</span>
                  <textarea value={source.includePatterns.join("\n")} onChange={(event) => setNestedSource("includePatterns", splitLines(event.target.value))} />
                </label>
                <label className="field">
                  <span>Exclude patterns</span>
                  <textarea value={source.excludePatterns.join("\n")} onChange={(event) => setNestedSource("excludePatterns", splitLines(event.target.value))} placeholder="privacy, login, /sponsored/i" />
                </label>
                <Field label="Wait for selector" value={source.browser.waitForSelector} onChange={(value) => updateBrowser("waitForSelector", value)} />
                <Field label="Extra wait ms" value={String(source.browser.waitMs)} onChange={(value) => updateBrowser("waitMs", Number(value || 0))} type="number" />
                <Field label="User agent" value={source.browser.userAgent} onChange={(value) => updateBrowser("userAgent", value)} />
                {standardFields.map(({ field, label }) => (
                  <Field key={field} label={`${label} selector`} value={source.selectors[field]} onChange={(value) => updateSelector(field, value)} />
                ))}
              </div>
            </details>
          </section>

          <aside className="preview-panel">
            <PanelHeader icon={Globe2} title="Preview" meta={preview ? `${preview.items.length} items` : "Ready"} />
            <div className="rss-url-box">
              <code>{lastSavedUrl || lastAdHocUrl || "Run preview to generate an RSS URL"}</code>
              <button className="mini-icon" type="button" onClick={() => void copyText(lastSavedUrl || lastAdHocUrl)} disabled={!lastSavedUrl && !lastAdHocUrl}>
                <Copy size={14} />
              </button>
            </div>
            {!preview ? (
              <div className="empty-preview">
                <Rss size={26} />
                <h3>No preview yet</h3>
                <p>Open a page or run preview to inspect extracted feed items.</p>
              </div>
            ) : (
              <div className="preview-content">
                <div className="metrics-grid">
                  <Metric label="Source" value={preview.title || new URL(preview.finalUrl).hostname} />
                  <Metric label="Mode" value={preview.strategy} />
                  <Metric label="Status" value={preview.blocked ? "Blocked" : String(preview.status || "OK")} />
                </div>
                {preview.issues.length > 0 && (
                  <div className="issue-list">
                    {preview.issues.map((issue) => (
                      <div key={issue.code}>{issue.message}</div>
                    ))}
                  </div>
                )}
                {preview.existingFeeds.length > 0 && (
                  <div className="existing-feeds">
                    {preview.existingFeeds.map((feed) => (
                      <a href={feed.url} key={feed.url} target="_blank" rel="noreferrer">
                        Existing feed: {feed.title || feed.url}
                        <ExternalLink size={12} />
                      </a>
                    ))}
                  </div>
                )}
                <div className="preview-items">
                  {preview.items.map((item) => (
                    <article className="preview-item" key={item.guid || item.link}>
                      <a href={item.link} target="_blank" rel="noreferrer">
                        {item.title}
                      </a>
                      <div className="item-meta">
                        {item.date && <span>{new Date(item.date).toLocaleString()}</span>}
                        {item.image && <span>Image</span>}
                        {Object.entries(item.custom || {}).map(([name, value]) => (
                          <span key={name}>{name}: {value}</span>
                        ))}
                      </div>
                      {item.summary && <p>{item.summary}</p>}
                    </article>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </section>
      </main>

      <footer className="site-footer">Generated by Ziya</footer>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} type={type} />
    </label>
  );
}

function PanelHeader({
  icon: Icon,
  title,
  meta,
  action
}: {
  icon: typeof Link2;
  title: string;
  meta: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="panel-header">
      <div className="panel-title">
        <span className="panel-icon">
          <Icon size={16} />
        </span>
        <strong>{title}</strong>
        <em>{meta}</em>
      </div>
      {action}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function labelForPick(field: PickField, customFields: CustomFieldConfig[]) {
  if (field.startsWith("custom:")) {
    const name = field.slice("custom:".length);
    return customFields.find((item) => item.name === name)?.name || name;
  }
  return standardFields.find((item) => item.field === field)?.label || field;
}

function healthClass(health?: FeedHealth) {
  return health?.status || "unknown";
}

function healthLabel(health?: FeedHealth) {
  if (!health?.status) return "Unknown";
  if (health.status === "ok") return "OK";
  if (health.status === "warning") return "Check";
  if (health.status === "error") return "Error";
  return "Unknown";
}

function healthSummary(health?: FeedHealth) {
  if (!health?.checkedAt) return "Not tested";
  if (health.status === "error") return health.error || "Error";
  const count = typeof health.itemCount === "number" ? `${health.itemCount} items` : "Unknown";
  return `${count} · ${new Date(health.checkedAt).toLocaleString()}`;
}
