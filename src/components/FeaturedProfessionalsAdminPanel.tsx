import { useQueryClient } from "@tanstack/react-query";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  createFeaturedProfessional,
  deleteFeaturedProfessional,
  fetchFeaturedProfessionalsAdmin,
  updateFeaturedProfessional,
  type FeaturedProfessional,
} from "@/lib/api/featuredProfessionalsApi";
import { getToken } from "@/lib/api/authApi";
import { Briefcase, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const emptyForm = () => ({
  name: "",
  headline: "",
  description: "",
  city: "",
  phone: "",
  email: "",
  website_url: "",
  whatsapp: "",
  image_url: "",
  display_order: "0",
  is_published: false,
});

type FormState = ReturnType<typeof emptyForm>;

function formFromProfessional(p: FeaturedProfessional): FormState {
  return {
    name: p.name,
    headline: p.headline ?? "",
    description: p.description ?? "",
    city: p.city ?? "",
    phone: p.phone ?? "",
    email: p.email ?? "",
    website_url: p.website_url ?? "",
    whatsapp: p.whatsapp ?? "",
    image_url: p.image_url ?? "",
    display_order: String(p.display_order),
    is_published: p.is_published,
  };
}

export function FeaturedProfessionalsAdminPanel() {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<FeaturedProfessional[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setLoadError("לא מחובר");
      setRows([]);
      return;
    }
    const res = await fetchFeaturedProfessionalsAdmin(token);
    if (res.success) {
      setRows(res.professionals);
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
    setDialogOpen(true);
  };

  const openEdit = (p: FeaturedProfessional) => {
    setEditingId(p.id);
    setForm(formFromProfessional(p));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const token = getToken();
    if (!token) {
      toast.error("נדרשת התחברות");
      return;
    }
    const name = form.name.trim();
    if (!name) {
      toast.error("נא למלא שם");
      return;
    }
    const orderNum = Number.parseInt(form.display_order, 10);
    const display_order = Number.isFinite(orderNum) ? orderNum : 0;

    setSaving(true);
    try {
      if (editingId) {
        const res = await updateFeaturedProfessional(token, editingId, {
          name,
          headline: form.headline.trim() || null,
          description: form.description.trim() || null,
          city: form.city.trim() || null,
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          website_url: form.website_url.trim() || null,
          whatsapp: form.whatsapp.trim() || null,
          image_url: form.image_url.trim() || null,
          display_order,
          is_published: form.is_published,
        });
        if (res.success) {
          toast.success("עודכן בהצלחה");
          setDialogOpen(false);
          await queryClient.invalidateQueries({ queryKey: ["featured-professionals-public"] });
          await load();
        } else {
          toast.error(res.error);
        }
      } else {
        const res = await createFeaturedProfessional(token, {
          name,
          headline: form.headline.trim() || null,
          description: form.description.trim() || null,
          city: form.city.trim() || null,
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          website_url: form.website_url.trim() || null,
          whatsapp: form.whatsapp.trim() || null,
          image_url: form.image_url.trim() || null,
          display_order,
          is_published: form.is_published,
        });
        if (res.success) {
          toast.success("נוצר בהצלחה");
          setDialogOpen(false);
          await queryClient.invalidateQueries({ queryKey: ["featured-professionals-public"] });
          await load();
        } else {
          toast.error(res.error);
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const token = getToken();
    if (!token) {
      toast.error("נדרשת התחברות");
      return;
    }
    setDeleting(true);
    try {
      const res = await deleteFeaturedProfessional(token, deleteId);
      if (res.success) {
        toast.success("נמחק");
        setDeleteId(null);
        await queryClient.invalidateQueries({ queryKey: ["featured-professionals-public"] });
        await load();
      } else {
        toast.error(res.error);
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Card className="overflow-hidden border-border/80 shadow-sm">
        <div className="flex flex-col gap-4 border-b border-border/60 bg-muted/20 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">בעלי מקצוע מומלצים</h3>
              <p className="text-sm text-muted-foreground">
                ניהול פרסומים המוצגים בדף הבית (רק פריטים מפורסמים).
              </p>
            </div>
          </div>
          <Button type="button" onClick={openCreate} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" />
            הוספת בעל מקצוע
          </Button>
        </div>

        <div className="p-6">
          {loadError && (
            <p className="text-sm text-destructive mb-4" role="alert">
              {loadError}
            </p>
          )}
          {rows === null && !loadError && (
            <p className="text-sm text-muted-foreground py-8 text-center">טוען…</p>
          )}
          {rows && rows.length === 0 && !loadError && (
            <p className="text-sm text-muted-foreground py-10 text-center rounded-lg border border-dashed bg-muted/15">
              אין רשומות עדיין. לחצו על &quot;הוספת בעל מקצוע&quot;.
            </p>
          )}
          {rows && rows.length > 0 && (
            <div className="rounded-md border overflow-x-auto">
              <Table dir="rtl">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-right min-w-[8rem]">שם</TableHead>
                    <TableHead className="text-right min-w-[6rem]">תחום</TableHead>
                    <TableHead className="text-right w-24">סדר</TableHead>
                    <TableHead className="text-right w-28">סטטוס</TableHead>
                    <TableHead className="text-left w-32">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {p.headline || "—"}
                      </TableCell>
                      <TableCell className="tabular-nums">{p.display_order}</TableCell>
                      <TableCell>
                        {p.is_published ? (
                          <Badge className="bg-emerald-600/90 hover:bg-emerald-600">מפורסם</Badge>
                        ) : (
                          <Badge variant="secondary">טיוטה</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-left">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => openEdit(p)}
                            title="עריכה"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(p.id)}
                            title="מחיקה"
                          >
                            <Trash2 className="h-4 w-4" />
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingId ? "עריכת בעל מקצוע" : "בעל מקצוע חדש"}</DialogTitle>
            <DialogDescription>
              הפרטים יוצגו בדף הבית רק כאשר הסטטוס &quot;מפורסם&quot; פעיל.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="fp-name">שם מלא *</Label>
              <Input
                id="fp-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="לדוגמה: עו״ד יוסי כהן"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fp-headline">תחום / כותרת</Label>
              <Input
                id="fp-headline"
                value={form.headline}
                onChange={(e) => setForm((f) => ({ ...f, headline: e.target.value }))}
                placeholder="שמאות מקרקעין, ליווי עסקאות…"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fp-desc">תיאור קצר</Label>
              <Textarea
                id="fp-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                placeholder="משפט או שניים על השירות"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fp-city">עיר / אזור</Label>
                <Input
                  id="fp-city"
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fp-order">סדר הצגה</Label>
                <Input
                  id="fp-order"
                  inputMode="numeric"
                  value={form.display_order}
                  onChange={(e) => setForm((f) => ({ ...f, display_order: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fp-phone">טלפון</Label>
                <Input
                  id="fp-phone"
                  dir="ltr"
                  className="text-left"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fp-email">אימייל</Label>
                <Input
                  id="fp-email"
                  dir="ltr"
                  className="text-left"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fp-wa">וואטסאפ</Label>
              <Input
                id="fp-wa"
                dir="ltr"
                className="text-left"
                placeholder="05XXXXXXXX או קישור"
                value={form.whatsapp}
                onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fp-web">כתובת אתר</Label>
              <Input
                id="fp-web"
                dir="ltr"
                className="text-left"
                placeholder="https://"
                value={form.website_url}
                onChange={(e) => setForm((f) => ({ ...f, website_url: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fp-img">קישור לתמונה</Label>
              <Input
                id="fp-img"
                dir="ltr"
                className="text-left"
                placeholder="https://…"
                value={form.image_url}
                onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
              />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/30 px-4 py-3">
              <div>
                <p className="font-medium text-sm">פרסום באתר</p>
                <p className="text-xs text-muted-foreground">כבוי = נשמר כטיוטה בלבד</p>
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
            <AlertDialogTitle>למחוק רשומה?</AlertDialogTitle>
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
