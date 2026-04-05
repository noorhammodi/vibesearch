"use client";

import { useState } from "react";
import { fetchPlaces } from "@/lib/fetchPlaces";
import { combinedVibeSearch } from "@/lib/combinedVibeSearch";


export default function Home() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function handleSearch() {
    try {
      setLoading(true);

      const places = await fetchPlaces();
      const subset = places.slice(0, 8);


    const { refinedQuery, enriched } = await combinedVibeSearch(input, subset);
    const ranked = [...enriched].sort((a, b) => b.score - a.score);
    setResult(ranked[0]);      setResult(ranked[0]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#1a0f14] text-white flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-serif mb-6 text-[#f5e6ea]">VibeSearch</h1>

      <input
        className="w-full max-w-xl p-4 rounded-xl bg-[#2a151d] border border-[#3a1f28] text-white outline-none focus:border-[#b76e79]"
        placeholder="Describe your vibe..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />

      <button
        onClick={handleSearch}
        className="mt-4 px-6 py-3 rounded-xl bg-[#b76e79] hover:bg-[#a35c66] transition"
      >
        {loading ? "Searching..." : "Search"}
      </button>

      {result && (
        <div className="mt-10 w-full max-w-xl">
          <h2 className="text-xl font-semibold text-green-400">🥇 Your Top #1 Choice</h2>
          <p className="mt-2 text-lg">{result.name}</p>
          <p className="text-gray-400">📍 Montreal</p>
          <p className="mt-2 italic text-gray-400">{result.vibe}</p>
        </div>
      )}
    </main>
  );
}