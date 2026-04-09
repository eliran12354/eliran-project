import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PurchaseTaxCalculator } from "@/components/tax/PurchaseTaxCalculator";
import { CapitalGainsCalculator } from "@/components/tax/CapitalGainsCalculator";
import { Calculator } from "lucide-react";

export default function TaxPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-8 text-center">
        <div className="mb-2 flex justify-center">
          <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md">
            <Calculator className="size-7" />
          </span>
        </div>
        <h1 className="text-2xl font-bold text-blue-800 sm:text-3xl">מחשבוני מס נדל״ן</h1>
        <p className="mt-2 text-muted-foreground">
          מס רכישה לפי מדרגות ממסד הנתונים; מס שבח — הערכה בלבד.
        </p>
      </header>

      <Tabs defaultValue="purchase" className="w-full" dir="rtl">
        <TabsList className="mb-6 grid w-full grid-cols-2">
          <TabsTrigger value="purchase">מס רכישה</TabsTrigger>
          <TabsTrigger value="gains">מס שבח (הערכה)</TabsTrigger>
        </TabsList>
        <TabsContent value="purchase">
          <PurchaseTaxCalculator />
        </TabsContent>
        <TabsContent value="gains">
          <CapitalGainsCalculator />
        </TabsContent>
      </Tabs>
    </div>
  );
}
