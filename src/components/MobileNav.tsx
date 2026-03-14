import { Home, List, Bell, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export function MobileNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  if (!user) return null;

  const navItems = [
    { path: '/home', icon: Home, label: 'Home' },
    { path: '/bugs', icon: List, label: 'Bug' },
    { path: '/notifications', icon: Bell, label: 'Notifiche' },
    { path: '/profile', icon: User, label: 'Profilo' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center flex-1 h-full relative ${isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs mt-1">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

