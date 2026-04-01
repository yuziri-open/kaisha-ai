import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

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

  return (
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
            {renderInline(block.text)}
          </p>
        );
      })}
    </div>
  );
}
