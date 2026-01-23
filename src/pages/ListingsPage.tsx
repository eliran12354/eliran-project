import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { TenderListings } from "@/components/TenderListings";
import { TelegramDocumentsListings } from "@/components/TelegramDocumentsListings";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Hammer } from "lucide-react";

const ListingsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = useMemo(() => {
    const tab = searchParams.get("tab");
    return tab === "execution" ? "execution" : "rami";
  }, [searchParams]);
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    const current = searchParams.get("tab");
    if (current !== activeTab) {
      const next = new URLSearchParams(searchParams);
      next.set("tab", activeTab);
      setSearchParams(next, { replace: true });
    }
  }, [activeTab]);

  return (
    <div className="w-full" dir="rtl">
      <div className="max-w-[1200px] mx-auto px-6 py-8">
        <div className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 bg-green-50/50">
          <TabsTrigger 
            value="rami" 
            className="text-xl font-semibold gap-2 flex items-center justify-center data-[state=active]:bg-green-100 data-[state=active]:text-green-700 hover:bg-green-100/50 transition-colors"
          >
            מכרזי רמ"י
            <Hammer className="w-5 h-5" />
          </TabsTrigger>
          <TabsTrigger 
            value="execution" 
            className="text-xl font-semibold gap-2 flex items-center justify-center data-[state=active]:bg-green-100 data-[state=active]:text-green-700 hover:bg-green-100/50 transition-colors"
          >
            מכרזי הוצאה לפועל
            <Hammer className="w-5 h-5" />
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="rami" className="mt-6">
          <TenderListings />
        </TabsContent>
        
        <TabsContent value="execution" className="mt-6">
          <TelegramDocumentsListings />
        </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default ListingsPage;