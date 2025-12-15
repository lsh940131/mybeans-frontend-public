"use client";

import { useEffect, useState } from "react";
import { imageSizeCache, type ImageSize } from "@/lib/cache";

export function useNaturalImageSize(url?: string) {
  const [size, setSize] = useState<ImageSize | null>(() => (url ? imageSizeCache.get(url) : null));
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!url) return;

    const cached = imageSizeCache.get(url);
    if (cached) {
      setSize(cached);
      return;
    }

    const img = new window.Image();
    img.decoding = "async";
    img.loading = "eager";
    img.src = url;

    img.onload = () => {
      const s = { w: img.naturalWidth, h: img.naturalHeight };
      imageSizeCache.set(url, s);
      setSize(s);
    };
    img.onerror = () => setError(new Error("image-load-failed"));

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [url]);

  return { size, error };
}
