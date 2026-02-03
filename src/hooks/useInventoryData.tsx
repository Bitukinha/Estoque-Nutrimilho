import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface ProductGroup {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
}

export interface Product {
  id: string;
  user_id: string;
  group_id: string;
  code: string;
  name: string;
  unit: string;
  current_stock: number;
  min_stock: number | null;
  created_at: string;
}

export interface StockMovement {
  id: string;
  user_id: string;
  product_id: string;
  type: 'entrada' | 'saida';
  quantity: number;
  previous_stock: number;
  new_stock: number;
  company: string | null;
  notes: string | null;
  created_at: string;
}

export function useInventoryData() {
  const { user, isAdmin } = useAuth();
  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const [groupsRes, productsRes, movementsRes] = await Promise.all([
        supabase.from('product_groups').select('*').order('created_at', { ascending: false }),
        supabase.from('products').select('*').order('created_at', { ascending: false }),
        supabase.from('stock_movements').select('*').order('created_at', { ascending: false }),
      ]);

      if (groupsRes.error) throw groupsRes.error;
      if (productsRes.error) throw productsRes.error;
      if (movementsRes.error) throw movementsRes.error;

      setGroups(groupsRes.data || []);
      setProducts(productsRes.data || []);
      setMovements((movementsRes.data || []) as StockMovement[]);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Group actions
  const addGroup = async (group: { name: string; description?: string; color: string }) => {
    if (!user || !isAdmin) {
      toast.error('Apenas administradores podem adicionar grupos');
      return;
    }

    const { data, error } = await supabase
      .from('product_groups')
      .insert({
        user_id: user.id,
        name: group.name,
        description: group.description || null,
        color: group.color,
      })
      .select()
      .single();

    if (error) {
      toast.error('Erro ao criar grupo');
      console.error(error);
      return;
    }

    setGroups((prev) => [data, ...prev]);
    toast.success('Grupo criado com sucesso');
  };

  const deleteGroup = async (id: string) => {
    if (!isAdmin) {
      toast.error('Apenas administradores podem excluir grupos');
      return;
    }

    const { error } = await supabase.from('product_groups').delete().eq('id', id);

    if (error) {
      toast.error('Erro ao excluir grupo');
      console.error(error);
      return;
    }

    setGroups((prev) => prev.filter((g) => g.id !== id));
    setProducts((prev) => prev.filter((p) => p.group_id !== id));
    toast.success('Grupo excluído com sucesso');
  };

  // Product actions
  const addProduct = async (product: {
    group_id: string;
    code: string;
    name: string;
    unit: string;
    current_stock: number;
    min_stock?: number;
  }) => {
    if (!user || !isAdmin) {
      toast.error('Apenas administradores podem adicionar produtos');
      return;
    }

    const { data, error } = await supabase
      .from('products')
      .insert({
        user_id: user.id,
        group_id: product.group_id,
        code: product.code,
        name: product.name,
        unit: product.unit,
        current_stock: product.current_stock,
        min_stock: product.min_stock || 0,
      })
      .select()
      .single();

    if (error) {
      toast.error('Erro ao criar produto');
      console.error(error);
      return;
    }

    setProducts((prev) => [data, ...prev]);
    toast.success('Produto criado com sucesso');
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    if (!isAdmin) {
      toast.error('Apenas administradores podem editar produtos');
      return;
    }

    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      toast.error('Erro ao atualizar produto');
      console.error(error);
      return;
    }

    setProducts((prev) => prev.map((p) => (p.id === id ? data : p)));
    toast.success('Produto atualizado com sucesso');
  };

  const deleteProduct = async (id: string) => {
    if (!isAdmin) {
      toast.error('Apenas administradores podem excluir produtos');
      return;
    }

    const { error } = await supabase.from('products').delete().eq('id', id);

    if (error) {
      toast.error('Erro ao excluir produto');
      console.error(error);
      return;
    }

    setProducts((prev) => prev.filter((p) => p.id !== id));
    setMovements((prev) => prev.filter((m) => m.product_id !== id));
    toast.success('Produto excluído com sucesso');
  };

  // Movement actions
  const addMovement = async (movement: {
    product_id: string;
    type: 'entrada' | 'saida';
    quantity: number;
    company?: string;
    notes?: string;
  }) => {
    if (!user || !isAdmin) {
      toast.error('Apenas administradores podem registrar movimentações');
      return;
    }

    const product = products.find((p) => p.id === movement.product_id);
    if (!product) {
      toast.error('Produto não encontrado');
      return;
    }

    const previousStock = product.current_stock;
    const newStock =
      movement.type === 'entrada'
        ? previousStock + movement.quantity
        : previousStock - movement.quantity;

    if (newStock < 0) {
      toast.error('Estoque insuficiente para esta saída');
      return;
    }

    // Insert movement
    const { data: movementData, error: movementError } = await supabase
      .from('stock_movements')
      .insert({
        user_id: user.id,
        product_id: movement.product_id,
        type: movement.type,
        quantity: movement.quantity,
        previous_stock: previousStock,
        new_stock: newStock,
        company: movement.company || null,
        notes: movement.notes || null,
      })
      .select()
      .single();

    if (movementError) {
      toast.error('Erro ao registrar movimentação');
      console.error(movementError);
      return;
    }

    // Update product stock
    const { error: updateError } = await supabase
      .from('products')
      .update({ current_stock: newStock })
      .eq('id', movement.product_id);

    if (updateError) {
      toast.error('Erro ao atualizar estoque');
      console.error(updateError);
      return;
    }

    setMovements((prev) => [movementData as StockMovement, ...prev]);
    setProducts((prev) =>
      prev.map((p) => (p.id === movement.product_id ? { ...p, current_stock: newStock } : p))
    );
    toast.success('Movimentação registrada com sucesso');
  };

  return {
    groups,
    products,
    movements,
    isLoading,
    isAdmin,
    addGroup,
    deleteGroup,
    addProduct,
    updateProduct,
    deleteProduct,
    addMovement,
    refetch: fetchData,
  };
}
