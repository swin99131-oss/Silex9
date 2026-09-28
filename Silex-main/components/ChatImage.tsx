"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { MediaViewer } from "./MediaViewer";

export function ChatImage({ path, kind = "image" }: { path: string; kind?: "image" | "video" }) {
  const [url, setUrl] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    supabase.storage
      .from("chat")
      .createSignedUrl(path, 3600)
      .then(({ data }) => {
        if (alive && data) setUrl(data.signedUrl);
      });
    return () => {
      alive = false;
    };
  }, [path]);

  if (!url) {
    return <div className="w-full h-40 rounded-xl bg-line/30 animate-pulse mb-1.5" />;
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="block w-full">
        {kind === "video" ? (
          <video src={url} className="rounded-xl mb-1.5 max-w-full max-h-64 w-full object-cover pointer-events-none" />
        ) : (
          <img src={url} alt="" className="rounded-xl mb-1.5 max-w-full max-h-64 object-cover" />
        )}
      </button>
      {open && <MediaViewer url={url} kind={kind} onClose={() => setOpen(false)} />}
    </>
  );
}
