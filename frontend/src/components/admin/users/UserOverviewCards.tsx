"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, User, UserCheck, ShieldAlert } from "lucide-react";
import { Loader2 } from "lucide-react";

export interface UserStats {
  students: number;
  parents: number;
  staff: number;
  administrators: number;
}

interface UserOverviewCardsProps {
  stats: UserStats;
  loading?: boolean;
}

export function UserOverviewCards({ stats, loading = false }: UserOverviewCardsProps) {
  const cards = [
    {
      title: "Students",
      value: stats.students,
      icon: Users,
      color: "bg-blue-100",
      textColor: "text-blue-600",
      borderColor: "border-blue-200",
    },
    {
      title: "Parents",
      value: stats.parents,
      icon: User,
      color: "bg-purple-100",
      textColor: "text-purple-600",
      borderColor: "border-purple-200",
    },
    {
      title: "Staff",
      value: stats.staff,
      icon: UserCheck,
      color: "bg-green-100",
      textColor: "text-green-600",
      borderColor: "border-green-200",
    },
    {
      title: "Administrators",
      value: stats.administrators,
      icon: ShieldAlert,
      color: "bg-amber-100",
      textColor: "text-amber-600",
      borderColor: "border-amber-200",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title} className={`border-2 ${card.borderColor}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <div className={`${card.color} p-2 rounded-lg`}>
                <Icon className={`h-4 w-4 ${card.textColor}`} />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-2">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats[card.title.toLowerCase() as keyof UserStats]}</div>
                  <p className="text-xs text-muted-foreground">Total {card.title.toLowerCase()}</p>
                </>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
