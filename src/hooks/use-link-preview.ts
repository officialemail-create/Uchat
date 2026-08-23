import { useEffect, useState } from "react";
import { useGetLinkPreview } from "@workspace/api-client-react";

export interface LinkPreview {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
}

const URL_REGEX = /https?:\/\/[^\s<>"'`()[\]{}|\\^]+/g;

export function extractFirstUrl(text: string): string | null {
  const matches = text.match(URL_REGEX);
  if (!matches) return null;
  try {
    new URL(matches[0]);
    return matches[0];
  } catch {
    return null;
  }
}

const clientCache = new Map<string, LinkPreview | null>();

export function useLinkPreview(text: string | null | undefined, enabled = true) {
  const url = text ? extractFirstUrl(text) : null;
  const [preview, setPreview] = useState<LinkPreview | null | undefined>(
    url ? clientCache.get(url) : undefined,
  );

  const { mutate } = useGetLinkPreview({
    mutation: {
      onSuccess: (data: LinkPreview | null) => {
        if (!url) return;
        const result = data as LinkPreview | null;
        clientCache.set(url, result ?? null);
        setPreview(result ?? null);
      },
      onError: () => {
        if (url) {
          clientCache.set(url, null);
          setPreview(null);
        }
      },
    },
  });

  useEffect(() => {
    if (!url || !enabled) {
      setPreview(null);
      return;
    }
    if (clientCache.has(url)) {
      setPreview(clientCache.get(url) ?? null);
      return;
    }
    setPreview(undefined);
    mutate({ data: { url } });
  }, [url, enabled]);

  return { url, preview, loading: url !== null && preview === undefined };
}
