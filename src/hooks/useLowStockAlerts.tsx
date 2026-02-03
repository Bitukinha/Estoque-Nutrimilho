import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface LowStockAlert {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  currentStock: number;
  minStock: number;
  groupName: string;
  groupColor: string;
  createdAt: Date;
  isRead: boolean;
}

export function useLowStockAlerts() {
  const [alerts, setAlerts] = useState<LowStockAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchLowStockProducts = useCallback(async () => {
    if (!user) return;

    try {
      const { data: products, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          code,
          current_stock,
          min_stock,
          group_id,
          product_groups (
            name,
            color
          )
        `)
        .not('min_stock', 'is', null);

      if (error) throw error;

      const lowStockProducts = products?.filter(
        (p) => p.current_stock <= (p.min_stock || 0)
      ) || [];

      const newAlerts: LowStockAlert[] = lowStockProducts.map((product) => ({
        id: `alert-${product.id}`,
        productId: product.id,
        productName: product.name,
        productCode: product.code,
        currentStock: product.current_stock,
        minStock: product.min_stock || 0,
        groupName: (product.product_groups as any)?.name || 'Sem grupo',
        groupColor: (product.product_groups as any)?.color || '#888888',
        createdAt: new Date(),
        isRead: false,
      }));

      // Preserve read state from previous alerts
      setAlerts((prevAlerts) => {
        const readAlertIds = new Set(
          prevAlerts.filter((a) => a.isRead).map((a) => a.id)
        );
        return newAlerts.map((alert) => ({
          ...alert,
          isRead: readAlertIds.has(alert.id),
        }));
      });
    } catch (error) {
      console.error('Error fetching low stock products:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchLowStockProducts();

    // Subscribe to realtime changes on products table
    const channel = supabase
      .channel('products-stock-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
        },
        () => {
          fetchLowStockProducts();
        }
      )
      .subscribe();

    // Poll every 5 minutes as backup
    const interval = setInterval(fetchLowStockProducts, 5 * 60 * 1000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [fetchLowStockProducts]);

  const markAsRead = useCallback((alertId: string) => {
    setAlerts((prevAlerts) =>
      prevAlerts.map((alert) =>
        alert.id === alertId ? { ...alert, isRead: true } : alert
      )
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setAlerts((prevAlerts) =>
      prevAlerts.map((alert) => ({ ...alert, isRead: true }))
    );
  }, []);

  const unreadCount = alerts.filter((a) => !a.isRead).length;

  return {
    alerts,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refresh: fetchLowStockProducts,
  };
}
