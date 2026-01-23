import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import Index from "./pages/Index";
import MapPage from "./pages/MapPage"; 
import ListingsPage from "./pages/ListingsPage";
import PlansPage from "./pages/PlansPage";
import UrbanRenewalPage from "./pages/UrbanRenewalPage";
import HotAreasPage from "./pages/HotAreasPage";
import GovMapPage from "./pages/GovMapPage";
import DangerousBuildingsPage from "./pages/DangerousBuildingsPage";
import TabuRequestPage from "./pages/TabuRequestPage";
import LandCheckPage from "./pages/LandCheckPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import ResidentialInventoryPage from "./pages/ResidentialInventoryPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/govmap" element={<GovMapPage />} />
            <Route path="/listings" element={<ListingsPage />} />
            <Route path="/plans" element={<PlansPage />} />
            <Route path="/hot-areas" element={<HotAreasPage />} />
            <Route path="/urban-renewal" element={<UrbanRenewalPage />} />
            <Route path="/dangerous-buildings" element={<DangerousBuildingsPage />} />
            <Route path="/tabu-request" element={<TabuRequestPage />} />
            <Route path="/land-check" element={<LandCheckPage />} />
            <Route path="/admin-dashboard" element={<AdminDashboardPage />} />
            <Route path="/residential-inventory" element={<ResidentialInventoryPage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
