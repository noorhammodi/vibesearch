"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import ImageUpload from "@/components/ImageUpload";

const MontrealMap = dynamic(() => import("@/components/MontrealMap"), {
  ssr: false,
});

type ShopResult = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  address?: string;
  summary: string;
};

const VIBE_TAGS = [
  "Cozy & quiet",
  "Study spot",
  "Brunch vibes",
  "Laptop-friendly",
  "Date spot",
  "Specialty coffee",
  "Outdoor terasse",
  "Natural light",
];

const NEIGHBORHOODS = [
  "Le Plateau", "Mile End", "Old Montréal", "Rosemont",
  "Villeray", "Westmount", "NDG", "Verdun",
];

export default function Home() {
  const [vibes, setVibes] = useState("");
  const [results, setResults] = useState<
    Array<{ shop: ShopResult; score: number; reason: string; rank?: number }>
  >([]);
  const [detectedVibes, setDetectedVibes] = useState<string | null>(null);
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [requestedTopN, setRequestedTopN] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [submitterName, setSubmitterName] = useState("");
  const [shopName, setShopName] = useState("");
  const [suggestAddress, setSuggestAddress] = useState("");
  const [suggestVibe, setSuggestVibe] = useState("");
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [suggestSuccess, setSuggestSuccess] = useState(false);

  async function runSearch(nextTopN: number, vibesOverride?: string) {
    const trimmed = (vibesOverride ?? vibes).trim();
    if (!trimmed) {
      setError("Describe your vibe in a few words.");
      return;
    }
    if (vibesOverride) setVibes(vibesOverride);

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vibes: trimmed, topN: nextTopN }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(
          typeof data.error === "string" ? data.error : `Search failed (${res.status})`
        );
      }

      const incoming = Array.isArray(data.results)
        ? (data.results as Array<{ shop: ShopResult; score: number; reason: string; rank?: number }>)
        : [];

      const seen = new Set<string>();
      const merged: typeof incoming = [];
      for (const r of incoming) {
        const id = r?.shop?.id;
        if (!id || seen.has(id)) continue;
        seen.add(id);
        merged.push(r);
      }

      setResults(merged);
      if (merged.length > 0) setSelectedShopId(merged[0].shop.id);
      setRequestedTopN(nextTopN);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResults([]);
    setSelectedShopId(null);
    setDetectedVibes(null);
    setRequestedTopN(3);
    await runSearch(3);
  }

  const handleDetectedVibes = (detected: string) => {
    setDetectedVibes(detected);
    setVibes(detected);
    setError(null);
    setResults([]);
    setSelectedShopId(null);
    setRequestedTopN(3);
    setTimeout(() => runSearch(3, detected), 0);
  };

  async function handleSuggestSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!shopName.trim() || !suggestAddress.trim() || !suggestVibe.trim()) {
      setSuggestError("Café name, address, and vibe are required.");
      return;
    }
    setSuggestLoading(true);
    setSuggestError(null);
    setSuggestSuccess(false);
    try {
      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submitterName: submitterName.trim(),
          shopName: shopName.trim(),
          address: suggestAddress.trim(),
          vibe: suggestVibe.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(typeof data.error === "string" ? data.error : "Failed to save suggestion");
      }
      setSuggestSuccess(true);
      setSubmitterName("");
      setShopName("");
      setSuggestAddress("");
      setSuggestVibe("");
      setTimeout(() => setSuggestSuccess(false), 4000);
    } catch (err: unknown) {
      setSuggestError(err instanceof Error ? err.message : "Failed to save suggestion");
    } finally {
      setSuggestLoading(false);
    }
  }

  function mapsUrl(shop: ShopResult) {
    return `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(shop.id)}`;
  }

  const handleSelectShop = useCallback((shopId: string) => {
    setSelectedShopId(shopId);
    const card = document.querySelector<HTMLElement>(`[data-shop-id="${shopId}"]`);
    card?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className="bg-[#3a1520] text-[#F4F2EF] min-h-screen">

      {/* ── NAV ── */}
      <nav className="sticky top-0 z-20 flex items-center justify-between px-10 h-[60px] bg-[#1c0c10] border-b border-white/5">
        <div className="flex items-center gap-3">
          <svg width="26" height="26" viewBox="0 0 28 28">
            <circle cx="14" cy="14" r="13" fill="#60212E"/>
            <path d="M8 12 Q14 9 20 12" stroke="#94B6EF" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
            <circle cx="10" cy="15" r="2" fill="#F4F2EF" opacity="0.6"/>
            <circle cx="18" cy="15" r="2" fill="#F4F2EF" opacity="0.6"/>
            <path d="M10 18.5 Q14 21 18 18.5" stroke="#F4F2EF" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.75"/>
            <path d="M20 10.5 Q23.5 8.5 23.5 11.5 Q23.5 13.5 20 12.5" stroke="#94B6EF" strokeWidth="0.9" fill="none" strokeLinecap="round"/>
          </svg>
          <span className="font-[family-name:var(--font-playfair)] text-[15px] tracking-wide">VibeSearch</span>
        </div>
        <div className="flex items-center gap-8">
          <button onClick={() => scrollTo("vibe-search")} className="text-[11px] tracking-[0.15em] uppercase text-white/50 hover:text-white/80 transition">Search</button>
          <button onClick={() => scrollTo("suggest-section")} className="text-[11px] tracking-[0.15em] uppercase text-white/50 hover:text-white/80 transition">Suggest a café</button>
          <button onClick={() => scrollTo("vibe-search")} className="text-[10px] tracking-[0.15em] uppercase bg-[#F4F2EF] text-[#1c0c10] px-[18px] py-[7px] font-medium">Explore cafés</button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="bg-[#60212E] grid grid-cols-2 min-h-screen border-b border-white/5">
        <div className="px-10 py-16 flex flex-col justify-end border-r border-white/10">
          <p className="text-[10px] tracking-[0.22em] uppercase text-white/40 mb-5">Montréal · Est. 2024</p>
          <h1 className="font-[family-name:var(--font-playfair)] text-[64px] font-black leading-[0.95] text-[#F4F2EF]">
            Vibe<br/>
            <em className="text-white/25">Search</em><br/>
            <span className="text-[#94B6EF] not-italic block">Mtl</span>
          </h1>
          <p className="mt-6 text-[12px] leading-[1.8] text-white/50 max-w-[280px] tracking-[0.03em]">
            Discover Montréal one cup at a time. Every neighbourhood, every vibe, every hidden gem — mapped and curated for you.
          </p>
          <div className="mt-8 flex gap-3">
            <button onClick={() => scrollTo("vibe-search")} className="bg-[#F4F2EF] text-[#1c0c10] px-7 py-3 text-[11px] tracking-[0.14em] uppercase font-medium">
              Explore the map
            </button>
            <button onClick={() => scrollTo("suggest-section")} className="border border-white/30 text-[#F4F2EF] px-6 py-3 text-[11px] tracking-[0.14em] uppercase">
              Submit a café
            </button>
          </div>
        </div>
        <div className="bg-[#4a1924] flex flex-col items-center justify-center py-10">
          <svg width="140" height="140" viewBox="0 0 140 140">
            <circle cx="70" cy="70" r="66" fill="none" stroke="rgba(244,242,239,0.05)" strokeWidth="1"/>
            <circle cx="70" cy="70" r="44" fill="none" stroke="rgba(244,242,239,0.04)" strokeWidth="1"/>
            <ellipse cx="70" cy="86" rx="38" ry="22" fill="rgba(28,12,16,0.7)"/>
            <ellipse cx="70" cy="84" rx="34" ry="18" fill="rgba(148,182,239,0.08)"/>
            <path d="M42 62 Q70 52 98 62" stroke="#94B6EF" strokeWidth="2" fill="none" strokeLinecap="round"/>
            <circle cx="54" cy="72" r="5.5" fill="#F4F2EF" opacity="0.5"/>
            <circle cx="86" cy="72" r="5.5" fill="#F4F2EF" opacity="0.5"/>
            <path d="M54 86 Q70 94 86 86" stroke="#F4F2EF" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.8"/>
            <path d="M96 56 Q110 48 110 58 Q110 66 96 63" stroke="#94B6EF" strokeWidth="1.6" fill="none" strokeLinecap="round"/>
            <path d="M62 36 Q70 26 78 36" stroke="rgba(148,182,239,0.3)" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
          </svg>
          <p className="text-[10px] tracking-[0.2em] uppercase text-white/20 mt-5">Your guide to Montréal's café scene</p>
        </div>
      </section>

      {/* ── TICKER ── */}
      <div className="bg-[#94B6EF] h-9 flex items-center overflow-hidden">
        <div className="flex whitespace-nowrap animate-ticker">
          {[...NEIGHBORHOODS, ...NEIGHBORHOODS].map((n, i) => (
            <span key={i} className={i % 2 === 1 ? "text-[#60212E] px-7 text-[10px] tracking-[0.2em] uppercase font-medium" : "text-[#1c0c10] px-7 text-[10px] tracking-[0.2em] uppercase font-medium"}>
              {i % 2 === 1 ? "◆" : n}
            </span>
          ))}
        </div>
      </div>

      {/* ── MAP SECTION ── */}
      <section className="grid grid-cols-[1fr_1.4fr] border-b border-white/5">
        <div className="px-10 py-16 bg-[#4a1924] flex flex-col justify-center border-r border-white/5">
          <p className="text-[10px] tracking-[0.22em] uppercase text-[#94B6EF] mb-4">The map</p>
          <h2 className="font-[family-name:var(--font-playfair)] text-[40px] font-bold leading-[1.05] text-[#F4F2EF] mb-4">
            Every<br/>borough,<br/><em className="text-white/30">every cup</em>
          </h2>
          <p className="text-[12px] leading-[1.8] text-white/45 max-w-[260px] mb-6">
            An interactive map of the island with neighbourhood zones. Search a vibe to see café pins appear.
          </p>
          {results.length > 0 ? (
            <p className="text-[11px] text-[#94B6EF] tracking-wide">{results.length} spot{results.length !== 1 ? "s" : ""} found</p>
          ) : (
            <div className="flex flex-col gap-2">
              {[["#F4F2EF", "Café location"], ["#94B6EF", "Selected café"]].map(([color, label]) => (
                <div key={label} className="flex items-center gap-3 text-[10px] tracking-[0.08em] text-white/40">
                  <div className="w-3 h-3 rounded-full" style={{ background: color }} />
                  {label}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-[#1c0c10] min-h-[380px]">
          <MontrealMap results={results} selectedShopId={selectedShopId} onSelectShop={handleSelectShop} />
        </div>
      </section>

      {/* ── VIBE SEARCH ── */}
      <section id="vibe-search" className="px-10 py-[72px] bg-[#60212E] border-b border-white/5">
        <div className="flex justify-between items-end mb-10">
          <div>
            <p className="text-[10px] tracking-[0.22em] uppercase text-[#94B6EF] mb-4">Search by vibe</p>
            <h2 className="font-[family-name:var(--font-playfair)] text-[36px] font-bold leading-tight text-[#F4F2EF]">
              What's<br/>the <em className="text-white/30">mood?</em>
            </h2>
          </div>
          <p className="text-[11px] text-white/30 max-w-[200px] leading-[1.7] text-right tracking-[0.04em]">
            Describe your ideal café moment. We'll find your match.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="flex">
            <input
              className="flex-1 bg-[rgba(28,12,16,0.45)] border border-white/12 border-r-0 text-white px-5 py-4 text-[13px] placeholder:text-white/20 outline-none focus:border-[#94B6EF] transition"
              placeholder="cozy, exposed brick, jazz, great oat latte..."
              value={vibes}
              onChange={(e) => setVibes(e.target.value)}
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-[#F4F2EF] text-[#1c0c10] px-7 py-4 text-[10px] tracking-[0.16em] uppercase font-medium disabled:opacity-50 whitespace-nowrap"
            >
              {loading ? "Finding…" : "Find cafés →"}
            </button>
          </div>
        </form>

        <div className="flex gap-2 flex-wrap mt-4">
          {VIBE_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => {
                const v = tag.toLowerCase();
                setVibes(v);
                setError(null);
                setResults([]);
                setSelectedShopId(null);
                setDetectedVibes(null);
                setRequestedTopN(3);
                runSearch(3, v);
              }}
              className="px-4 py-[7px] border border-white/15 text-[10px] tracking-[0.1em] uppercase text-white/45 hover:border-[#94B6EF] hover:text-[#94B6EF] transition"
            >
              {tag}
            </button>
          ))}
        </div>

        {error && <p className="mt-6 text-red-400 text-[13px]">{error}</p>}

        {detectedVibes && (
          <p className="mt-4 text-[#94B6EF] text-[12px]">
            Detected vibes: <span className="italic">{detectedVibes}</span>
          </p>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="mt-12">
            <p className="text-[10px] tracking-[0.2em] uppercase text-[#94B6EF] mb-6">Suggestions</p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-px bg-white/5">
              {results.map((r, i) => (
                <div
                  key={`${r.shop.id}-${i}`}
                  data-shop-id={r.shop.id}
                  onClick={() => handleSelectShop(r.shop.id)}
                  className={`bg-[#60212E] p-6 cursor-pointer transition hover:bg-[#4a1924] ${
                    selectedShopId === r.shop.id ? "outline outline-1 outline-[#94B6EF] bg-[#4a1924]" : ""
                  }`}
                >
                  <div className="flex justify-between items-start gap-4 mb-2">
                    <h3 className="font-[family-name:var(--font-playfair)] text-[18px] text-[#F4F2EF] leading-tight">
                      {i === 0 ? "🥇 " : ""}{r.shop.name}
                    </h3>
                    <span className="text-[11px] text-[#94B6EF] shrink-0 mt-1">{Math.round((r.score ?? 0) * 100)}%</span>
                  </div>
                  <p className="text-[11px] text-white/40 mb-3">{r.shop.address ?? "Montréal"}</p>
                  {r.reason && (
                    <p className="text-[12px] text-white/70 italic leading-relaxed mb-4">{r.reason}</p>
                  )}
                  <a
                    href={mapsUrl(r.shop)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(ev) => ev.stopPropagation()}
                    className="text-[10px] tracking-[0.1em] uppercase text-[#94B6EF] hover:text-[#F4F2EF] transition"
                  >
                    View on map →
                  </a>
                </div>
              ))}
            </div>
            <div className="mt-6">
              <button
                type="button"
                disabled={loading}
                onClick={() => runSearch(Math.min(15, requestedTopN + 4))}
                className="border border-white/15 px-6 py-2 text-[11px] tracking-[0.1em] uppercase text-white/50 hover:border-white/30 hover:text-white/70 transition disabled:opacity-50"
              >
                {loading ? "Loading…" : "Show more"}
              </button>
            </div>
          </div>
        )}

        {results.length === 0 && !loading && (
          <p className="mt-10 text-[12px] text-white/25 tracking-wide">
            Search your vibe to see café suggestions and map pins.
          </p>
        )}
      </section>

      {/* ── IMAGE SECTION ── */}
      <section id="image-section" className="grid grid-cols-[1.4fr_1fr] border-b border-white/5">
        <div className="bg-[#1c0c10] flex flex-col items-center justify-center min-h-[280px] p-12 border-r border-white/5">
          <ImageUpload
            onDetectedVibes={handleDetectedVibes}
            onLoading={setLoading}
            onError={setError}
            isLoading={loading}
          />
        </div>
        <div className="px-10 py-16 bg-[#4a1924] flex flex-col justify-center">
          <p className="text-[10px] tracking-[0.22em] uppercase text-[#94B6EF] mb-4">Search by image</p>
          <h2 className="font-[family-name:var(--font-playfair)] text-[32px] font-bold leading-tight text-[#F4F2EF] mb-4">
            Show us<br/>the <em className="text-white/30">aesthetic</em>
          </h2>
          <p className="text-[12px] leading-[1.8] text-white/45 max-w-[260px]">
            Upload a photo that captures the vibe you're after — a Pinterest save, a screenshot, a mood board. We'll find cafés that match.
          </p>
        </div>
      </section>

      {/* ── SUGGEST SECTION ── */}
      <section id="suggest-section" className="px-10 py-[72px] pb-20 bg-[#3a1520] border-b border-white/5">
        <div className="grid grid-cols-2 gap-10 mb-12 items-end">
          <div>
            <p className="text-[10px] tracking-[0.22em] uppercase text-[#94B6EF] mb-4">Community picks</p>
            <h2 className="font-[family-name:var(--font-playfair)] text-[44px] font-bold leading-tight text-[#F4F2EF]">
              Recommend<br/>a <em className="text-white/30">café</em>
            </h2>
          </div>
          <p className="text-[11px] leading-[1.8] text-white/30 max-w-[280px]">
            Know a hidden gem? Share it with the community. Verified Montréal suggestions influence future search results.
          </p>
        </div>

        <form onSubmit={handleSuggestSubmit}>
          <div className="grid grid-cols-2 gap-px bg-white/5">
            <div className="bg-[#3a1520] p-5 flex flex-col gap-2">
              <label className="text-[9px] tracking-[0.2em] uppercase text-white/28">Café name *</label>
              <input
                className="bg-transparent border-b border-white/10 text-[#F4F2EF] py-2 text-[13px] outline-none placeholder:text-white/18 focus:border-[#94B6EF] transition"
                type="text"
                placeholder="Café Olimpico..."
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="bg-[#3a1520] p-5 flex flex-col gap-2">
              <label className="text-[9px] tracking-[0.2em] uppercase text-white/28">Address *</label>
              <input
                className="bg-transparent border-b border-white/10 text-[#F4F2EF] py-2 text-[13px] outline-none placeholder:text-white/18 focus:border-[#94B6EF] transition"
                type="text"
                placeholder="124 Rue Mont-Royal O, Montréal..."
                value={suggestAddress}
                onChange={(e) => setSuggestAddress(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="bg-[#3a1520] p-5 flex flex-col gap-2 col-span-2">
              <label className="text-[9px] tracking-[0.2em] uppercase text-white/28">Vibe / atmosphere *</label>
              <input
                className="bg-transparent border-b border-white/10 text-[#F4F2EF] py-2 text-[13px] outline-none placeholder:text-white/18 focus:border-[#94B6EF] transition"
                type="text"
                placeholder="Indie, cozy, exposed brick, great pour-overs..."
                value={suggestVibe}
                onChange={(e) => setSuggestVibe(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="bg-[#3a1520] p-5 flex flex-col gap-2">
              <label className="text-[9px] tracking-[0.2em] uppercase text-white/28">Your name (optional)</label>
              <input
                className="bg-transparent border-b border-white/10 text-[#F4F2EF] py-2 text-[13px] outline-none placeholder:text-white/18 focus:border-[#94B6EF] transition"
                type="text"
                placeholder="Marie..."
                value={submitterName}
                onChange={(e) => setSubmitterName(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="bg-[#3a1520] p-5 flex items-end">
              <p className="text-[10px] text-white/18 tracking-[0.06em] leading-relaxed">
                All submissions are verified against Google Places before saving.
              </p>
            </div>
          </div>

          <div className="mt-8 flex items-center gap-5">
            <button
              type="submit"
              disabled={suggestLoading}
              className="bg-[#94B6EF] text-[#1c0c10] px-10 py-4 text-[11px] tracking-[0.14em] uppercase font-medium disabled:opacity-50"
            >
              {suggestLoading ? "Checking & saving…" : "Submit recommendation"}
            </button>
            {suggestSuccess && (
              <span className="text-[10px] text-[#94B6EF] tracking-wide">✓ Added! Thanks for the tip.</span>
            )}
          </div>

          {suggestError && (
            <p className="mt-4 text-red-400 text-[12px]">{suggestError}</p>
          )}
        </form>
      </section>

      {/* ── FOOTER ── */}
      <footer className="grid grid-cols-3 bg-[#1c0c10] border-t border-white/5">
        <div className="p-10 border-r border-white/5">
          <p className="text-[9px] tracking-[0.2em] uppercase text-white/22 mb-4">Brand</p>
          <p className="font-[family-name:var(--font-playfair)] text-[22px] font-bold text-[#F4F2EF]">VibeSearch</p>
          <p className="text-[11px] text-white/22 tracking-[0.05em] mt-1">Montréal · Est. 2024</p>
        </div>
        <div className="p-10 border-r border-white/5">
          <p className="text-[9px] tracking-[0.2em] uppercase text-white/22 mb-4">Navigate</p>
          <div className="flex flex-col gap-3">
            {[["vibe-search", "Search by vibe"], ["image-section", "Search by image"], ["suggest-section", "Submit a café"]].map(([id, label]) => (
              <button key={id} onClick={() => scrollTo(id)} className="text-[11px] tracking-[0.1em] uppercase text-white/35 hover:text-white/60 transition text-left">
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="p-10">
          <p className="text-[9px] tracking-[0.2em] uppercase text-white/22 mb-4">About</p>
          <p className="text-[10px] text-white/15 tracking-[0.06em] leading-[1.7]">
            © 2024 VibeSearch.<br/>Curated Montréal café discovery<br/>powered by AI + community picks.
          </p>
        </div>
      </footer>

    </div>
  );
}
