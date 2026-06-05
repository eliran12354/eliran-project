import { useRef, useState } from "react";
import { FileUp, Globe, Loader2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AnalyzeTenderInput } from "@/lib/api/tenderAnalysisApi";

const ACCEPTED_EXTENSIONS = ".pdf,.docx,.xlsx";
const MAX_UPLOAD_BYTES = 30 * 1024 * 1024;

interface Props {
  loading: boolean;
  onSubmit: (input: AnalyzeTenderInput) => void;
  onCancel?: () => void;
}

export function TenderAnalysisInputForm({ loading, onSubmit, onCancel }: Props) {
  const [tab, setTab] = useState<"upload" | "url">("upload");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValidationError(null);
    const f = e.target.files?.[0];
    if (!f) {
      setFile(null);
      return;
    }
    if (f.size > MAX_UPLOAD_BYTES) {
      setValidationError(
        `הקובץ גדול מדי (${(f.size / 1024 / 1024).toFixed(1)}MB). מקסימום ${MAX_UPLOAD_BYTES / 1024 / 1024}MB.`,
      );
      setFile(null);
      return;
    }
    setFile(f);
  };

  const clearFile = () => {
    setFile(null);
    setValidationError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;

    if (tab === "upload") {
      if (!file) {
        setValidationError("נא לבחור קובץ");
        return;
      }
      onSubmit({ kind: "file", file });
      return;
    }

    const trimmed = url.trim();
    if (!trimmed) {
      setValidationError("נא להזין כתובת URL");
      return;
    }
    try {
      new URL(trimmed);
    } catch {
      setValidationError("כתובת URL אינה תקינה");
      return;
    }
    onSubmit({ kind: "url", url: trimmed });
  };

  return (
    <Card className="p-5 sm:p-6">
      <form onSubmit={handleSubmit} className="space-y-5" dir="rtl">
        <Tabs value={tab} onValueChange={(v) => setTab(v as "upload" | "url")}>
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
            <TabsTrigger value="upload" className="gap-2">
              <FileUp className="size-4" aria-hidden />
              העלאת קובץ
            </TabsTrigger>
            <TabsTrigger value="url" className="gap-2">
              <Globe className="size-4" aria-hidden />
              כתובת URL
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="mt-5 space-y-3">
            <label
              htmlFor="tender-file"
              className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/40 px-4 py-10 text-center transition-colors hover:border-primary/40 hover:bg-primary/5 cursor-pointer"
            >
              <FileUp className="size-8 text-muted-foreground mb-2" aria-hidden />
              <span className="text-sm font-medium text-foreground">
                {file ? file.name : "לחץ כדי לבחור מסמך מכרז"}
              </span>
              <span className="text-xs text-muted-foreground mt-1">
                PDF, DOCX, או XLSX · עד 30MB
              </span>
              <input
                ref={fileInputRef}
                id="tender-file"
                type="file"
                accept={ACCEPTED_EXTENSIONS}
                className="sr-only"
                onChange={handleFileChange}
                disabled={loading}
              />
            </label>

            {file && (
              <div className="flex items-center justify-between gap-3 rounded-md bg-primary/5 px-3 py-2 text-sm">
                <span className="truncate font-medium" title={file.name}>
                  {file.name}{" "}
                  <span className="text-muted-foreground">
                    ({(file.size / 1024 / 1024).toFixed(2)}MB)
                  </span>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={clearFile}
                  className="h-7 w-7 shrink-0"
                  aria-label="הסר קובץ"
                  disabled={loading}
                >
                  <X className="size-4" aria-hidden />
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="url" className="mt-5 space-y-2">
            <label htmlFor="tender-url" className="text-sm font-medium text-foreground block">
              כתובת ישירה לקובץ PDF/DOCX/XLSX
            </label>
            <Input
              id="tender-url"
              type="url"
              dir="ltr"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setValidationError(null);
              }}
              placeholder="https://example.gov.il/tenders/12345.pdf"
              className="h-11 text-sm"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              כתובת חייבת להיות ניתנת להורדה ציבורית (ללא צורך בהתחברות).
            </p>
          </TabsContent>
        </Tabs>

        {validationError && (
          <p className="text-sm text-destructive text-center" role="alert">
            {validationError}
          </p>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-center gap-2 pt-2">
          {loading && onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} className="gap-2">
              <X className="size-4" aria-hidden />
              ביטול
            </Button>
          )}
          <Button type="submit" size="lg" disabled={loading} className="gap-2 min-w-48">
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                מנתח…
              </>
            ) : (
              <>
                <Sparkles className="size-4" aria-hidden />
                נתח מכרז
              </>
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
}
