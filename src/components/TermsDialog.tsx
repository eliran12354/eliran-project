import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

interface TermsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TERMS_CONTENT = `
תקנון שימוש באתר

1. כללי
השימוש בשירותים המוצעים באתר כפוף לתקנון זה. הרשמה או התחברות לאתר מהוות הסכמה לתנאים המפורטים בתקנון זה.

2. חשבון משתמש
אתה מתחייב לספק פרטים נכונים ומדויקים בעת ההרשמה. אתה אחראי לשמור על סודיות הסיסמה ולכל פעולה שמתבצעת מחשבונך.

3. שימוש מותר
מותר להשתמש באתר למטרות לגיטימיות בלבד, בהתאם למדיניות האתר ולחוק. אסור להעלות תוכן מפר זכויות, פוגעני או בלתי חוקי.

4. קניין רוחני
כל הזכויות בחומרים המוצגים באתר (טקסטים, גרפיקה, לוגואים) שמורות לבעלי האתר או למי שהוסמך על ידם.

5. שינויים
האתר רשאי לעדכן את התקנון מעת לעת. המשך שימוש לאחר עדכון מהווה הסכמה לגרסה המעודכנת.

6. יצירת קשר
לשאלות בנוגע לתקנון ניתן לפנות באמצעות דרכי ההתקשרות שמופיעות באתר.
`.trim();

export function TermsDialog({ open, onOpenChange }: TermsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} dir="rtl">
      <DialogContent className="sm:max-w-[500px] text-right max-h-[85vh] [&>button]:left-4 [&>button]:right-auto" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle className="text-right">תקנון שימוש</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[50vh] w-full rounded-md border p-4 text-sm">
          <div className="whitespace-pre-wrap text-right leading-relaxed">
            {TERMS_CONTENT}
          </div>
        </ScrollArea>
        <div className="flex justify-start">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            סגור
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
