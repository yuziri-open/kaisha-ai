import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const IMAGE_EXTENSIONS = /\.(png|jpg|jpeg|gif|webp)$/i;
const ATTACHMENT_PATTERN = /\[添付ファイル:\s*(\/uploads\/[^\s)]+)(?:\s*\([^)]*\))?\]/g;

function ImageModal({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <img src={src} alt="" className="max-h-[85vh] max-w-[90vw] rounded-[18px] object-contain shadow-2xl" />
    </div>
  );
}

type Block =
  | { type: "paragraph"; text: string }
  | { type: "code"; text: string; language: string };

function parseBlocks(value: string): Block[] {
  const lines = value.replace(/\r/g, "").split("\n");
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let code: string[] = [];
  let language = "";
  let inCode = false;

  const flushParagraph = () => {
    const text = paragraph.join("\n").trim();
    if (text) {
      blocks.push({ type: "paragraph", text });
    }
    paragraph = [];
  };

  const flushCode = () => {
    blocks.push({
      type: "code",
      text: code.join("\n"),
      language,
    });
    code = [];
    language = "";
  };

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCode) {
        flushCode();
        inCode = false;
      } else {
        flushParagraph();
        language = line.slice(3).trim();
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      code.push(line);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      continue;
    }

    paragraph.push(line);
  }

  if (inCode) {
    flushCode();
  } else {
    flushParagraph();
  }

  return blocks;
}

function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(`[^`]+`)/g);
  return parts.filter(Boolean).map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={`${part}-${index}`}
          className="rounded-md bg-black/10 px-1.5 py-0.5 font-mono text-[0.92em] dark:bg-white/10"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

interface MarkdownMessageProps {
  content: string;
  className?: string;
}

export function MarkdownMessage({ content, className }: MarkdownMessageProps) {
  const blocks = parseBlocks(content);
  const [modalImage, setModalImage] = useState<string | null>(null);

  const renderParagraphWithImages = (text: string, blockIndex: number) => {
    // Replace attachment patterns with inline images
    const parts: ReactNode[] = [];
    let lastIndex = 0;
    const regex = new RegExp(ATTACHMENT_PATTERN.source, "g");
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          <span key={`t-${blockIndex}-${lastIndex}`}>
            {renderInline(text.slice(lastIndex, match.index))}
          </span>,
        );
      }
      const url = match[1];
      if (IMAGE_EXTENSIONS.test(url)) {
        parts.push(
          <img
            key={`img-${blockIndex}-${match.index}`}
            src={url}
            alt=""
            className="my-2 max-h-64 cursor-pointer rounded-[14px] border border-white/10 object-contain"
            onClick={() => setModalImage(url)}
          />,
        );
      } else {
        parts.push(
          <a
            key={`file-${blockIndex}-${match.index}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-[8px] bg-white/10 px-2 py-1 text-xs text-[#007AFF] hover:bg-white/20"
          >
            📎 {url.split("/").pop()}
          </a>,
        );
      }
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(<span key={`t-${blockIndex}-end`}>{renderInline(text.slice(lastIndex))}</span>);
    }

    return parts.length > 0 ? parts : renderInline(text);
  };

  return (
    <>
    <div className={cn("space-y-3 text-sm leading-7", className)}>
      {blocks.map((block, index) => {
        if (block.type === "code") {
          return (
            <div key={`${block.type}-${index}`} className="overflow-hidden rounded-[18px] border border-white/10 bg-black/12 dark:bg-black/30">
              {block.language ? (
                <div className="border-b border-white/10 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  {block.language}
                </div>
              ) : null}
              <pre className="overflow-x-auto px-4 py-4 text-[12px] leading-6">
                <code>{block.text}</code>
              </pre>
            </div>
          );
        }

        return (
          <p key={`${block.type}-${index}`} className="whitespace-pre-wrap break-words">
            {renderParagraphWithImages(block.text, index)}
          </p>
        );
      })}
    </div>
    {modalImage ? <ImageModal src={modalImage} onClose={() => setModalImage(null)} /> : null}
    </>
  );
}
