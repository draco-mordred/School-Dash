"use client";

import type { ComponentType, SVGProps } from "react";
import { useState } from "react";

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

type SidebarIcon = ComponentType<SVGProps<SVGSVGElement>>;

const DashboardFallbackIcon = ({ className }: { className?: string }) => (
  <span className={cn("text-[1rem] leading-none", className)} aria-hidden="true">
    ⌂
  </span>
);

export function NavMainMini({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon?: SidebarIcon;
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
    <SidebarGroup className="px-1 py-1">
      <SidebarMenu className="space-y-0.5">
        {items.map((item) => {
          const hasSubItems = item.items && item.items.length > 0;
          const Icon = item.title === "Dashboard" ? DashboardFallbackIcon : (item.icon ?? DashboardFallbackIcon);

          return (
            <SidebarMenuItem key={item.title} className="px-0.5 py-0.5">
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
                        "h-9 w-9 flex items-center justify-center rounded-md transition-colors text-foreground",
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
                      <Icon className="h-4 w-4" />
                    </SidebarMenuButton>
                  </PopoverTrigger>

                  <PopoverContent
                    side="right"
                    align="start"
                    sideOffset={8}
                    className="w-48 border-border bg-background p-0 shadow-lg"
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
                            onClick={() => setOpenPopover(null)}
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
                      "h-9 w-9 flex items-center justify-center rounded-md transition-colors text-foreground",
                      "hover:bg-accent hover:text-accent-foreground"
                    )}
                    isActive={Boolean(item.isActive)}
                  >
                    <Icon className="h-4 w-4" />
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
