import { useCallback, useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  createHotInvestorBoard,
  deleteHotInvestorBoard,
  fetchHotInvestorBoardsAdmin,
  updateHotInvestorBoard,
  type HotInvestorBoardListing,
} from "@/lib/api/hotInvestorBoardsApi";
import { getToken } from "@/lib/api/authApi";
import {
  HOT_INVESTOR_CATEGORY_LABELS,
  HOT_INVESTOR_CATEGORY_ORDER,
} from "@/lib/hotInvestorBoards";
import type { HotInvestorBoardCategory } from "@/lib/api/hotInvestorBoardsApi";
import { LayoutGrid, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

const emptyForm = () => ({
  category: "pinui_binui" as HotInvestorBoardCategory,
  title: "",
  subtitle: "",
  description: "",
  price_label: "",
  location_label: "",
  contact_phone: "",
  contact_email: "",
  external_link: "",
  image_url: "",
  display_order: "0",
  is_published: false,
});

type FormState = ReturnType<typeof emptyForm>;

function formFromListing(p: HotInvestorBoardListing): FormState {
  return {
    category: p.category,
    title: p.title,
    subtitle: p.subtitle ?? "",
    description: p.description ?? "",
    price_label: p.price_label ?? "",
    location_label: p.location_label ?? "",
    contact_phone: p.contact_phone ?? "",
    contact_email: p.contact_email ?? "",
    external_link: p.external_link ?? "",
    image_url: p.image_url ?? "",
    display_order: String(p.display_order ?? 0),
    is_published: p.is_published,
  };
}

export function HotInvestorBoardsAdminPanel() {
  const [rows, setRows] = useState<HotInvestorBoardListing[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setLoadError("לא מחובר");
      setRows([]);
      return;
    }
    const res = await fetchHotInvestorBoardsAdmin(token);
    if (res.success) {
      setRows(res.listings);
      setLoadError(null);
    } else {
      setLoadError(res.error);
      setRows([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setImagePreview(null);
    setDialogOpen(true);
  };

  const openEdit = (p: HotInvestorBoardListing) => {
    setEditingId(p.id);
    setForm(formFromListing(p));
    setImagePreview(p.image_url);
    setDialogOpen(true);
  };

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("נא לבחור קובץ תמונה בלבד");
      return;
    }
    if (file.size > 1.8 * 1024 * 1024) {
      toast.error("הקובץ גדול מדי (מקסימום כ־1.8MB). נסו לכווץ או להשתמש בקישור לתמונה.");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const data = reader.result as string;
      setImagePreview(data);
      setForm((f) => ({ ...f, image_url: data }));
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setImagePreview(null);
    setForm((f) => ({ ...f, image_url: "" }));
  };

  const handleSave = async () => {
    const token = getToken();
    if (!token) {
      toast.error("לא מחובר");
      return;
    }
    if (!form.title.trim()) {
      toast.error("נא למלא כותרת");
      return;
    }
    const order = Number.parseInt(form.display_order, 10);
    const display_order = Number.isFinite(order) ? order : 0;

    setSaving(true);
    try {
      if (editingId) {
        const res = await updateHotInvestorBoard(token, editingId, {
          category: form.category,
          title: form.title.trim(),
          subtitle: form.subtitle.trim() || null,
          description: form.description.trim() || null,
          price_label: form.price_label.trim() || null,
          location_label: form.location_label.trim() || null,
          contact_phone: form.contact_phone.trim() || null,
          contact_email: form.contact_email.trim() || null,
          external_link: form.external_link.trim() || null,
          image_url: form.image_url.trim() || null,
          display_order,
          is_published: form.is_published,
        });
        if (!res.success) {
          toast.error(res.error);
          return;
        }
        toast.success("עודכן בהצלחה");
      } else {
        const res = await createHotInvestorBoard(token, {
          category: form.category,
          title: form.title.trim(),
          subtitle: form.subtitle.trim() || null,
          description: form.description.trim() || null,
          price_label: form.price_label.trim() || null,
          location_label: form.location_label.trim() || null,
          contact_phone: form.contact_phone.trim() || null,
          contact_email: form.contact_email.trim() || null,
          external_link: form.external_link.trim() || null,
          image_url: form.image_url.trim() || null,
          display_order,
          is_published: form.is_published,
        });
        if (!res.success) {
          toast.error(res.error);
          return;
        }
        toast.success("נוצר בהצלחה");
      }
      setDialogOpen(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const token = getToken();
    if (!token) return;
    setDeleting(true);
    try {
      const res = await deleteHotInvestorBoard(token, deleteId);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success("נמחק");
      setDeleteId(null);
      await load();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Card className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <LayoutGrid className="size-5 text-primary" />
              <h3 className="text-lg font-semibold">לוחות נדל״ן חמים (מנהל)</h3>
            </div>
            <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
              הוספת מודעות לעמוד &quot;לוחות נדל״ן חמים למשקיעים&quot;. פרסום פעיל שולח התראה למשתמשים
              שבחרו לקבל עדכון בהגדרות.
            </p>
          </div>
          <Button type="button" onClick={openCreate} className="shrink-0 gap-2">
            <Plus className="size-4" />
            מודעה חדשה
          </Button>
        </div>

        <div className="mt-6">
          {loadError && <p className="text-sm text-destructive mb-2">{loadError}</p>}
          {rows === null && !loadError && (
            <p className="text-sm text-muted-foreground py-8 text-center">טוען…</p>
          )}
          {rows && rows.length === 0 && !loadError && (
            <p className="text-sm text-muted-foreground py-8 text-center">אין רשומות עדיין</p>
          )}
          {rows && rows.length > 0 && (
            <div className="rounded-md border overflow-x-auto">
              <Table dir="rtl">
                <TableHeader>
                  <TableRow>
                    <TableHead>כותרת</TableHead>
                    <TableHead className="whitespace-nowrap">קטגוריה</TableHead>
                    <TableHead className="whitespace-nowrap">סטטוס</TableHead>
                    <TableHead className="text-left w-[100px]">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium max-w-[200px]">{row.title}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{HOT_INVESTOR_CATEGORY_LABELS[row.category]}</Badge>
                      </TableCell>
                      <TableCell>
                        {row.is_published ? (
                          <Badge>מפורסם</Badge>
                        ) : (
                          <Badge variant="outline">טיוטה</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-left">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            title="עריכה"
                            onClick={() => openEdit(row)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            title="מחיקה"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(row.id)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </Card>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setImagePreview(null);
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingId ? "עריכת מודעה" : "מודעה חדשה"}</DialogTitle>
            <DialogDescription>
              הפרטים יוצגו בעמוד הלוחות כאשר הסטטוס &quot;מפורסם&quot; פעיל.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>קטגוריה</Label>
              <Select
                value={form.category}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, category: v as HotInvestorBoardCategory }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HOT_INVESTOR_CATEGORY_ORDER.map((c) => (
                    <SelectItem key={c} value={c}>
                      {HOT_INVESTOR_CATEGORY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="hib-title">כותרת *</Label>
              <Input
                id="hib-title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="למשל: דירת 3 חדרים בפרויקט פינוי־בינוי"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hib-sub">שורת משנה</Label>
              <Input
                id="hib-sub"
                value={form.subtitle}
                onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hib-desc">תיאור</Label>
              <Textarea
                id="hib-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={4}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hib-price">מחיר / תווית מחיר</Label>
                <Input
                  id="hib-price"
                  value={form.price_label}
                  onChange={(e) => setForm((f) => ({ ...f, price_label: e.target.value }))}
                  placeholder="למשל: 950,000 ₪"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hib-loc">מיקום</Label>
                <Input
                  id="hib-loc"
                  value={form.location_label}
                  onChange={(e) => setForm((f) => ({ ...f, location_label: e.target.value }))}
                  placeholder="עיר / שכונה"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hib-phone">טלפון</Label>
                <Input
                  id="hib-phone"
                  dir="ltr"
                  className="text-left"
                  value={form.contact_phone}
                  onChange={(e) => setForm((f) => ({ ...f, contact_phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hib-email">אימייל</Label>
                <Input
                  id="hib-email"
                  dir="ltr"
                  className="text-left"
                  type="email"
                  value={form.contact_email}
                  onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="hib-link">קישור חיצוני</Label>
              <Input
                id="hib-link"
                dir="ltr"
                className="text-left"
                placeholder="https://"
                value={form.external_link}
                onChange={(e) => setForm((f) => ({ ...f, external_link: e.target.value }))}
              />
            </div>

            <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
              <Label className="text-base font-semibold">תמונה</Label>
              {imagePreview && (
                <div className="relative aspect-video w-full max-h-52 overflow-hidden rounded-lg border bg-background">
                  <img src={imagePreview} alt="" className="h-full w-full object-contain" />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 left-2 h-8 w-8"
                    onClick={clearImage}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="hib-img-url">קישור לתמונה (אופציונלי)</Label>
                <Input
                  id="hib-img-url"
                  dir="ltr"
                  className="text-left"
                  placeholder="https://…"
                  value={form.image_url.startsWith("data:") ? "" : form.image_url}
                  onChange={(e) => {
                    const v = e.target.value;
                    setForm((f) => ({ ...f, image_url: v }));
                    setImagePreview(v || null);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hib-img-file">או העלאה מהמחשב</Label>
                <Input
                  id="hib-img-file"
                  type="file"
                  accept="image/*"
                  className="cursor-pointer"
                  onChange={handleImageFile}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hib-order">סדר הצגה</Label>
              <Input
                id="hib-order"
                inputMode="numeric"
                value={form.display_order}
                onChange={(e) => setForm((f) => ({ ...f, display_order: e.target.value }))}
              />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/30 px-4 py-3">
              <div>
                <p className="font-medium text-sm">פרסום באתר</p>
                <p className="text-xs text-muted-foreground">
                  במעבר ל&quot;מפורסם&quot; נשלחת התראה למנויים (אם הופעל בהגדרות)
                </p>
              </div>
              <Switch
                checked={form.is_published}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_published: v }))}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              ביטול
            </Button>
            <Button type="button" onClick={() => void handleSave()} disabled={saving}>
              {saving ? "שומר…" : "שמירה"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>למחוק מודעה?</AlertDialogTitle>
            <AlertDialogDescription>פעולה זו אינה ניתנת לביטול.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel disabled={deleting}>ביטול</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
              disabled={deleting}
            >
              {deleting ? "מוחק…" : "מחיקה"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
