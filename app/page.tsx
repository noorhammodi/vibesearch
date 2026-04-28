"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";

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

export default function Home() {
  const [vibes, setVibes] = useState("");
  const [results, setResults] = useState<
    Array<{ shop: ShopResult; score: number; reason: string; rank?: number }>
  >([]);
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [requestedTopN, setRequestedTopN] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runSearch(nextTopN: number) {
    const trimmed = vibes.trim();
    if (!trimmed) {
      setError("Describe your vibe in a few words.");
      return;
    }

    setLoading(true);
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

      // Dedup by placeId, keep the earliest (best-ranked) one.
      const seen = new Set<string>();
      const merged: Array<{ shop: ShopResult; score: number; reason: string; rank?: number }> = [];
      for (const r of [...incoming]) {
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
    setError(null);
    setResults([]);
    setSelectedShopId(null);

    setRequestedTopN(3);
    await runSearch(3);
  }

  function mapsUrl(shop: ShopResult) {
    return `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(
      shop.id
    )}`;
  }

  const handleSelectShop = useCallback((shopId: string) => {
    setSelectedShopId(shopId);
    const card = document.querySelector<HTMLElement>(`[data-shop-id="${shopId}"]`);
    card?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  return (
    <main className="min-h-screen bg-[#1a0f14] text-white p-6 md:p-8">
      <div className="w-full max-w-7xl mx-auto">
        <h1 className="font-[family-name:var(--font-playfair)] text-4xl md:text-5xl mb-2 text-[#f5e6ea] text-center">
          VibeSearch
        </h1>
        <p className="text-[#c4a8b0] text-sm md:text-base mb-8 text-center">
          A few vibe words {"->"} curated Montreal drink spots on a custom map.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
          <label htmlFor="vibes" className="sr-only">
            Your vibes
          </label>
          <input
            id="vibes"
            className="w-full p-4 rounded-xl bg-[#2a151d] border border-[#3a1f28] text-white placeholder:text-[#7a5f68] outline-none focus:border-[#b76e79]"
            placeholder="e.g. quiet · rainy · laptop-friendly"
            value={vibes}
            onChange={(e) => setVibes(e.target.value)}
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 rounded-xl bg-[#b76e79] hover:bg-[#a35c66] transition disabled:opacity-50 font-medium"
          >
            {loading ? "Finding cafés…" : "Find cafés"}
          </button>
        </form>

        {error && <p className="mt-6 text-red-400 text-center">{error}</p>}

        <div className="mt-8 grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6 items-start">
          <section className="text-left">
            {results.length > 0 && (
              <>
                <p className="text-xs uppercase tracking-wide text-[#b76e79] mb-3">
                  Suggestions
                </p>
                <div className="flex flex-col gap-4 max-h-[520px] overflow-auto pr-1">
                  {results.map((r, i) => (
                    <div
                      key={`${r.shop.id}-${i}`}
                      data-shop-id={r.shop.id}
                      onClick={() => handleSelectShop(r.shop.id)}
                      className={`cursor-pointer rounded-2xl border p-6 shadow-lg transition ${
                        selectedShopId === r.shop.id
                          ? "border-[#ff5fb8] bg-[#2a1220]"
                          : "border-[#3a1f28] bg-[#231018]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h2 className="font-[family-name:var(--font-playfair)] text-xl text-[#f5e6ea] mb-1">
                            {i === 0 ? "🥇 " : ""}
                            {r.shop.name}
                          </h2>
                          <p className="text-[#a8989e] text-sm">
                            {r.shop.address ?? "Montréal"} · from Google Places
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-[#9a858c]">match</p>
                          <p className="text-sm text-[#e8d5da] font-medium">
                            {Math.round((r.score ?? 0) * 100)}%
                          </p>
                        </div>
                      </div>

                      {r.reason && (
                        <p className="mt-4 text-[#e8d5da] leading-relaxed italic">{r.reason}</p>
                      )}
                      <p className="mt-4 text-[#9a858c] text-sm">{r.shop.summary}</p>

                      <div className="mt-5">
                        <a
                          href={mapsUrl(r.shop)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-[#b76e79] hover:text-[#d4919d] underline underline-offset-4 text-sm font-medium"
                          onClick={(ev) => ev.stopPropagation()}
                        >
                          View on map
                        </a>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => runSearch(Math.min(15, requestedTopN + 4))}
                    className="px-5 py-2 rounded-xl border border-[#3a1f28] bg-[#2a151d] hover:bg-[#331a23] transition disabled:opacity-50 text-sm font-medium"
                  >
                    {loading ? "Generating more..." : "Show more"}
                  </button>
                </div>
              </>
            )}

            {results.length === 0 && !loading && (
              <p className="text-center text-[#9a858c] mt-8">
                Search your vibe to see suggestions and map pins.
              </p>
            )}
          </section>

          <section>
            <MontrealMap
              results={results}
              selectedShopId={selectedShopId}
              onSelectShop={handleSelectShop}
            />
          </section>
        </div>
      </div>
    </main>
  );
}
