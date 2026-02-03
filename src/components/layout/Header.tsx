import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut, Shield, User } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import logoNutrimilho from '@/assets/logo-nutrimilho.png';

export function Header() {
  const { user, isAdmin, signOut } = useAuth();

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="border-b bg-card/80 backdrop-blur-md"
    >
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <img 
            src={logoNutrimilho} 
            alt="Nutrimilho" 
            className="h-10 w-auto"
          />
          <div className="hidden sm:block">
            <h1 className="text-lg font-bold text-primary">Controle de Estoque</h1>
            <p className="text-xs text-muted-foreground">Sistema de Gestão de Inventário</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
            {isAdmin ? (
              <Shield className="h-4 w-4 text-primary" />
            ) : (
              <User className="h-4 w-4" />
            )}
            <span className="max-w-[150px] truncate">{user?.email}</span>
            {isAdmin && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                Admin
              </span>
            )}
          </div>
          <NotificationCenter />
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={signOut} className="gap-2">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </div>
    </motion.header>
  );
}
