import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  FileText,
  Send,
  CreditCard,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Phone,
  Contact,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Contacts', href: '/contacts', icon: Contact },
  { name: 'Campaigns', href: '/campaigns', icon: Send },
  { name: 'Templates', href: '/templates', icon: FileText },
  { name: 'WhatsApp Numbers', href: '/whatsapp-numbers', icon: Phone },
  { name: 'Team', href: '/team', icon: Users },
];

const secondaryNavigation = [
  { name: 'Billing', href: '/billing', icon: CreditCard },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { user, organization, logout, hasRole } = useAuth();
  const isOwner = hasRole(['OWNER']);
  const visibleSecondaryNavigation = secondaryNavigation.filter((item) =>
    item.name === 'Billing' ? isOwner : true
  );

  const isActive = (href: string) => {
    const [path, queryString] = href.split('?');
    if (location.pathname !== path) return false;

    const currentParams = new URLSearchParams(location.search);

    if (queryString) {
      const targetParams = new URLSearchParams(queryString);
      return Array.from(targetParams.entries()).every(
        ([key, value]) => currentParams.get(key) === value
      );
    }

    return true;
  };

  const NavItem = ({ item }: { item: typeof navigation[0] }) => {
    const active = isActive(item.href);
    const content = (
      <Link
        to={item.href}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
          active
            ? 'bg-sidebar-primary text-sidebar-primary-foreground'
            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
        )}
      >
        <item.icon className="h-5 w-5 shrink-0" />
        {!collapsed && <span>{item.name}</span>}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.name}
          </TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
              <MessageSquare className="h-4 w-4 text-sidebar-primary-foreground" />
            </div>
            <span className="text-lg font-semibold text-sidebar-accent-foreground">
              SalesConnect
            </span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navigation.map((item) => (
          <NavItem key={item.name} item={item} />
        ))}
      </nav>

      {/* Secondary Navigation */}
      <div className="border-t border-sidebar-border p-3">
        {visibleSecondaryNavigation.map((item) => (
          <NavItem key={item.name} item={item} />
        ))}
      </div>

      {/* User Menu */}
      <div className="border-t border-sidebar-border p-3">
        <div
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2',
            collapsed ? 'justify-center' : ''
          )}
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.avatarUrl} />
            <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-xs">
              {user?.firstName?.[0]}
              {user?.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-sidebar-accent-foreground">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="truncate text-xs text-sidebar-foreground">
                {organization?.name}
              </p>
            </div>
          )}
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                className="h-8 w-8 shrink-0 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side={collapsed ? 'right' : 'top'}>Logout</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </aside>
  );
}
