import { useState, useMemo } from 'react';
import { useInventoryData } from '@/hooks/useInventoryData';
import { motion } from 'framer-motion';
import { 
  Plus, Search, Edit2, Trash2, Package, AlertTriangle, 
  SortAsc, SortDesc, ArrowUpDown, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type SortField = 'code' | 'name' | 'group' | 'current_stock' | 'min_stock' | 'status';
type SortDirection = 'asc' | 'desc';

export function ProductsTable() {
  const { products, groups, addProduct, deleteProduct, updateProduct, isAdmin, isLoading } = useInventoryData();
  
  // Search
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter by group
  const [filterGroup, setFilterGroup] = useState<string>('all');
  
  // Sorting
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [codeError, setCodeError] = useState('');
  
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    group_id: '',
    unit: 'unidade',
    current_stock: 0,
    min_stock: 0
  });

  const resetForm = () => {
    setFormData({ code: '', name: '', group_id: '', unit: 'unidade', current_stock: 0, min_stock: 0 });
    setEditingProduct(null);
    setCodeError('');
  };

  const isCodeDuplicate = (code: string) => {
    return products.some(p => p.code.toLowerCase() === code.toLowerCase() && p.id !== editingProduct);
  };

  const handleSubmit = () => {
    setCodeError('');
    
    if (!formData.code.trim() || !formData.name.trim() || !formData.group_id) {
      return;
    }

    if (isCodeDuplicate(formData.code)) {
      setCodeError('Este código já está em uso por outro produto');
      return;
    }

    if (editingProduct) {
      updateProduct(editingProduct, formData);
    } else {
      addProduct(formData);
    }
    resetForm();
    setCodeError('');
    setIsDialogOpen(false);
  };

  const openEditDialog = (product: typeof products[0]) => {
    setFormData({
      code: product.code,
      name: product.name,
      group_id: product.group_id,
      unit: product.unit,
      current_stock: product.current_stock,
      min_stock: product.min_stock || 0
    });
    setEditingProduct(product.id);
    setIsDialogOpen(true);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getGroupName = (groupId: string) => {
    return groups.find(g => g.id === groupId)?.name || 'Sem grupo';
  };

  const getGroupColor = (groupId: string) => {
    return groups.find(g => g.id === groupId)?.color || '#888';
  };

  const getStockStatus = (product: typeof products[0]): 'ok' | 'low' | 'zero' => {
    if (product.current_stock === 0) return 'zero';
    if (product.min_stock && product.current_stock < product.min_stock) return 'low';
    return 'ok';
  };

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let result = products.filter(product => {
      // Search filter
      const matchesSearch = 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.code.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      // Group filter
      if (filterGroup !== 'all' && product.group_id !== filterGroup) {
        return false;
      }

      return true;
    });

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'code':
          comparison = a.code.localeCompare(b.code);
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'group':
          comparison = getGroupName(a.group_id).localeCompare(getGroupName(b.group_id));
          break;
        case 'current_stock':
          comparison = a.current_stock - b.current_stock;
          break;
        case 'min_stock':
          comparison = (a.min_stock || 0) - (b.min_stock || 0);
          break;
        case 'status':
          const statusOrder = { zero: 0, low: 1, ok: 2 };
          comparison = statusOrder[getStockStatus(a)] - statusOrder[getStockStatus(b)];
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [products, searchTerm, filterGroup, sortField, sortDirection, groups]);

  const SortableHeader = ({ field, children, className }: { field: SortField; children: React.ReactNode; className?: string }) => (
    <TableHead 
      className={cn("cursor-pointer select-none hover:bg-muted/50 transition-colors", className)}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field ? (
          sortDirection === 'asc' ? (
            <SortAsc className="h-3 w-3" />
          ) : (
            <SortDesc className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-30" />
        )}
      </div>
    </TableHead>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-xl border bg-card p-6"
    >
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-lg font-semibold">Produtos</h3>
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 sm:w-[200px]"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                onClick={() => setSearchTerm('')}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* Group filter */}
          <Select value={filterGroup} onValueChange={setFilterGroup}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por grupo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os grupos</SelectItem>
              {groups.map(group => (
                <SelectItem key={group.id} value={group.id}>
                  <div className="flex items-center gap-2">
                    <div 
                      className="h-2 w-2 rounded-full" 
                      style={{ backgroundColor: group.color }}
                    />
                    {group.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Add product button */}
          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Novo Produto
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingProduct ? 'Editar Produto' : 'Adicionar Produto'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="productCode">Código</Label>
                      <Input
                        id="productCode"
                        value={formData.code}
                        onChange={(e) => {
                          setFormData({ ...formData, code: e.target.value.toUpperCase() });
                          setCodeError('');
                        }}
                        placeholder="Ex: NF-F28"
                        maxLength={20}
                        className={codeError ? 'border-destructive' : ''}
                      />
                      {codeError && (
                        <p className="text-xs text-destructive">{codeError}</p>
                      )}
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="productName">Nome do Produto</Label>
                      <Input
                        id="productName"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Ex: Fubá Pre Cozido Master"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="productGroup">Grupo</Label>
                    <Select value={formData.group_id} onValueChange={(value) => setFormData({ ...formData, group_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um grupo" />
                      </SelectTrigger>
                      <SelectContent>
                        {groups.map(group => (
                          <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="productUnit">Unidade</Label>
                      <Select value={formData.unit} onValueChange={(value) => setFormData({ ...formData, unit: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unidade">Unidade</SelectItem>
                          <SelectItem value="bag">Bag</SelectItem>
                          <SelectItem value="kg">Kg</SelectItem>
                          <SelectItem value="ton">Tonelada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="productStock">Estoque Inicial</Label>
                      <Input
                        id="productStock"
                        type="number"
                        value={formData.current_stock}
                        onChange={(e) => setFormData({ ...formData, current_stock: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="productMinStock">Estoque Mínimo</Label>
                    <Input
                      id="productMinStock"
                      type="number"
                      value={formData.min_stock}
                      onChange={(e) => setFormData({ ...formData, min_stock: Number(e.target.value) })}
                    />
                  </div>
                  <Button onClick={handleSubmit} className="w-full">
                    {editingProduct ? 'Salvar Alterações' : 'Adicionar Produto'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader field="code" className="w-[100px]">Código</SortableHeader>
              <SortableHeader field="name">Produto</SortableHeader>
              <SortableHeader field="group">Grupo</SortableHeader>
              <SortableHeader field="current_stock" className="text-right">Estoque</SortableHeader>
              <SortableHeader field="min_stock" className="text-right">Mínimo</SortableHeader>
              <SortableHeader field="status" className="text-center">Status</SortableHeader>
              {isAdmin && <TableHead className="text-right">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 7 : 6} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <Package className="h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground">Nenhum produto encontrado</p>
                    {(searchTerm || filterGroup !== 'all') && (
                      <Button variant="link" size="sm" onClick={() => { setSearchTerm(''); setFilterGroup('all'); }}>
                        Limpar busca e filtros
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product, index) => {
                const status = getStockStatus(product);
                return (
                  <motion.tr
                    key={product.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.3) }}
                    className={cn(
                      'border-b transition-colors hover:bg-muted/50',
                      status === 'zero' && 'bg-destructive/10',
                      status === 'low' && 'bg-destructive/5'
                    )}
                  >
                    <TableCell>
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-semibold">
                        {product.code}
                      </code>
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        {product.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className="gap-1"
                        style={{ borderColor: getGroupColor(product.group_id), color: getGroupColor(product.group_id) }}
                      >
                        <div 
                          className="h-2 w-2 rounded-full" 
                          style={{ backgroundColor: getGroupColor(product.group_id) }}
                        />
                        {getGroupName(product.group_id)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {product.current_stock.toLocaleString('pt-BR')} {product.unit}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {product.min_stock?.toLocaleString('pt-BR') || '-'} {product.min_stock ? product.unit : ''}
                    </TableCell>
                    <TableCell className="text-center">
                      {status === 'zero' ? (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Zerado
                        </Badge>
                      ) : status === 'low' ? (
                        <Badge className="gap-1 bg-orange-500 hover:bg-orange-600 text-white">
                          <AlertTriangle className="h-3 w-3" />
                          Baixo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-primary/50 text-primary">
                          OK
                        </Badge>
                      )}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(product)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => deleteProduct(product.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </motion.tr>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </motion.div>
  );
}
