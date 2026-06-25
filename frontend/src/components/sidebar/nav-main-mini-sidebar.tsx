"use client";

import { type LucideIcon } from "lucide-react";
import { useState, useCallback, useRef } from "react";

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export function NavMainMiniSidebar({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon?: LucideIcon;
    isActive?: boolean;
    items?: {
      title: string;
      url: string;
      isActive: boolean;
    }[];
  }[];
}) {
  const [openItem, setOpenItem] = useState<string | null>(null);

  const closeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimeout = () => {
    if (closeTimeout.current) {
      clearTimeout(closeTimeout.current as ReturnType<typeof setTimeout>);
      closeTimeout.current = null;
    }
  };

  const scheduleClose = (delay = 150) => {
    clearCloseTimeout();
    closeTimeout.current = setTimeout(() => setOpenItem(null), delay);
  };

  const handleOpenChange = useCallback((title: string, open: boolean) => {
    clearCloseTimeout();
    setOpenItem(open ? title : null);
  }, []);

  return (
    <SidebarGroup className="px-0 py-1">
      <SidebarMenu className="space-y-0.5 px-1">
        {items.map((item) => {
          const hasSubItems = item.items && item.items.length > 0;

          return (
            <SidebarMenuItem key={item.title}>
              {hasSubItems ? (
                <Popover
                  open={openItem === item.title}
                  onOpenChange={(open) => handleOpenChange(item.title, open)}
                >
                  <PopoverTrigger
                    asChild
                    onMouseEnter={() => {
                      clearCloseTimeout();
                      setOpenItem(item.title);
                    }}
                    onMouseLeave={() => scheduleClose()}
                  >
                    <SidebarMenuButton
                      tooltip={item.title}
                      className={cn(
                        "h-9 w-full flex items-center justify-center rounded-md transition-colors",
                        "hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      {item.icon && <item.icon className="h-5 w-5" />}
                    </SidebarMenuButton>
                  </PopoverTrigger>
                  <PopoverContent
                    side="right"
                    align="start"
                    sideOffset={8}
                    className="w-48 border-border bg-background p-0 shadow-lg"
                    onMouseEnter={() => {
                      clearCloseTimeout();
                      setOpenItem(item.title);
                    }}
                    onMouseLeave={() => scheduleClose()}
                  >
                    <div className="p-2">
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        {item.title}
                      </div>
                      <div className="space-y-0.5">
                        {item.items?.map((subItem) => (
                          <Link
                            key={subItem.title}
                            to={subItem.url}
                            onClick={() => {
                              clearCloseTimeout();
                              setOpenItem(null);
                            }}
                            className={cn(
                              "flex h-8 items-center rounded-md px-2 py-1.5 text-sm transition-colors",
                              "hover:bg-accent hover:text-accent-foreground",
                              subItem.isActive
                                ? "bg-primary text-primary-foreground font-medium"
                                : "text-foreground"
                            )}
                          >
                            {subItem.title}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              ) : (
                <Link to={item.url} className="block">
                  <SidebarMenuButton
                    tooltip={item.title}
                    className={cn(
                      "h-9 w-full flex items-center justify-center rounded-md transition-colors",
                      "hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    {item.icon && <item.icon className="h-5 w-5" />}
                  </SidebarMenuButton>
                </Link>
              )}
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
