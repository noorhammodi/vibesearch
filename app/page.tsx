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

  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackHover, setFeedbackHover] = useState(0);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackName, setFeedbackName] = useState("");
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

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
    } catch {
      setError("Something went wrong — will fix that shortly!");
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

  async function handleFeedbackSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!feedbackMessage.trim()) {
      setFeedbackError("Please share your thoughts.");
      return;
    }
    setFeedbackLoading(true);
    setFeedbackError(null);
    setFeedbackSuccess(false);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: feedbackRating || null,
          message: feedbackMessage.trim(),
          name: feedbackName.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(typeof data.error === "string" ? data.error : "Failed to save feedback");
      }
      setFeedbackSuccess(true);
      setFeedbackRating(0);
      setFeedbackMessage("");
      setFeedbackName("");
      setTimeout(() => setFeedbackSuccess(false), 4000);
    } catch (err: unknown) {
      setFeedbackError(err instanceof Error ? err.message : "Failed to save feedback");
    } finally {
      setFeedbackLoading(false);
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
            {/* steam */}
            <path d="M9 8.5 Q10.5 6 9 3.5" stroke="#94B6EF" strokeWidth="1.3" fill="none" strokeLinecap="round" opacity="0.75"/>
            <path d="M15 8.5 Q16.5 6 15 3.5" stroke="#94B6EF" strokeWidth="1.3" fill="none" strokeLinecap="round" opacity="0.5"/>
            {/* mug body */}
            <rect x="3.5" y="9" width="16" height="12" rx="1.8" fill="#60212E" stroke="#F4F2EF" strokeWidth="1.4" opacity="0.9"/>
            {/* handle */}
            <path d="M19.5 11.5 Q25 11.5 25 15 Q25 19 19.5 19" stroke="#F4F2EF" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.8"/>
            {/* coffee surface */}
            <ellipse cx="11.5" cy="11" rx="5.5" ry="1.3" fill="#94B6EF" opacity="0.3"/>
            {/* MTL city skyline */}
            <rect x="3" y="24" width="2.5" height="3" rx="0.3" fill="rgba(148,182,239,0.35)"/>
            <rect x="6.5" y="23" width="2" height="4" rx="0.3" fill="rgba(148,182,239,0.35)"/>
            <rect x="9.5" y="24.5" width="1.8" height="2.5" rx="0.3" fill="rgba(148,182,239,0.25)"/>
            <rect x="12" y="21.5" width="3" height="5.5" rx="0.3" fill="rgba(148,182,239,0.45)"/>
            <rect x="16" y="23" width="2" height="4" rx="0.3" fill="rgba(148,182,239,0.35)"/>
            <rect x="19" y="23.5" width="2.5" height="3.5" rx="0.3" fill="rgba(148,182,239,0.3)"/>
            <line x1="3" y1="27" x2="22" y2="27" stroke="rgba(148,182,239,0.2)" strokeWidth="0.8"/>
          </svg>
          <span className="font-[family-name:var(--font-playfair)] text-[15px] tracking-wide">CafeCrawl Montreal</span>
        </div>
        <div className="flex items-center gap-8">
          <button onClick={() => scrollTo("vibe-search")} className="text-[11px] tracking-[0.15em] uppercase text-white/50 hover:text-white/80 transition">Search</button>
          <button onClick={() => scrollTo("suggest-section")} className="text-[11px] tracking-[0.15em] uppercase text-white/50 hover:text-white/80 transition">Suggest a café</button>
          <button onClick={() => scrollTo("feedback-section")} className="text-[11px] tracking-[0.15em] uppercase text-white/50 hover:text-white/80 transition">Feedback</button>
          <button onClick={() => scrollTo("vibe-search")} className="text-[10px] tracking-[0.15em] uppercase bg-[#F4F2EF] text-[#1c0c10] px-[18px] py-[7px] font-medium">Explore cafés</button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="bg-[#60212E] grid grid-cols-2 border-b border-white/5" style={{ minHeight: "calc(100vh - 60px - 44px)" }}>
        <div className="px-10 py-16 flex flex-col justify-end border-r border-white/10">
          <p className="text-[10px] tracking-[0.22em] uppercase text-white/40 mb-5">Montréal · Est. 2026</p>
          <h1 className="font-[family-name:var(--font-playfair)] text-[64px] font-black leading-[0.95] text-[#F4F2EF]">
            Café<br/>
            <em className="text-white/25">Crawl</em><br/>
            <span className="text-[#94B6EF] not-italic block">Montréal</span>
          </h1>
          <p className="mt-6 text-[12px] leading-[1.8] text-white/50 max-w-[280px] tracking-[0.03em]">
            Discover Montréal one cup at a time. Every neighbourhood, every vibe, every hidden gem. Mapped and curated for you.
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
            {/* decorative rings */}
            <circle cx="70" cy="70" r="66" fill="none" stroke="rgba(244,242,239,0.05)" strokeWidth="1"/>
            <circle cx="70" cy="70" r="44" fill="none" stroke="rgba(244,242,239,0.04)" strokeWidth="1"/>
            {/* steam */}
            <path d="M50 32 Q53.5 24 50 16 Q46.5 8 50 2" stroke="#94B6EF" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.4"/>
            <path d="M70 30 Q73.5 22 70 14 Q66.5 6 70 0" stroke="#94B6EF" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.6"/>
            <path d="M90 32 Q93.5 24 90 16 Q86.5 8 90 2" stroke="#94B6EF" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.4"/>
            {/* mug body */}
            <rect x="26" y="34" width="82" height="54" rx="7" fill="rgba(28,12,16,0.8)" stroke="rgba(244,242,239,0.6)" strokeWidth="2.2"/>
            {/* handle */}
            <path d="M108 48 Q126 48 126 61 Q126 74 108 74" stroke="rgba(244,242,239,0.65)" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
            {/* coffee liquid surface */}
            <ellipse cx="67" cy="41" rx="35" ry="6.5" fill="rgba(148,182,239,0.1)" stroke="rgba(148,182,239,0.25)" strokeWidth="1.2"/>
            {/* mug accent stripe */}
            <line x1="27" y1="70" x2="107" y2="70" stroke="rgba(244,242,239,0.07)" strokeWidth="1.5"/>
            {/* heart on mug */}
            <path d="M59 57 Q59 52 64 52 Q67 52 70 55 Q73 52 76 52 Q81 52 81 57 Q81 62 70 70 Q59 62 59 57Z" fill="rgba(244,242,239,0.11)"/>
            {/* MTL city skyline */}
            <rect x="18" y="112" width="8" height="16" rx="1" fill="rgba(148,182,239,0.18)"/>
            <rect x="28" y="104" width="8" height="24" rx="1" fill="rgba(148,182,239,0.22)"/>
            <rect x="38" y="97" width="8" height="31" rx="1" fill="rgba(148,182,239,0.2)"/>
            <rect x="48" y="106" width="6" height="22" rx="1" fill="rgba(148,182,239,0.16)"/>
            {/* Place Ville-Marie — tallest, centre */}
            <rect x="56" y="92" width="10" height="36" rx="1" fill="rgba(148,182,239,0.3)"/>
            <path d="M56 92 L61 86 L66 92Z" fill="rgba(148,182,239,0.3)"/>
            <rect x="68" y="98" width="8" height="30" rx="1" fill="rgba(148,182,239,0.22)"/>
            <rect x="78" y="104" width="7" height="24" rx="1" fill="rgba(148,182,239,0.2)"/>
            <rect x="87" y="108" width="7" height="20" rx="1" fill="rgba(148,182,239,0.18)"/>
            <rect x="96" y="113" width="8" height="15" rx="1" fill="rgba(148,182,239,0.16)"/>
            <rect x="106" y="116" width="7" height="12" rx="1" fill="rgba(148,182,239,0.14)"/>
            {/* ground line */}
            <line x1="14" y1="128" x2="116" y2="128" stroke="rgba(148,182,239,0.18)" strokeWidth="1.2"/>
          </svg>
          <p className="text-[10px] tracking-[0.2em] uppercase text-white/20 mt-5">Your guide to Montréal's café scene</p>
        </div>
      </section>

      {/* ── TICKER ── */}
      <div className="bg-[#94B6EF] h-[44px] flex items-center overflow-hidden">
        <div className="flex whitespace-nowrap animate-ticker">
          {[...NEIGHBORHOODS, ...NEIGHBORHOODS].map((n, i) => (
            <span key={i} className={i % 2 === 1 ? "text-[#60212E] px-8 text-[13px] tracking-[0.2em] uppercase font-medium" : "text-[#1c0c10] px-8 text-[13px] tracking-[0.2em] uppercase font-medium"}>
              {i % 2 === 1 ? "◆" : n}
            </span>
          ))}
        </div>
      </div>

      {/* ── SUGGEST SECTION ── */}
      <section id="suggest-section" className="border-b border-white/5 grid grid-cols-[1fr_1.6fr]">

        {/* Left panel — editorial copy */}
        <div className="bg-[#F4F2EF] px-10 py-16 flex flex-col justify-between">
          <div>
            <p className="text-[10px] tracking-[0.25em] uppercase text-[#1c0c10]/40 mb-6">Community picks</p>
            <h2 className="font-[family-name:var(--font-playfair)] text-[52px] font-bold leading-[1] text-[#1c0c10]">
              Know a<br/>hidden<br/><em className="text-[#60212E]">gem?</em>
            </h2>
          </div>
          <div>
            <p className="text-[12px] leading-[1.9] text-[#1c0c10]/55 max-w-[260px] mb-8">
              Share it with the community. Every verified submission directly influences future search results. Your pick could become someone's new favourite spot.
            </p>
            <p className="font-[family-name:var(--font-playfair)] text-[18px] italic leading-[1.6] text-[#60212E]">
              Every suggestion is taken seriously. Verified, considered, and woven into the experience for everyone.
            </p>
          </div>
        </div>

        {/* Right panel — form */}
        <div className="bg-[#1c0c10] px-12 py-16 flex flex-col justify-center">
          <p className="text-[10px] tracking-[0.22em] uppercase text-white/25 mb-8">Suggest a café</p>
          <form onSubmit={handleSuggestSubmit}>
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-[9px] tracking-[0.2em] uppercase text-white/35">Café name *</label>
                  <input
                    className="bg-transparent border-b border-white/15 text-[#F4F2EF] py-3 text-[14px] outline-none placeholder:text-white/15 focus:border-[#94B6EF] transition"
                    type="text"
                    placeholder="Café Olimpico"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    autoComplete="off"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[9px] tracking-[0.2em] uppercase text-white/35">Address *</label>
                  <input
                    className="bg-transparent border-b border-white/15 text-[#F4F2EF] py-3 text-[14px] outline-none placeholder:text-white/15 focus:border-[#94B6EF] transition"
                    type="text"
                    placeholder="124 Rue Mont-Royal O"
                    value={suggestAddress}
                    onChange={(e) => setSuggestAddress(e.target.value)}
                    autoComplete="off"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[9px] tracking-[0.2em] uppercase text-white/35">Vibe / atmosphere *</label>
                <input
                  className="bg-transparent border-b border-white/15 text-[#F4F2EF] py-3 text-[14px] outline-none placeholder:text-white/15 focus:border-[#94B6EF] transition"
                  type="text"
                  placeholder="Indie, cozy, exposed brick, great pour-overs..."
                  value={suggestVibe}
                  onChange={(e) => setSuggestVibe(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[9px] tracking-[0.2em] uppercase text-white/35">Your name (optional)</label>
                <input
                  className="bg-transparent border-b border-white/15 text-[#F4F2EF] py-3 text-[14px] outline-none placeholder:text-white/15 focus:border-[#94B6EF] transition"
                  type="text"
                  placeholder="Marie"
                  value={submitterName}
                  onChange={(e) => setSubmitterName(e.target.value)}
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="mt-10 flex items-center gap-5">
              <button
                type="submit"
                disabled={suggestLoading}
                className="bg-[#94B6EF] text-[#1c0c10] px-10 py-4 text-[11px] tracking-[0.14em] uppercase font-semibold disabled:opacity-40 hover:bg-[#F4F2EF] transition-colors"
              >
                {suggestLoading ? "Verifying…" : "Submit →"}
              </button>
              {suggestSuccess && (
                <span className="text-[11px] text-[#94B6EF] tracking-wide">✓ Added! Thanks for the tip.</span>
              )}
            </div>
            {suggestError && (
              <p className="mt-4 text-red-400 text-[12px]">{suggestError}</p>
            )}
            <p className="mt-6 text-[10px] text-white/18 tracking-[0.05em]">
              Verified against Google Places before saving.
            </p>
          </form>
        </div>

      </section>

      {/* ── VIBE SEARCH + MAP (side by side) ── */}
      <section id="vibe-search" className="grid grid-cols-[1fr_1.2fr] border-b border-white/5">

        {/* Left: search form + results */}
        <div className="bg-[#60212E] border-r border-white/5 overflow-y-auto" style={{ maxHeight: "calc(100vh - 60px)", position: "sticky", top: 60 }}>
          <div className="px-10 py-[72px]">
            <div className="flex justify-between items-end mb-10">
              <div>
                <p className="text-[10px] tracking-[0.22em] uppercase text-[#94B6EF] mb-4">Search by vibe</p>
                <h2 className="font-[family-name:var(--font-playfair)] text-[36px] font-bold leading-tight text-[#F4F2EF]">
                  What's<br/>the <em className="text-white/30">mood?</em>
                </h2>
              </div>
              <p className="text-[11px] text-white/30 max-w-[160px] leading-[1.7] text-right tracking-[0.04em]">
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
                <p className="text-[10px] tracking-[0.2em] uppercase text-[#94B6EF] mb-6">
                  {results.length} spot{results.length !== 1 ? "s" : ""} found
                </p>
                <div className="flex flex-col gap-px bg-white/5">
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
                <div className="mt-6 pb-10">
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
          </div>
        </div>

        {/* Right: sticky map */}
        <div className="bg-[#1c0c10]">
          <div className="sticky top-[60px]" style={{ height: "calc(100vh - 60px)" }}>
            <MontrealMap results={results} selectedShopId={selectedShopId} onSelectShop={handleSelectShop} />
          </div>
        </div>

      </section>

      {/* ── FEEDBACK SECTION ── */}
      <section id="feedback-section" className="bg-[#60212E] border-b border-white/5 py-24 px-10 flex flex-col items-center">

        <p className="text-[10px] tracking-[0.3em] uppercase text-[#94B6EF]/70 mb-6">We&apos;re listening</p>

        <h2 className="font-[family-name:var(--font-playfair)] text-[56px] font-bold leading-[1] text-center text-[#F4F2EF] mb-4">
          Tell us what<br/>you <em className="text-white/25">actually</em> think
        </h2>

        <p className="text-[12px] text-white/40 text-center max-w-[380px] leading-[1.9] tracking-[0.03em] mb-14">
          CafeCrawl is a work in progress. Every message gets read — whether it&apos;s a missing neighbourhood, a broken feature, or an idea we haven&apos;t thought of yet.
        </p>

        <form onSubmit={handleFeedbackSubmit} className="w-full max-w-[560px]">

          {/* Star rating */}
          <div className="flex justify-center gap-3 mb-10">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setFeedbackRating(feedbackRating === star ? 0 : star)}
                onMouseEnter={() => setFeedbackHover(star)}
                onMouseLeave={() => setFeedbackHover(0)}
                className="text-[32px] transition-transform hover:scale-110 leading-none"
              >
                <span className={(feedbackHover || feedbackRating) >= star ? "text-[#94B6EF]" : "text-white/12"}>
                  ★
                </span>
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-6">
            <textarea
              className="w-full bg-[rgba(28,12,16,0.4)] border border-white/10 text-[#F4F2EF] px-6 py-5 text-[14px] outline-none placeholder:text-white/18 focus:border-[#94B6EF] transition resize-none leading-relaxed"
              rows={4}
              placeholder="What's working, what's missing, what you'd love to see..."
              value={feedbackMessage}
              onChange={(e) => setFeedbackMessage(e.target.value)}
            />
            <input
              className="w-full bg-transparent border-b border-white/12 text-[#F4F2EF] py-3 text-[13px] outline-none placeholder:text-white/18 focus:border-[#94B6EF] transition"
              type="text"
              placeholder="Your name (optional)"
              value={feedbackName}
              onChange={(e) => setFeedbackName(e.target.value)}
              autoComplete="off"
            />
          </div>

          <div className="mt-8 flex flex-col items-center gap-4">
            <button
              type="submit"
              disabled={feedbackLoading}
              className="bg-[#F4F2EF] text-[#1c0c10] px-12 py-4 text-[11px] tracking-[0.16em] uppercase font-semibold disabled:opacity-40 hover:bg-[#94B6EF] transition-colors"
            >
              {feedbackLoading ? "Sending…" : "Send feedback →"}
            </button>
            {feedbackSuccess && (
              <span className="text-[11px] text-[#94B6EF] tracking-wide">✓ Got it — thank you!</span>
            )}
            {feedbackError && (
              <p className="text-red-400 text-[12px]">{feedbackError}</p>
            )}
          </div>

        </form>

      </section>

      {/* ── IMAGE SECTION — coming soon ── */}
      <section id="image-section" className="relative grid grid-cols-[1.4fr_1fr] border-b border-white/5 select-none">
        <div className="bg-[#1c0c10] flex flex-col items-center justify-center min-h-[280px] p-12 border-r border-white/5 opacity-25 pointer-events-none grayscale">
          <ImageUpload
            onDetectedVibes={handleDetectedVibes}
            onLoading={setLoading}
            onError={setError}
            isLoading={loading}
          />
        </div>
        <div className="px-10 py-16 bg-[#4a1924] flex flex-col justify-center opacity-25 pointer-events-none grayscale">
          <p className="text-[10px] tracking-[0.22em] uppercase text-[#94B6EF] mb-4">Search by image</p>
          <h2 className="font-[family-name:var(--font-playfair)] text-[32px] font-bold leading-tight text-[#F4F2EF] mb-4">
            Show us<br/>the <em className="text-white/30">aesthetic</em>
          </h2>
          <p className="text-[12px] leading-[1.8] text-white/45 max-w-[260px]">
            Upload a photo that captures the vibe you're after. A Pinterest save, a screenshot, a mood board. We'll find cafés that match.
          </p>
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
          <p className="text-[9px] tracking-[0.35em] uppercase text-white/35 mb-3">Coming soon</p>
          <p className="font-[family-name:var(--font-playfair)] text-[28px] italic text-white/20">Search by image</p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="grid grid-cols-3 bg-[#1c0c10] border-t border-white/5">
        <div className="p-10 border-r border-white/5">
          <p className="text-[9px] tracking-[0.2em] uppercase text-white/22 mb-4">Brand</p>
          <p className="font-[family-name:var(--font-playfair)] text-[22px] font-bold text-[#F4F2EF]">CafeCrawl Montreal</p>
          <p className="text-[11px] text-white/22 tracking-[0.05em] mt-1">Montréal · Est. 2026</p>
        </div>
        <div className="p-10 border-r border-white/5">
          <p className="text-[9px] tracking-[0.2em] uppercase text-white/22 mb-4">Navigate</p>
          <div className="flex flex-col gap-3">
            {[["vibe-search", "Search by vibe"], ["image-section", "Search by image"], ["suggest-section", "Submit a café"], ["feedback-section", "Feedback"]].map(([id, label]) => (
              <button key={id} onClick={() => scrollTo(id)} className="text-[11px] tracking-[0.1em] uppercase text-white/35 hover:text-white/60 transition text-left">
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="p-10">
          <p className="text-[9px] tracking-[0.2em] uppercase text-white/22 mb-4">About</p>
          <p className="text-[10px] text-white/15 tracking-[0.06em] leading-[1.7]">
            © 2026 CafeCrawl Montreal.<br/>Curated Montréal café discovery<br/>powered by AI + community picks.
          </p>
        </div>
      </footer>

    </div>
  );
}
