"use client";

import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  Clock,
  CreditCard,
  FileText,
  GripVertical,
  History,
  LayoutDashboard,
  Menu,
  Moon,
  PanelLeft,
  PanelLeftClose,
  Search,
  Send,
  Settings,
  Store,
  Sun,
  Users,
  X
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  children?: NavItem[];
}

interface NavCategory {
  label?: string;
  items: NavItem[];
}

const navCategories: NavCategory[] = [
  {
    label: "Messaging",
    items: [
      {
        title: "Dashboard",
        href: "/",
        icon: LayoutDashboard,
      },
      {
        title: "Compose",
        href: "/compose",
        icon: Send,
      },
      {
        title: "Templates",
        href: "/template",
        icon: FileText,
      },
    ],
  },
  {
    label: "Activity",
    items: [
      {
        title: "History",
        href: "/history",
        icon: History,
      },
      {
        title: "Schedule Messages",
        href: "/schedule-messages",
        icon: Clock,
      },
    ],
  },
  {
    label: "Platform",
    items: [
      {
        title: "Contact Collection",
        href: "/contact-collection",
        icon: Users,
      },
      {
        title: "Top Up",
        href: "/topup",
        icon: CreditCard,
      },
      {
        title: "Marketplace",
        href: "/marketplace",
        icon: Store,
      },
      {
        title: "Settings",
        href: "/database",
        icon: Settings,
        children: [
          {
            title: "Settings",
            href: "/settings",
            icon: Settings,
          },
          {
            title: "API Keys",
            href: "/developer",
            icon: Store,
          },
        ],
      },
    ],
  },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [expandedItems, setExpandedItems] = React.useState<string[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [sidebarWidth, setSidebarWidth] = React.useState(256);
  const [isResizing, setIsResizing] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const sidebarRef = React.useRef<HTMLDivElement>(null);

  const toggleExpanded = (title: string) => {
    setExpandedItems((prev) =>
      prev.includes(title)
        ? prev.filter((item) => item !== title)
        : [...prev, title]
    );
  };

  const startResizing = React.useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = React.useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = React.useCallback(
    (mouseMoveEvent: MouseEvent) => {
      if (isResizing && sidebarRef.current) {
        const newWidth =
          mouseMoveEvent.clientX -
          sidebarRef.current.getBoundingClientRect().left;
        if (newWidth >= 200 && newWidth <= 480) {
          setSidebarWidth(newWidth);
        }
      }
    },
    [isResizing]
  );

  React.useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", resize);
      window.addEventListener("mouseup", stopResizing);
      return () => {
        window.removeEventListener("mousemove", resize);
        window.removeEventListener("mouseup", stopResizing);
      };
    }
  }, [isResizing, resize, stopResizing]);

  React.useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const filteredNavCategories = React.useMemo(() => {
    if (!searchQuery) return navCategories;

    const query = searchQuery.toLowerCase();
    return navCategories
      .map((category) => ({
        ...category,
        items: category.items.filter((item) => {
          const matchesParent = item.title.toLowerCase().includes(query);
          const matchesChild = item.children?.some((child) =>
            child.title.toLowerCase().includes(query)
          );
          return matchesParent || matchesChild;
        }),
      }))
      .filter((category) => category.items.length > 0);
  }, [searchQuery]);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="fixed left-4 top-4 z-50 lg:hidden"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <Menu className="h-5 w-5" />
        )}
      </Button>

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside
        ref={sidebarRef}
        style={{ width: isCollapsed ? "64px" : `${sidebarWidth}px` }}
        className={cn(
          "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 lg:static lg:translate-x-0",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
          {!isCollapsed && (
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
                <span className="text-base font-bold text-primary-foreground">
                  L
                </span>
              </div>
              <span className="text-sm font-semibold tracking-tight text-sidebar-primary">
                Lucosms
              </span>
            </Link>
          )}
          {isCollapsed && (
            <div className="flex h-7 w-7 items-center justify-center bg-primary">
              {/* <span className="text-base font-bold text-primary-foreground">L</span> */}
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="hidden h-7 w-7 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground lg:flex"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        </div>

        {!isCollapsed && (
          <div className="border-b border-sidebar-border px-3 py-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-sidebar-foreground/40" />
              <Input
                type="search"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="shadow-none h-10 w-full border-sidebar-border/50 bg-sidebar-accent/10 pl-8 text-xs text-sidebar-accent-foreground placeholder:text-sidebar-foreground/40 focus-visible:bg-sidebar-accent/50 focus-visible:ring-1 focus-visible:ring-sidebar-ring/50"
              />
              <kbd className="pointer-events-none absolute right-2 top-1/2 hidden h-4 -translate-y-1/2 select-none items-center gap-0.5 rounded border border-sidebar-border/50 bg-sidebar-accent/50 px-1 font-mono text-[9px] font-medium text-sidebar-foreground/50 sm:flex">
                ⌘K
              </kbd>
            </div>
          </div>
        )}

        <TooltipProvider delayDuration={0}>
          <nav className="flex-1 overflow-y-auto px-2 py-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-sidebar-border hover:scrollbar-thumb-sidebar-foreground/20">
            {filteredNavCategories.map((category, categoryIndex) => (
              <div key={category.label || categoryIndex}>
                {!isCollapsed && category.label && (
                  <div className="mb-2 mt-4 first:mt-0 px-2.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                      {category.label}
                    </span>
                  </div>
                )}
                <ul className="space-y-0.5">
                  {category.items.map((item) => (
                    <li key={item.title}>
                      {item.children ? (
                        <div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => toggleExpanded(item.title)}
                                className={cn(
                                  "flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium transition-all duration-150",
                                  "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                                  expandedItems.includes(item.title) &&
                                    "bg-sidebar-accent/50 text-sidebar-accent-foreground"
                                )}
                              >
                                <div className="flex items-center gap-2.5">
                                  <item.icon className="h-4 w-4 flex-shrink-0" />
                                  {!isCollapsed && <span>{item.title}</span>}
                                </div>
                                {!isCollapsed && (
                                  <ChevronRight
                                    className={cn(
                                      "h-3.5 w-3.5 transition-transform duration-150",
                                      expandedItems.includes(item.title) &&
                                        "rotate-90"
                                    )}
                                  />
                                )}
                              </button>
                            </TooltipTrigger>
                            {isCollapsed && (
                              <TooltipContent
                                side="right"
                                className="font-medium text-xs"
                              >
                                <p>{item.title}</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                          {!isCollapsed &&
                            expandedItems.includes(item.title) && (
                              <ul className="ml-3 mt-0.5 space-y-0.5 border-l border-sidebar-border/40 pl-3 py-1">
                                {item.children.map((child) => (
                                  <li key={child.title}>
                                    <Link
                                      href={child.href}
                                      className={cn(
                                        "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs transition-all duration-150",
                                        pathname === child.href
                                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                                      )}
                                    >
                                      <child.icon className="h-3.5 w-3.5" />
                                      <span>{child.title}</span>
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            )}
                        </div>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link
                              href={item.href}
                              className={cn(
                                "flex items-center gap-2.5 rounded px-2.5 py-2.5 text-xs font-medium transition-all duration-150",
                                pathname === item.href
                                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                              )}
                            >
                              <item.icon className="h-4 w-4 flex-shrink-0" />
                              {!isCollapsed && <span>{item.title}</span>}
                              {!isCollapsed && item.badge && (
                                <span className="ml-auto rounded-full bg-primary p-5 text-[9px] font-semibold text-primary-foreground">
                                  {item.badge}
                                </span>
                              )}
                            </Link>
                          </TooltipTrigger>
                          {isCollapsed && (
                            <TooltipContent
                              side="right"
                              className="font-medium text-xs"
                            >
                              <p>{item.title}</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      )}
                    </li>
                  ))}
                </ul>
                {!isCollapsed &&
                  categoryIndex < filteredNavCategories.length - 1 && (
                    <Separator className="my-3 bg-sidebar-border/50" />
                  )}
              </div>
            ))}
          </nav>
        </TooltipProvider>

        <div className="border-t border-sidebar-border px-2 py-2">
          <TooltipProvider delayDuration={0}>
            <div className="space-y-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full gap-2.5 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-150 h-8",
                      isCollapsed ? "justify-center px-0" : "justify-start"
                    )}
                    size="sm"
                    onClick={toggleTheme}
                  >
                    {theme === "dark" ? (
                      <Sun className="h-4 w-4" />
                    ) : (
                      <Moon className="h-4 w-4" />
                      
                    )}
                    {!isCollapsed && <span className="text-xs">Theme</span>}
                  </Button>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right" className="font-medium text-xs">
                    <p>Toggle theme</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>

        {!isCollapsed && (
          <div
            className="absolute right-0 top-0 hidden h-full w-1 cursor-col-resize hover:bg-primary/10 lg:block"
            onMouseDown={startResizing}
          >
            <div className="absolute right-0 top-1/2 flex h-10 w-3 -translate-y-1/2 items-center justify-center rounded-l-sm bg-sidebar-border/30 opacity-0 transition-opacity hover:opacity-100">
              <GripVertical className="h-3.5 w-3.5 text-sidebar-foreground/40" />
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
