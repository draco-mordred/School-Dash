"use client";

import { type LucideIcon } from "lucide-react";
import { useState } from "react";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Link } from "react-router";
import { cn } from "@/lib/utils";

export function NavMainMini({
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
  const [openPopover, setOpenPopover] = useState<string | null>(null);

  return (
    <SidebarGroup className="px-0">
      <SidebarGroupLabel className="px-2 sm:px-3 text-xs font-medium text-muted-foreground hidden sm:block">Platform</SidebarGroupLabel>
      <SidebarMenu className="px-0.5 sm:px-1">
        {items.map((item) => {
          const hasSubItems = item.items && item.items.length > 0;

          return (
            <SidebarMenuItem key={item.title} className="px-0.5 sm:px-1">
              {hasSubItems ? (
                <Popover
                  open={openPopover === item.title}
                  onOpenChange={(open) =>
                    setOpenPopover(open ? item.title : null)
                  }
                >
                  <PopoverTrigger asChild>
                    <SidebarMenuButton
                      tooltip={item.title}
                      className={cn(
                        "h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center rounded px-1 sm:px-1.5 transition-colors",
                        "hover:bg-accent hover:text-accent-foreground",
                        openPopover === item.title && "bg-accent text-accent-foreground"
                      )}
                      onClick={(e) => {
                        e.preventDefault();
                        setOpenPopover(
                          openPopover === item.title ? null : item.title
                        );
                      }}
                      isActive={Boolean(item.isActive)}
                    >
                      {item.icon && <item.icon className="h-5 w-5" />}
                      <span className="hidden">{item.title}</span>
                    </SidebarMenuButton>
                  </PopoverTrigger>

                  <PopoverContent
                    side="right"
                    align="start"
                    className="w-44 border-border bg-background p-0 shadow-lg"
                  >
                    <div className="space-y-1 p-2">
                      <div className="mb-2 px-2 py-1 text-xs font-semibold text-muted-foreground">
                        {item.title}
                      </div>
                      {item.items?.map((subItem) => (
                        <Link
                          key={subItem.title}
                          to={subItem.url}
                          onClick={() => setOpenPopover(null)}
                          className={cn(
                            "flex h-8 items-center rounded px-2.5 py-2 text-sm transition-colors",
                            "hover:bg-accent hover:text-accent-foreground",
                            subItem.isActive
                              ? "bg-primary text-primary-foreground font-medium"
                              : "text-foreground hover:text-foreground"
                          )}
                        >
                          {subItem.title}
                        </Link>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              ) : (
                <Link to={item.url} className="block">
                  <SidebarMenuButton
                    tooltip={item.title}
                    className={cn(
                      "h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center rounded px-1 sm:px-1.5 transition-colors",
                      "hover:bg-accent hover:text-accent-foreground"
                    )}
                    isActive={Boolean(item.isActive)}
                  >
                    {item.icon && <item.icon className="h-5 w-5" />}
                    <span className="hidden">{item.title}</span>
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
