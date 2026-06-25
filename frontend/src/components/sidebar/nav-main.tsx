"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export function NavMain({
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
  return (
    <SidebarGroup className="px-0">
      <SidebarGroupLabel className="px-2 sm:px-3 md:px-4 text-xs font-medium text-muted-foreground">Platform</SidebarGroupLabel>
      <SidebarMenu className="px-1 sm:px-1.5 md:px-2">
        {items.map((item) => {
          const hasSubItems = item.items && item.items.length > 0;

          return (
            <SidebarMenuItem key={item.title}>
              {hasSubItems ? (
                <Collapsible asChild defaultOpen={item.isActive} className="group/collapsible">
                  <div>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        tooltip={item.title}
                        className={cn(
                          "h-8 rounded transition-colors",
                          "hover:bg-accent hover:text-accent-foreground"
                        )}
                      >
                        {item.icon && <item.icon className="h-5 w-5" />}
                        <span className="text-sm">{item.title}</span>
                        <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.items?.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton
                              asChild
                              className={cn(
                                "h-8 rounded text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                                subItem.isActive && "bg-primary text-primary-foreground font-medium"
                              )}
                            >
                              <Link to={subItem.url}>
                                <span>{subItem.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ) : (
                <Link to={item.url} className="block">
                  <SidebarMenuButton
                    tooltip={item.title}
                    className={cn(
                      "h-8 rounded transition-colors",
                      "hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    {item.icon && <item.icon className="h-5 w-5" />}
                    <span className="text-sm">{item.title}</span>
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