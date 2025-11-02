import { useState } from "react";
import { TenderListings } from "@/components/TenderListings";
import { TelegramDocumentsListings } from "@/components/TelegramDocumentsListings";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const ListingsPage = () => {
  const [activeTab, setActiveTab] = useState("rami");

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
          <TabsTrigger value="rami" className="text-base">
            מכרזי רמ"י
          </TabsTrigger>
          <TabsTrigger value="execution" className="text-base">
            מכרזי הוצאה לפועל
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
  );
};

export default ListingsPage;