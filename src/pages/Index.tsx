import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Navigation } from '@/components/layout/Navigation';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { RecentMovements } from '@/components/dashboard/RecentMovements';
import { GroupDashboard } from '@/components/dashboard/GroupDashboard';
import { GroupsManager } from '@/components/inventory/GroupsManager';
import { ProductsTable } from '@/components/inventory/ProductsTable';
import { MovementsManager } from '@/components/inventory/MovementsManager';
import { StockReportGenerator } from '@/components/reports/StockReportGenerator';
import { motion, AnimatePresence } from 'framer-motion';

const Index = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container px-4 py-6">
        <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
        
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <DashboardStats />
                <GroupDashboard />
                <RecentMovements />
              </div>
            )}

            {activeTab === 'products' && <ProductsTable />}
            
            {activeTab === 'groups' && <GroupsManager />}
            
            {activeTab === 'movements' && <MovementsManager />}
            
            {activeTab === 'reports' && <StockReportGenerator />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

export default Index;
