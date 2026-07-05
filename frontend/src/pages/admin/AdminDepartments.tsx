import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { api } from "@/lib/api";
import { getEntityId } from "@/lib/getEntityId";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Plus, Trash, Upload, ChevronDown, ChevronUp } from "lucide-react";
import CustomAlert from "@/components/global/CustomAlert";
import Search from "@/components/global/Search";
import type { department } from "@/types";

type DepartmentUnitMeta = {
  id: string;
  name: string;
};

type DepartmentUnitsData = {
  id: string;
  name: string;
  postingType?: string;
  rotationDurationWeeks: number;
  currentUnit: string[];
  units: {
    active: Array<DepartmentUnitMeta | string>;
    reserve: Array<DepartmentUnitMeta | string>;
    history?: Array<DepartmentUnitMeta | string>;
  };
};

type DepartmentConstantsResponse = {
  departmentUnits: Record<string, DepartmentUnitsData>;
};

const normalizeUnitName = (unitEntry: DepartmentUnitMeta | string) =>
  typeof unitEntry === "string" ? unitEntry.trim() : unitEntry?.name?.trim() ?? "";

const DepartmentFormCard = ({
  isOpen,
  editingDepartment,
  name,
  code,
  departmentID,
  saving,
  onToggleOpen,
  onChangeName,
  onChangeCode,
  onChangeDepartmentID,
  onSave,
  onCancel,
}: {
  isOpen: boolean;
  editingDepartment: department | null;
  name: string;
  code: string;
  departmentID: string;
  saving: boolean;
  onToggleOpen: () => void;
  onChangeName: (value: string) => void;
  onChangeCode: (value: string) => void;
  onChangeDepartmentID: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) => (
  <Card className="order-1 lg:order-2 shadow-sm">
    <CardHeader className="cursor-pointer" onClick={onToggleOpen}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <CardTitle className="text-slate-900">
            {editingDepartment ? "Edit Department" : "Create Department"}
          </CardTitle>
          <CardDescription>
            {isOpen ? "Collapse form" : "Click to expand the department editor"}
          </CardDescription>
        </div>
        {isOpen ? <ChevronUp className="h-5 w-5 text-slate-600" /> : <ChevronDown className="h-5 w-5 text-slate-600" />}
      </div>
    </CardHeader>

    {isOpen && (
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="department-name">Name</Label>
          <Input
            id="department-name"
            value={name}
            onChange={(event) => onChangeName(event.target.value)}
            placeholder="Department of Medicine"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="department-code">Code</Label>
          <Input
            id="department-code"
            value={code}
            onChange={(event) => onChangeCode(event.target.value)}
            placeholder="MED"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="department-id">Department ID</Label>
          <Input
            id="department-id"
            value={departmentID}
            onChange={(event) => onChangeDepartmentID(event.target.value)}
            placeholder="MED-2026-001"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onSave} disabled={saving}>
            {editingDepartment ? "Save Changes" : "Create Department"}
          </Button>
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        </div>
        <div className="rounded-2xl border border-dashed border-border bg-muted p-4 text-sm text-muted-foreground">
          <p className="font-medium text-card-foreground">Bulk upload format</p>
          <p>Upload a CSV or spreadsheet with columns: <strong>Department Name</strong>, <strong>Department Code</strong>, <strong>Department ID</strong>.</p>
        </div>
      </CardContent>
    )}
  </Card>
);

export const DepartmentUnitsSection = ({ search }: { search: string }) => {
  const [departmentUnits, setDepartmentUnits] = useState<Record<string, DepartmentUnitsData>>({});
  const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>({});
  const [loadingUnits, setLoadingUnits] = useState(false);

  const fetchConstants = useCallback(async () => {
    setLoadingUnits(true);
    try {
      const { data } = await api.get<DepartmentConstantsResponse>("/courses/department-constants");
      const normalized = Object.values(data.departmentUnits ?? {}).reduce(
        (acc: Record<string, DepartmentUnitsData>, entry) => {
          if (entry?.id) {
            acc[String(entry.id).toUpperCase()] = entry;
          }
          return acc;
        },
        {}
      );
      setDepartmentUnits(normalized);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load department units.");
    } finally {
      setLoadingUnits(false);
    }
  }, []);

  useEffect(() => {
    void fetchConstants();
  }, [fetchConstants]);

  const visibleDepartments = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return Object.values(departmentUnits);
    return Object.values(departmentUnits).filter((dept) =>
      [dept.name, dept.id, dept.postingType ?? ""].some((value) =>
        String(value).toLowerCase().includes(query)
      )
    );
  }, [departmentUnits, search]);

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div>
          <CardTitle className="text-card-foreground">Units</CardTitle>
          <CardDescription className="text-muted-foreground">Unit metadata is loaded from department constants and grouped by department.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loadingUnits ? (
          <div className="rounded-3xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            Loading units…
          </div>
        ) : visibleDepartments.length === 0 ? (
          <div className="rounded-3xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            No unit metadata found.
          </div>
        ) : (
          <div className="space-y-4">
            {visibleDepartments.map((unitMeta) => {
              const isOpen = expandedUnits[unitMeta.id] ?? false;
              const activeUnits = unitMeta.units.active.map(normalizeUnitName).filter(Boolean);
              const reserveUnits = unitMeta.units.reserve.map(normalizeUnitName).filter(Boolean);

              return (
                <div key={unitMeta.id} className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition duration-200 hover:shadow-lg hover:scale-100 hover:-translate-y-1">
                  <button
                    type="button"
                    onClick={() => setExpandedUnits((prev) => ({ ...prev, [unitMeta.id]: !prev[unitMeta.id] }))}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  >
                    <div>
                      <p className="text-lg font-semibold text-card-foreground">{unitMeta.name}</p>
                      <p className="text-sm text-muted-foreground">{unitMeta.id} · {unitMeta.postingType ?? "Department"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-muted px-3 py-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        {activeUnits.length} active
                      </span>
                      {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-border bg-muted px-5 py-4">
                      <div className="mb-4 flex flex-wrap gap-3 text-sm text-muted-foreground">
                        <span className="rounded-full bg-card px-3 py-1 shadow-sm">Rotation {unitMeta.rotationDurationWeeks} weeks</span>
                        <span className="rounded-full bg-card px-3 py-1 shadow-sm">Active {activeUnits.length}</span>
                        <span className="rounded-full bg-card px-3 py-1 shadow-sm">Reserve {reserveUnits.length}</span>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-2xl border border-border bg-card p-4">
                          <p className="text-sm font-semibold text-card-foreground">Active units</p>
                          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                            {activeUnits.map((unit) => (
                              <li key={unit} className="rounded-lg bg-muted px-3 py-2">
                                {unit}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="rounded-2xl border border-border bg-card p-4">
                          <p className="text-sm font-semibold text-card-foreground">Reserve units</p>
                          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                            {reserveUnits.map((unit) => (
                              <li key={unit} className="rounded-lg bg-muted px-3 py-2">
                                {unit}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const AdminDepartments = () => {
  const [departments, setDepartments] = useState<department[]>([]);
  const [departmentUnitsByCode, setDepartmentUnitsByCode] = useState<Record<string, DepartmentUnitsData>>({});
  const [expandedDepartments, setExpandedDepartments] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<department | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [departmentID, setDepartmentID] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    try {
      const [deptResponse, constantsResponse] = await Promise.all([
        api.get("/courses/departments"),
        api.get<DepartmentConstantsResponse>("/courses/department-constants"),
      ]);

      setDepartments(deptResponse.data.departments ?? []);
      setDepartmentUnitsByCode(
        Object.values(constantsResponse.data.departmentUnits ?? {}).reduce(
          (acc: Record<string, DepartmentUnitsData>, entry) => {
            if (entry?.id) {
              acc[String(entry.id).toUpperCase()] = entry;
            }
            return acc;
          },
          {}
        )
      );
    } catch (error) {
      console.error(error);
      toast.error("Failed to load departments or unit metadata.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDepartments();
  }, [fetchDepartments]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const filteredDepartments = useMemo(() => {
    const query = debouncedSearch.toLowerCase();
    if (!query) return departments;
    return departments.filter((dept) =>
      [dept.name, dept.code, dept.departmentID].some((value) =>
        value.toLowerCase().includes(query)
      )
    );
  }, [departments, debouncedSearch]);

  const resetForm = () => {
    setIsEditing(false);
    setEditingDepartment(null);
    setName("");
    setCode("");
    setDepartmentID("");
  };

  const openCreateForm = () => {
    resetForm();
    setIsEditing(true);
  };

  const openEditForm = (department: department) => {
    setEditingDepartment(department);
    setName(department.name);
    setCode(department.code);
    setDepartmentID(department.departmentID);
    setIsEditing(true);
  };

  const handleSaveDepartment = async () => {
    if (!name.trim() || !code.trim() || !departmentID.trim()) {
      toast.error("Name, code, and department ID are required.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        departmentID: departmentID.trim(),
      };

      if (editingDepartment) {
        const id = getEntityId(editingDepartment);
        await api.patch(`/courses/departments/${id}`, payload);
        toast.success("Department updated successfully.");
      } else {
        await api.post("/courses/departments", payload);
        toast.success("Department created successfully.");
      }

      resetForm();
      void fetchDepartments();
    } catch (error: unknown) {
      console.error(error);
      const maybeResponse = error as { response?: { data?: { message?: string } } };
      toast.error(maybeResponse.response?.data?.message || "Failed to save department.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/courses/departments/${deleteId}`);
      toast.success("Department deleted successfully.");
      setDeleteId(null);
      setIsDeleteOpen(false);
      void fetchDepartments();
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete department.");
    }
  };

  const handleUploadFile = async (file: File) => {
    setUploading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

      const parsed = rows
        .map((row) => ({
          name: String(row["Department Name"] || row["name"] || row["department"] || "").trim(),
          code: String(row["Department Code"] || row["code"] || row["deptCode"] || "").trim().toUpperCase(),
          departmentID: String(
            row["Department ID"] || row["departmentID"] || row["departmentId"] || ""
          ).trim(),
        }))
        .filter((item) => item.name || item.code || item.departmentID);

      if (parsed.length === 0) {
        toast.error("No valid rows found in the uploaded file.");
        return;
      }

      const { data } = await api.post("/courses/departments/bulk-upload", { departments: parsed });
      const results = data.results ?? {};
      toast.success(
        `Bulk upload finished. Created ${results.created ?? 0}, updated ${results.updated ?? 0}, skipped ${results.skipped ?? 0}.`
      );
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      void fetchDepartments();
    } catch (error: unknown) {
      console.error(error);
      const maybeResponse = error as { response?: { data?: { message?: string } } };
      toast.error(maybeResponse.response?.data?.message || "Bulk upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await handleUploadFile(file);
  };

  return (
    <div className="p-6 space-y-6" id="page-admin-departments">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Departments & Units</h1>
          <p className="text-muted-foreground">Manage clinical departments and their units. View active and reserve units per department.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Search search={search} setSearch={setSearch} title="Departments" />
          <div className="flex flex-wrap gap-2">
            <Button onClick={openCreateForm}>
              <Plus className="mr-2 h-4 w-4" /> Add Department
            </Button>
            <label className="inline-flex items-center rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-slate-900 dark:text-slate-100 transition hover:bg-slate-100 dark:hover:bg-slate-900">
              <Upload className="mr-2 h-4 w-4" />
              <span>{uploading ? "Uploading…" : "Bulk Upload"}</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="sr-only"
                onChange={onFileChange}
                disabled={uploading}
              />
            </label>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card className="order-2 lg:order-1 shadow-sm">
          <CardHeader>
            <div className="flex flex-col gap-2">
              <CardTitle className="text-card-foreground">Departments</CardTitle>
              <p className="text-sm text-slate-600 dark:text-slate-400">Click a department card to expand its details and view active and reserve units.</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="rounded-3xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
                Loading departments…
              </div>
            ) : filteredDepartments.length === 0 ? (
              <div className="rounded-3xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
                No departments found.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredDepartments.map((department) => {
                  const unitMeta = departmentUnitsByCode[department.code.toUpperCase()];
                  const activeUnits = unitMeta
                    ? unitMeta.units.active.map(normalizeUnitName).filter(Boolean)
                    : [];
                  const reserveUnits = unitMeta
                    ? unitMeta.units.reserve.map(normalizeUnitName).filter(Boolean)
                    : [];
                  const isOpen = expandedDepartments[department._id] ?? false;

                  return (
                    <div key={department._id} className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition duration-200 hover:shadow-lg hover:scale-101 hover:-translate-y-1">
                      <button
                        type="button"
                        onClick={() => setExpandedDepartments((prev) => ({ ...prev, [department._id]: !prev[department._id] }))}
                        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                      >
                        <div>
                          <p className="text-lg font-semibold text-card-foreground">{department.name}</p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">{department.code} · {department.departmentID}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-muted px-3 py-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                            {activeUnits.length} units
                          </span>
                          {isOpen ? <ChevronUp className="h-4 w-4 text-slate-600" /> : <ChevronDown className="h-4 w-4 text-slate-600" />}
                        </div>
                      </button>

                      {isOpen && (
                        <div className="border-t border-border bg-muted px-5 py-4">
                          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-sm font-medium text-card-foreground">Department details</p>
                              <p className="text-sm text-slate-600 dark:text-slate-400">Use the buttons below to edit or delete.</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button variant="outline" size="sm" onClick={() => openEditForm(department)}>
                                <Pencil className="h-4 w-4" /> Edit
                              </Button>
                              <Button variant="destructive" size="sm" onClick={() => { setDeleteId(department._id); setIsDeleteOpen(true); }}>
                                <Trash className="h-4 w-4" /> Delete
                              </Button>
                            </div>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="rounded-2xl border border-border bg-card p-4">
                              <p className="text-sm font-semibold text-card-foreground">Active units</p>
                              {activeUnits.length > 0 ? (
                                <ul className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                                  {activeUnits.map((unit) => (
                                    <li key={unit} className="rounded-lg bg-muted px-3 py-2">
                                      {unit}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="mt-3 text-sm text-slate-500">No unit metadata available.</p>
                              )}
                            </div>
                            <div className="rounded-2xl border border-border bg-card p-4">
                              <p className="text-sm font-semibold text-card-foreground">Reserve units</p>
                              {reserveUnits.length > 0 ? (
                                <ul className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                                  {reserveUnits.map((unit) => (
                                    <li key={unit} className="rounded-lg bg-muted px-3 py-2">
                                      {unit}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="mt-3 text-sm text-slate-500">No reserve units defined.</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <DepartmentFormCard
          isOpen={isEditing}
          editingDepartment={editingDepartment}
          name={name}
          code={code}
          departmentID={departmentID}
          saving={saving}
          onToggleOpen={() => setIsEditing((prev) => !prev)}
          onChangeName={setName}
          onChangeCode={setCode}
          onChangeDepartmentID={setDepartmentID}
          onSave={handleSaveDepartment}
          onCancel={resetForm}
        />
      </div>

      <DepartmentUnitsSection search={search} />

      <CustomAlert
        handleDelete={handleDelete}
        isOpen={isDeleteOpen}
        setIsOpen={setIsDeleteOpen}
        title="Delete Department"
        description="Are you sure you want to delete this department? This action cannot be undone."
      />
    </div>
  );
};

export default AdminDepartments;
