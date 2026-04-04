"use client";

import { useState } from "react";
import { refineQuery } from "@/lib/refineQuery";
import { fetchPlaces } from "@/lib/fetchPlaces";
import { enrichPlace } from "@/lib/enrichVibe";
import { rankPlaces } from "@/lib/ranking";

export default function Home() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function handleSearch() {
    try {
      setLoading(true);

      // 1. Refine vibe using LLM
      const refined = await refineQuery(input);

      // 2. Fetch real places (ARRAY)
      const places = await fetchPlaces();

      // 3. Limit results
      const subset = places.slice(0, 8);

      // 4. Enrich each place with vibe
      const enriched = await Promise.all(
        subset.map(enrichPlace)
      );

      // 5. Rank places based on vibe
      const ranked = rankPlaces(refined, enriched);

      const top = ranked[0];

      setResult(top);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#1a0f14] text-white flex flex-col items-center justify-center p-8">
      
      {/* Title */}
      <h1 className="text-4xl font-serif mb-6 text-[#f5e6ea]">
        VibeSearch
      </h1>

      {/* Input */}
      <input
        className="w-full max-w-xl p-4 rounded-xl bg-[#2a151d] border border-[#3a1f28] text-white outline-none focus:border-[#b76e79]"
        placeholder="Describe your vibe..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />

      {/* Button */}
      <button
        onClick={handleSearch}
        className="mt-4 px-6 py-3 rounded-xl bg-[#b76e79] hover:bg-[#a35c66] transition"
      >
        {loading ? "Searching..." : "Search"}
      </button>

      {/* Result */}
      {result && (
        <div className="mt-10 w-full max-w-xl">
          <h2 className="text-xl font-semibold text-green-400">
            🥇 Your Top #1 Choice
          </h2>

          <p className="mt-2 text-lg">{result.name}</p>
          <p className="text-gray-400">📍 Montreal</p>

          <p className="mt-2 italic text-gray-400">
            {result.vibe}
          </p>
        </div>
      )}
    </main>
  );
}