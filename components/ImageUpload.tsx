"use client";

import { useRef, useState } from "react";

interface ImageUploadProps {
  onDetectedVibes: (vibes: string) => void;
  onLoading: (loading: boolean) => void;
  onError: (error: string | null) => void;
  isLoading: boolean;
}

export default function ImageUpload({
  onDetectedVibes,
  onLoading,
  onError,
  isLoading,
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      onError("Please select a valid image file");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Send to API
    onLoading(true);
    onError(null);

    const formData = new FormData();
    formData.append("image", file);
    formData.append("topN", "3");

    try {
      const res = await fetch("/api/search/vibe-from-image", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : `Upload failed (${res.status})`
        );
      }

      onDetectedVibes(data.detectedVibes);
    } catch (err: unknown) {
      onError(
        err instanceof Error ? err.message : "Failed to analyze image"
      );
    } finally {
      onLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add("border-[#d4a574]", "bg-[#2a1f1f]");
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove("border-[#d4a574]", "bg-[#2a1f1f]");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove("border-[#d4a574]", "bg-[#2a1f1f]");

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="relative border-2 border-dashed border-[#8b6f47] rounded-lg p-8 text-center cursor-pointer transition-all duration-200 hover:border-[#d4a574] hover:bg-[#2a1f1f]"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.currentTarget.files?.[0];
            if (file) handleFileSelect(file);
          }}
          className="hidden"
          disabled={isLoading}
        />

        <div className="space-y-2">
          <div className="text-4xl">📸</div>
          <p className="text-[#d4a574] font-medium">
            Upload a photo of the vibe you want
          </p>
          <p className="text-[#a898a0] text-sm">
            Drag and drop or click to select
          </p>
          {isLoading && (
            <p className="text-[#f5e6ea] text-sm">
              Analyzing vibe...
            </p>
          )}
        </div>
      </div>

      {preview && (
        <div className="relative rounded-lg overflow-hidden border border-[#8b6f47]">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-auto max-h-64 object-cover"
          />
          <button
            onClick={() => setPreview(null)}
            className="absolute top-2 right-2 bg-[#1a0f14] rounded-full p-1 text-[#d4a574] hover:text-[#f5e6ea] transition-colors"
            disabled={isLoading}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
