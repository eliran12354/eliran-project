import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FileText } from "lucide-react";

/** טקסט דוגמה — ניתן לעדכן לפי הארגון והמדיניות בפועל */
const STATEMENT_TEXT = `הצהרת נגישות

מה זה?
הצהרת נגישות היא מסמך שמסביר כיצד האתר מיועד להיות נגיש לאנשים עם מוגבלויות (ראייה, שמיעה, תנועה, קוגניציה ועוד), אילו תקנים נלקחו בחשבון, ומה לעשות אם נתקלתם בבעיה.

מחויבות
אנו פועלים להנגשת האתר בהתאם לחוק שוויון זכויות לאנשים עם מוגבלות, תשנ"ח–1998, ולתקן הישראלי ת"י 5568 ברמת AA ככל הניתן טכנית.

התאמות באתר
• ניווט במקלדת וקישור "דלג לתוכן"
• התאמות תצוגה (גודל טקסט, ניגודיות, הפחתת תנועה, מרווח שורות)
• מבנה כותרות וכיוון עברית (RTL)

מגבלות
ייתכן שחלקים באתר (למשל מפות חיצוניות או תוכן מוטמע) אינם נגישים במלואם — נשמח לקבל פנייה ולסייע בחלופה.

פנייה בנושא נגישות
אם מצאתם ליקוי נגישות או שאלה, ניתן לפנות אלינו דרך "צור קשר" באתר או במייל שיפורסם כאן.

עדכון אחרון: ניתן לעדכן תאריך בעת פרסום רשמי.
`;

type AccessibilityStatementDialogProps = {
  trigger?: ReactNode;
};

export function AccessibilityStatementDialog({
  trigger,
}: AccessibilityStatementDialogProps) {
  const [open, setOpen] = useState(false);

  const defaultTrigger = (
    <Button type="button" variant="outline" className="w-full gap-2 justify-center">
      <FileText className="h-4 w-4" />
      הצהרת נגישות
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? defaultTrigger}</DialogTrigger>
      <DialogContent
        dir="rtl"
        className="max-h-[85vh] overflow-y-auto sm:max-w-lg text-right [&>button]:left-4 [&>button]:right-auto"
      >
        <DialogHeader className="space-y-2 text-center sm:text-center">
          <DialogTitle className="text-center w-full">הצהרת נגישות</DialogTitle>
          <DialogDescription className="text-right text-muted-foreground">
            מידע כללי — ניתן להתאים לפי הארגון
          </DialogDescription>
        </DialogHeader>
        <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed border-t pt-4">
          {STATEMENT_TEXT}
        </div>
        <Button type="button" className="w-full" onClick={() => setOpen(false)}>
          סגירה
        </Button>
      </DialogContent>
    </Dialog>
  );
}
