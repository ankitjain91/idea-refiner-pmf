import React from "react";

export function ShareButtons({ title, summary }: { title: string; summary: string }) {
  const url = typeof window !== "undefined" ? window.location.href : "https://smoothbrains.ai";
  const text = `${title}: ${summary}`;
  return (
    <div className="flex gap-3 items-center text-xs opacity-80 mt-2">
      <a target="_blank" rel="noreferrer" className="underline"
         href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`}>
        Share on X
      </a>
      <a target="_blank" rel="noreferrer" className="underline"
         href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}>
        Share on LinkedIn
      </a>
      <button className="underline" onClick={() => navigator.clipboard.writeText(url)}>Copy link</button>
    </div>
  );
}
