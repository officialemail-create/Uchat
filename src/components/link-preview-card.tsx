import { ExternalLink } from "lucide-react";
import type { LinkPreview } from "../hooks/use-link-preview";

interface Props {
  preview: LinkPreview;
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function getFavicon(url: string): string {
  try {
    const { protocol, hostname } = new URL(url);
    return `${protocol}//${hostname}/favicon.ico`;
  } catch {
    return "";
  }
}

export function LinkPreviewCard({ preview }: Props) {
  const domain = getDomain(preview.url);
  const favicon = getFavicon(preview.url);

  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      className="link-preview-card"
      onClick={(e) => e.stopPropagation()}
    >
      {preview.image && (
        <div className="link-preview-image-wrap">
          <img
            src={preview.image}
            alt=""
            className="link-preview-image"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      )}
      <div className="link-preview-body">
        <div className="link-preview-domain">
          <img
            src={favicon}
            alt=""
            className="link-preview-favicon"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
          <span>{preview.siteName ?? domain}</span>
          <ExternalLink size={11} className="link-preview-ext-icon" />
        </div>
        {preview.title && (
          <p className="link-preview-title">{preview.title}</p>
        )}
        {preview.description && (
          <p className="link-preview-desc">{preview.description}</p>
        )}
      </div>
    </a>
  );
}
