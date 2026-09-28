"use client";

import { useState } from "react";
import { X } from "lucide-react";

export function MediaViewer({
  url,
  kind,
  onClose,
}: {
  url: string;
  kind: "image" | "video";
  onClose: () => void;
}) {
  const [zoomed, setZoomed] = useState(false);

  return (
    <div className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center" onClick={onClose}>
      <button
        onClick={onClose}
        className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white z-10"
      >
        <X size={20} />
      </button>

      {kind === "image" ? (
        <img
          src={url}
          alt=""
          onClick={(e) => {
            e.stopPropagation();
            setZoomed((z) => !z);
          }}
          className={`max-w-full max-h-full object-contain transition-transform duration-300 cursor-zoom-in ${
            zoomed ? "scale-150 cursor-zoom-out" : ""
          }`}
        />
      ) : (
        <video
          src={url}
          controls
          autoPlay
          playsInline
          onClick={(e) => e.stopPropagation()}
          className="max-w-full max-h-full object-contain"
        />
      )}
    </div>
  );
}
