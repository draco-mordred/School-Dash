import { useState } from "react";
import Search from "@/components/global/Search";
import { DepartmentUnitsSection } from "@/pages/admin/AdminDepartments";

const AdminUnits = () => {
  const [search, setSearch] = useState("");

  return (
    <div className="p-6 space-y-6" id="page-admin-units">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Units</h1>
          <p className="text-muted-foreground">Browse all clinical units and their metadata.</p>
        </div>
        <Search search={search} setSearch={setSearch} title="Search units" />
      </div>

      <DepartmentUnitsSection search={search} />
    </div>
  );
};

export default AdminUnits;
