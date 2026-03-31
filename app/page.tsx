"use client";

import { useState } from "react";
import { refineQuery } from "../lib/refineQuery";
import { explainChoice } from "../lib/explainChoice";

export default function Home() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);

  async function handleSearch() {
    // Step 1: refine vibe
    const refined = await refineQuery(input);

    // Step 2: (placeholder) your ranking logic
    const topResult = `Top result for: ${refined}`;

    // Step 3: LLM explanation
    const explanationText = await explainChoice(refined, topResult);

    setResult(topResult);
    setExplanation(explanationText);
  }

  return (
    <main className="min-h-screen bg-[#1a0f14] text-white flex flex-col items-center justify-center p-8">
      
      <h1 className="text-4xl font-serif mb-6 text-[#f5e6ea]">
        VibeSearch
      </h1>

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
        Search
      </button>

      {result && (
        <div className="mt-10 w-full max-w-xl">
          <h2 className="text-xl font-semibold text-[#4ade80]">
            🥇 Your Top #1 Choice
          </h2>

          <p className="mt-2 text-gray-300">
            {result}
          </p>

          {explanation && (
            <p className="mt-4 text-sm text-gray-400 italic">
              {explanation}
            </p>
          )}
        </div>
      )}
    </main>
  );
}