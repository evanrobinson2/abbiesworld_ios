"use client";

import { useEffect, useCallback } from "react";
import Image from "next/image";
import { X, ZoomIn, ZoomOut, Download } from "lucide-react";

interface ImageLightboxProps {
  src: string;
  alt: string;
  onClose: () => void;
}

export function ImageLightbox({ src, alt, onClose }: ImageLightboxProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = src;
    link.download = alt.replace(/[^a-z0-9]/gi, "-") + ".png";
    link.click();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDownload();
          }}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          aria-label="Download"
        >
          <Download size={20} />
        </button>
        <button
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          aria-label="Close"
        >
          <X size={24} />
        </button>
      </div>

      {/* Image container */}
      <div
        className="relative max-h-[90vh] max-w-[95vw] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt={alt}
          className="max-h-[90vh] max-w-[95vw] object-contain"
          style={{ imageRendering: "high-quality" }}
        />
      </div>

      {/* Caption */}
      <div className="absolute bottom-4 left-4 right-4 text-center">
        <p className="text-sm text-white/70 truncate px-4">{alt}</p>
        <p className="text-xs text-white/40 mt-1">Press ESC or click outside to close</p>
      </div>
    </div>
  );
}
