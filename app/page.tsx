"use client";

import { useState, useRef } from "react";
import styles from "./page.module.css";
import type { SearchResponse } from "@/types";

const SAMPLE_VIBES = [
  "moody rainy-day library with oak shelves",
  "bright minimalist Scandinavian workspace",
  "cozy Italian espresso bar, marble counters",
  "dark academia reading nook, candlelit",
];

type Status = "idle" | "loading" | "done" | "error";

export default function Home() {
  const [vibe, setVibe] = useState("");
  const [location, setLocation] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    setImageFile(file);
    setVibe("");
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function clearImage() {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit() {
    if (!location.trim()) { setErrorMsg("Please enter a location."); return; }
    if (!vibe.trim() && !imageFile) { setErrorMsg("Enter a vibe or upload an image."); return; }

    setStatus("loading");
    setErrorMsg("");
    setResult(null);

    try {
      let body: Record<string, string>;

      if (imageFile) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(",")[1]);
          reader.onerror = reject;
          reader.readAsDataURL(imageFile);
        });
        body = { type: "image", base64, mimeType: imageFile.type, location: location.trim() };
      } else {
        body = { type: "text", vibe: vibe.trim(), location: location.trim() };
      }

      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Request failed");
      }

      const data: SearchResponse = await res.json();
      setResult(data);
      setStatus("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    }
  }

  const canSubmit = status !== "loading" && !!location.trim() && (!!vibe.trim() || !!imageFile);

  return (
    <main className={styles.main}>
      <div className={styles.hero}>
        <h1 className={styles.title}>VibeSearch</h1>
        <p className={styles.subtitle}>
          Describe an aesthetic or upload a photo — get places that actually match.
        </p>
      </div>

      <div className={styles.card}>
        {!imageFile && (
          <div className={styles.inputGroup}>
            <label className={styles.label}>Describe your vibe</label>
            <textarea
              className={styles.textarea}
              placeholder="e.g. moody, industrial, quiet corner café with exposed brick..."
              value={vibe}
              onChange={(e) => setVibe(e.target.value)}
              rows={3}
            />
          </div>
        )}

        {!vibe.trim() && (
          <>
            {!imageFile && <div className={styles.divider}><span>or upload an image</span></div>}
            <div
              className={styles.uploadZone}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              style={imagePreview ? { padding: 0, overflow: "hidden" } : undefined}
            >
              {imagePreview ? (
                <div className={styles.previewWrapper}>
                  <img src={imagePreview} alt="Preview" className={styles.preview} />
                  <button
                    className={styles.clearImage}
                    onClick={(e) => { e.stopPropagation(); clearImage(); }}
                  >
                    ✕ Remove
                  </button>
                </div>
              ) : (
                <>
                  <p>Drag & drop or click to upload</p>
                  <p className={styles.uploadHint}>JPG, PNG, WEBP</p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </>
        )}

        <div className={styles.inputGroup}>
          <label className={styles.label}>Location</label>
          <input
            className={styles.input}
            placeholder="e.g. Montreal, QC"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && canSubmit) handleSubmit(); }}
          />
        </div>

        {errorMsg && <p className={styles.error}>{errorMsg}</p>}

        <button className={styles.button} onClick={handleSubmit} disabled={!canSubmit}>
          {status === "loading" ? "Searching…" : "Find places →"}
        </button>
      </div>

      {result?.vibe && (
        <div className={styles.vibePreview}>
          <p className={styles.label}>Extracted vibe</p>
          <p className={styles.moodText}>{result.vibe.mood}</p>
          <div className={styles.chips}>
            {result.vibe.keywords.map((k) => (
              <span key={k} className={styles.chip}>{k}</span>
            ))}
          </div>
        </div>
      )}

      {status === "idle" && (
        <div className={styles.samples}>
          <p className={styles.samplesLabel}>Try a vibe</p>
          <div className={styles.chips}>
            {SAMPLE_VIBES.map((s) => (
              <button key={s} className={styles.chip} onClick={() => { setVibe(s); clearImage(); }}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}