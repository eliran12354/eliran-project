import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitContact } from "@/lib/api/contactApi";
import { useToast } from "@/hooks/use-toast";

type ContactDialogProps = {
  children?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function ContactDialog({ children, open: controlledOpen, onOpenChange }: ContactDialogProps) {
  const { toast } = useToast();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined && onOpenChange !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (v: boolean) => {
    if (isControlled) onOpenChange(v);
    else setInternalOpen(v);
  };

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const result = await submitContact({ name, email, message });
    setPending(false);

    if (result.success) {
      toast({ title: "הפנייה נשלחה", description: "נחזור אליך בהקדם." });
      setName("");
      setEmail("");
      setMessage("");
      setOpen(false);
    } else {
      toast({
        title: "לא ניתן לשלוח",
        description: result.error,
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children ? <DialogTrigger asChild>{children}</DialogTrigger> : null}
      <DialogContent dir="rtl" className="sm:max-w-lg text-right [&>button]:left-4 [&>button]:right-auto">
        <DialogHeader className="text-right sm:text-right space-y-2">
          <DialogTitle>צור קשר</DialogTitle>
          <DialogDescription>
            מלאו את הפרטים ונחזור אליכם בהקדם.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contact-name">שם</Label>
            <Input
              id="contact-name"
              name="name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={200}
              disabled={pending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-email">אימייל</Label>
            <Input
              id="contact-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              maxLength={320}
              disabled={pending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-message">הודעה</Label>
            <Textarea
              id="contact-message"
              name="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              maxLength={5000}
              rows={5}
              disabled={pending}
              className="min-h-[120px] resize-y"
            />
          </div>
          <DialogFooter className="gap-2 sm:justify-start flex-row-reverse">
            <Button type="submit" disabled={pending}>
              {pending ? "שולח…" : "שליחה"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              ביטול
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
