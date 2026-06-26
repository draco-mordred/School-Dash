"use client";

import { useState } from "react";
import { useUserManagement } from "@/hooks/useUserManagement";
import { UserOverviewCards } from "@/components/admin/users/UserOverviewCards";
import { StudentsList } from "@/components/admin/users/StudentsList";
import { UsersList } from "@/components/admin/users/UsersList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function UsersPage() {
  const { data, loading, error } = useUserManagement();
  const [activeTab, setActiveTab] = useState("students");

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage all users including students, parents, staff, and administrators
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Overview Cards */}
      <UserOverviewCards stats={data.stats} loading={loading} />

      {/* Users Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="students" className="relative">
            Students
            <Badge variant="secondary" className="ml-2">
              {data.stats.students}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="parents" className="relative">
            Parents
            <Badge variant="secondary" className="ml-2">
              {data.stats.parents}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="staff" className="relative">
            Staff
            <Badge variant="secondary" className="ml-2">
              {data.stats.staff}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="admins" className="relative">
            Admins
            <Badge variant="secondary" className="ml-2">
              {data.stats.administrators}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* Students Tab */}
        <TabsContent value="students" className="space-y-4">
          <StudentsList students={data.students} loading={loading} />
        </TabsContent>

        {/* Parents Tab */}
        <TabsContent value="parents" className="space-y-4">
          <UsersList
            title="Parents Directory"
            users={data.parents}
            columns={[
              {
                key: "studentsCount",
                label: "Students",
                render: (user, value) => <span>{value}</span>,
              },
            ]}
            loading={loading}
            navigationPath="/admin/users/parents"
          />
        </TabsContent>

        {/* Staff Tab */}
        <TabsContent value="staff" className="space-y-4">
          <UsersList
            title="Staff Directory"
            users={data.staff}
            columns={[
              {
                key: "department",
                label: "Department",
                render: (user, value) => <span>{value}</span>,
              },
              {
                key: "roles",
                label: "Roles",
                render: (user, value) => (
                  <div className="flex flex-wrap gap-1">
                    {Array.isArray(value) && value.length > 0 ? (
                      value.map((role: string) => (
                        <Badge key={role} variant="outline" className="text-xs">
                          {role.replace(/_/g, " ")}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground text-sm">No roles assigned</span>
                    )}
                  </div>
                ),
              },
            ]}
            loading={loading}
            navigationPath="/admin/users/staff"
          />
        </TabsContent>

        {/* Administrators Tab */}
        <TabsContent value="admins" className="space-y-4">
          <UsersList
            title="Administrators Directory"
            users={data.administrators}
            columns={[
              {
                key: "role",
                label: "Role",
                render: (user, value) => <Badge variant="secondary">{value}</Badge>,
              },
            ]}
            loading={loading}
            navigationPath="/admin/users/admins"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
