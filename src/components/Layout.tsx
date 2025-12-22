import { ReactNode } from 'react';
import { MobileNav } from './MobileNav';

interface LayoutProps {
  children: ReactNode;
  showNav?: boolean;
}

export function Layout({ children, showNav = true }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background pb-20">
      {children}
      {showNav && <MobileNav />}
    </div>
  );
}
