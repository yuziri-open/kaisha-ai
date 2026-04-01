import { useEffect, useState } from "react";
import { Folder, FolderUp, HardDrive, X } from "lucide-react";
import { api } from "@/api/client";
import { Button } from "@/components/ui/button";

interface DirectoryPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (path: string) => void;
  initialPath?: string;
}

export function DirectoryPicker({ open, onClose, onSelect, initialPath }: DirectoryPickerProps) {
  const [currentPath, setCurrentPath] = useState(initialPath || "C:\\");
  const [entries, setEntries] = useState<Array<{ name: string; type: "file" | "directory"; size: number }>>([]);
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [drives, setDrives] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    void api.drives().then((r) => setDrives(r.drives)).catch(() => setDrives(["C:"]));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    api
      .browsePath(currentPath)
      .then((r) => {
        setEntries(r.entries.filter((e) => e.type === "directory"));
        setParentPath(r.parent !== r.path ? r.parent : null);
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, [open, currentPath]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="glass mx-4 flex max-h-[70vh] w-full max-w-lg flex-col rounded-[24px] border border-white/20 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h3 className="text-lg font-semibold text-foreground">ディレクトリを選択</h3>
          <button onClick={onClose} className="rounded-full p-1 text-muted-foreground transition hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        <div className="border-b border-white/10 px-5 py-2 text-xs text-muted-foreground break-all">
          {currentPath}
        </div>

        <div className="flex gap-2 border-b border-white/10 px-5 py-2">
          {drives.map((d) => (
            <button
              key={d}
              onClick={() => setCurrentPath(d + "\\")}
              className="inline-flex items-center gap-1 rounded-[10px] px-2 py-1 text-xs text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
            >
              <HardDrive size={12} />
              {d}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2">
          {parentPath ? (
            <button
              onClick={() => setCurrentPath(parentPath)}
              className="flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-sm text-muted-foreground transition hover:bg-white/10"
            >
              <FolderUp size={16} />
              ↑ 上のフォルダへ
            </button>
          ) : null}

          {loading ? (
            <p className="py-4 text-center text-sm text-muted-foreground">読み込み中...</p>
          ) : error ? (
            <p className="py-4 text-center text-sm text-red-400">{error}</p>
          ) : entries.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">サブフォルダがありません。</p>
          ) : (
            entries.map((entry) => (
              <button
                key={entry.name}
                onClick={() => setCurrentPath(currentPath.replace(/\\?$/, "\\") + entry.name)}
                className="flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-sm text-foreground transition hover:bg-white/10"
              >
                <Folder size={16} className="shrink-0 text-[#007AFF]" />
                <span className="truncate">{entry.name}</span>
              </button>
            ))
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-white/10 px-5 py-4">
          <Button variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          <Button
            variant="accent"
            onClick={() => {
              onSelect(currentPath);
              onClose();
            }}
          >
            選択
          </Button>
        </div>
      </div>
    </div>
  );
}
