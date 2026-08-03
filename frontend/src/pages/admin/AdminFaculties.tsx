import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash, ChevronDown, ChevronUp } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Search from "@/components/global/Search";
import CustomAlert from "@/components/global/CustomAlert";
import type { faculty, department } from "@/types";

const AdminFaculties = () => {
  const [faculties, setFaculties] = useState<faculty[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [expandedFaculties, setExpandedFaculties] = useState<Record<string, boolean>>({});
  const [facultyDepartments, setFacultyDepartments] = useState<Record<string, department[]>>({});
  const [loadingFacultyDepartments, setLoadingFacultyDepartments] = useState<Record<string, boolean>>({});
  const [activeFacultyForDepartment, setActiveFacultyForDepartment] = useState<string | null>(null);
  const [availableDepartments, setAvailableDepartments] = useState<department[]>([]);
  const [loadingAvailableDepartments, setLoadingAvailableDepartments] = useState(false);
  const [selectedExistingDepartment, setSelectedExistingDepartment] = useState("");
  const [departmentName, setDepartmentName] = useState("");
  const [departmentCode, setDepartmentCode] = useState("");
  const [departmentID, setDepartmentID] = useState("");
  const [departmentSaving, setDepartmentSaving] = useState(false);
  const [departmentAssigning, setDepartmentAssigning] = useState(false);
  const [deleteDepartmentId, setDeleteDepartmentId] = useState<string | null>(null);
  const [deleteDepartmentFacultyId, setDeleteDepartmentFacultyId] = useState<string | null>(null);
  const [isDepartmentDeleteOpen, setIsDepartmentDeleteOpen] = useState(false);
  const [isCreatingFaculty, setIsCreatingFaculty] = useState(false);
  const [facultyName, setFacultyName] = useState("");
  const [facultyCode, setFacultyCode] = useState("");
  const [facultyID, setFacultyID] = useState("");
  const [facultySaving, setFacultySaving] = useState(false);

  const fetchFaculties = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/courses/faculties");
      setFaculties(data.faculties ?? []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load faculties.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAvailableDepartments = useCallback(async () => {
    setLoadingAvailableDepartments(true);
    try {
      const { data } = await api.get("/courses/departments");
      setAvailableDepartments(data.departments ?? []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load available departments.");
    } finally {
      setLoadingAvailableDepartments(false);
    }
  }, []);

  useEffect(() => {
    void fetchFaculties();
    void fetchAvailableDepartments();
  }, [fetchFaculties, fetchAvailableDepartments]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const filteredFaculties = useMemo(() => {
    const query = debouncedSearch.toLowerCase();
    if (!query) return faculties;
    return faculties.filter((faculty) =>
      [faculty.name, faculty.code, faculty.facultyID].some((value) =>
        value.toLowerCase().includes(query)
      )
    );
  }, [faculties, debouncedSearch]);


  const fetchFacultyDepartments = useCallback(async (facultyId: string) => {
    setLoadingFacultyDepartments((prev) => ({ ...prev, [facultyId]: true }));
    try {
      const { data } = await api.get(`/courses/faculties/${facultyId}/departments`);
      setFacultyDepartments((prev) => ({ ...prev, [facultyId]: data.departments ?? [] }));
    } catch (error) {
      console.error(error);
      toast.error("Failed to load departments for faculty.");
    } finally {
      setLoadingFacultyDepartments((prev) => ({ ...prev, [facultyId]: false }));
    }
  }, []);

  const handleToggleFaculty = async (facultyId: string) => {
    setExpandedFaculties((prev) => {
      const next = !prev[facultyId];
      if (next && facultyDepartments[facultyId] === undefined) {
        void fetchFacultyDepartments(facultyId);
      }
      return { ...prev, [facultyId]: next };
    });
  };

  const openCreateDepartmentForm = (facultyId: string) => {
    setActiveFacultyForDepartment(facultyId);
    setSelectedExistingDepartment("");
    setDepartmentName("");
    setDepartmentCode("");
    setDepartmentID("");
  };

  const cancelCreateDepartmentForm = () => {
    setActiveFacultyForDepartment(null);
    setSelectedExistingDepartment("");
    setDepartmentName("");
    setDepartmentCode("");
    setDepartmentID("");
  };

  const handleAssignExistingDepartment = async () => {
    if (!activeFacultyForDepartment) {
      toast.error("Please select a faculty first.");
      return;
    }

    if (!selectedExistingDepartment) {
      toast.error("Please select an existing department to assign.");
      return;
    }

    setDepartmentAssigning(true);
    try {
      await api.patch(`/courses/departments/${selectedExistingDepartment}`, {
        facultyId: activeFacultyForDepartment,
      });
      toast.success("Department assigned to faculty successfully.");
      setSelectedExistingDepartment("");
      void fetchFacultyDepartments(activeFacultyForDepartment);
      void fetchAvailableDepartments();
    } catch (error: unknown) {
      console.error(error);
      const maybeResponse = error as { response?: { data?: { message?: string } } };
      toast.error(maybeResponse.response?.data?.message || "Failed to assign department.");
    } finally {
      setDepartmentAssigning(false);
    }
  };

  const openCreateFacultyForm = () => {
    setIsCreatingFaculty(true);
    setFacultyName("");
    setFacultyCode("");
    setFacultyID("");
  };

  const cancelCreateFacultyForm = () => {
    setIsCreatingFaculty(false);
    setFacultyName("");
    setFacultyCode("");
    setFacultyID("");
  };

  const handleSaveFaculty = async () => {
    if (!facultyName.trim() || !facultyCode.trim() || !facultyID.trim()) {
      toast.error("Faculty name, code, and faculty ID are required.");
      return;
    }

    setFacultySaving(true);
    try {
      await api.post("/courses/faculties", {
        name: facultyName.trim(),
        code: facultyCode.trim().toUpperCase(),
        facultyID: facultyID.trim(),
      });
      toast.success("Faculty created successfully.");
      cancelCreateFacultyForm();
      void fetchFaculties();
    } catch (error: unknown) {
      console.error(error);
      const maybeResponse = error as { response?: { data?: { message?: string } } };
      toast.error(maybeResponse.response?.data?.message || "Failed to create faculty.");
    } finally {
      setFacultySaving(false);
    }
  };

  const handleSaveDepartment = async () => {
    if (!activeFacultyForDepartment) {
      toast.error("Please select a faculty first.");
      return;
    }

    if (!departmentName.trim() || !departmentCode.trim() || !departmentID.trim()) {
      toast.error("Department name, code, and department ID are required.");
      return;
    }

    setDepartmentSaving(true);
    try {
      await api.post(`/courses/faculties/${activeFacultyForDepartment}/departments`, {
        name: departmentName.trim(),
        code: departmentCode.trim().toUpperCase(),
        departmentID: departmentID.trim(),
      });
      toast.success("Department created successfully.");
      cancelCreateDepartmentForm();
      void fetchFacultyDepartments(activeFacultyForDepartment);
    } catch (error: unknown) {
      console.error(error);
      const maybeResponse = error as { response?: { data?: { message?: string } } };
      toast.error(maybeResponse.response?.data?.message || "Failed to create department.");
    } finally {
      setDepartmentSaving(false);
    }
  };

  const handleDeleteDepartment = async () => {
    if (!deleteDepartmentId || !deleteDepartmentFacultyId) return;
    try {
      await api.delete(`/courses/faculties/${deleteDepartmentFacultyId}/departments/${deleteDepartmentId}`);
      toast.success("Department deleted successfully.");
      setDeleteDepartmentId(null);
      setDeleteDepartmentFacultyId(null);
      setIsDepartmentDeleteOpen(false);
      void fetchFacultyDepartments(deleteDepartmentFacultyId);
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete department.");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/courses/faculties/${deleteId}`);
      toast.success("Faculty deleted successfully.");
      setDeleteId(null);
      setIsDeleteOpen(false);
      void fetchFaculties();
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete faculty.");
    }
  };

  return (
    <div className="p-6 space-y-6" id="page-admin-faculties">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Faculties</h1>
          <p className="text-muted-foreground">Manage the faculty hierarchy and their departments.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Search search={search} setSearch={setSearch} title="Faculties" />
          <Button onClick={openCreateFacultyForm}>
            <Plus className="mr-2 h-4 w-4" /> Add Faculty
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex flex-col gap-2">
              <CardTitle className="text-card-foreground">Faculty Directory</CardTitle>
              <p className="text-sm text-slate-600 dark:text-slate-400">Create and manage faculties. Each faculty can contain multiple departments.</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isCreatingFaculty && (
              <div className="rounded-3xl border border-border bg-card p-4 space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="faculty-name">Faculty Name</Label>
                    <Input
                      id="faculty-name"
                      value={facultyName}
                      onChange={(event) => setFacultyName(event.target.value)}
                      placeholder="Faculty of Medicine"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="faculty-code">Faculty Code</Label>
                    <Input
                      id="faculty-code"
                      value={facultyCode}
                      onChange={(event) => setFacultyCode(event.target.value)}
                      placeholder="MED"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="faculty-id">Faculty ID</Label>
                    <Input
                      id="faculty-id"
                      value={facultyID}
                      onChange={(event) => setFacultyID(event.target.value)}
                      placeholder="FAC-2026-001"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleSaveFaculty} disabled={facultySaving}>
                    Create Faculty
                  </Button>
                  <Button variant="outline" onClick={cancelCreateFacultyForm} disabled={facultySaving}>
                    Cancel
                  </Button>
                </div>
                <div className="rounded-2xl border border-dashed border-border bg-muted p-4 text-sm text-slate-700 dark:text-slate-300">
                  <p className="font-semibold">Medical school faculty structure</p>
                  <p className="mt-2">A medical college is usually organized into these divisions. Add departments beneath the appropriate division after creating the faculty.</p>
                  <ul className="mt-3 space-y-2 list-disc pl-5">
                    <li>College/Faculty leadership</li>
                    <li>Basic Medical Sciences</li>
                    <li>Basic Clinical or Paraclinical Sciences</li>
                    <li>Clinical Sciences</li>
                  </ul>
                </div>
              </div>
            )}
            {loading ? (
              <div className="rounded-3xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
                Loading faculties…
              </div>
            ) : filteredFaculties.length === 0 ? (
              <div className="rounded-3xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
                No faculties found.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredFaculties.map((faculty) => {
                  const isOpen = expandedFaculties[faculty._id] ?? false;
                  const departments = facultyDepartments[faculty._id] ?? [];
                  const isDepartmentFormOpen = activeFacultyForDepartment === faculty._id;

                  return (
                    <div key={faculty._id} className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                        onClick={() => void handleToggleFaculty(faculty._id)}
                      >
                        <div>
                          <p className="text-lg font-semibold text-card-foreground">{faculty.name}</p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">{faculty.code} · {faculty.facultyID}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">{departments.length} departments</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isOpen ? <ChevronUp className="h-5 w-5 text-slate-600" /> : <ChevronDown className="h-5 w-5 text-slate-600" />}
                        </div>
                      </button>

                      {isOpen && (
                        <div className="border-t border-border bg-muted px-5 py-4">
                          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
                            <div>
                              <p className="text-sm font-semibold text-card-foreground">Departments</p>
                              <p className="text-sm text-slate-600 dark:text-slate-400">Manage departments in this faculty.</p>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => openCreateDepartmentForm(faculty._id)}>
                              <Plus className="mr-2 h-4 w-4" /> Add Department
                            </Button>
                          </div>

                          {isDepartmentFormOpen && (
                            <div className="mb-4 rounded-3xl border border-border bg-card p-4 space-y-4">
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label htmlFor="existing-department">Choose an existing department</Label>
                                  <select
                                    id="existing-department"
                                    value={selectedExistingDepartment}
                                    onChange={(event) => setSelectedExistingDepartment(event.target.value)}
                                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                                  >
                                    <option value="">Select a department to assign</option>
                                    {availableDepartments
                                      .filter((dept) => !facultyDepartments[faculty._id]?.some((assigned) => assigned._id === dept._id))
                                      .map((dept) => (
                                        <option key={dept._id} value={dept._id}>
                                          {dept.name} · {dept.code} · {dept.departmentID}
                                        </option>
                                      ))}
                                  </select>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    variant="secondary"
                                    onClick={handleAssignExistingDepartment}
                                    disabled={!selectedExistingDepartment || departmentAssigning}
                                  >
                                    {departmentAssigning ? "Assigning…" : "Assign Existing Department"}
                                  </Button>
                                  <Button variant="outline" onClick={cancelCreateDepartmentForm} disabled={departmentAssigning}>
                                    Close
                                  </Button>
                                </div>
                              </div>

                              <div className="border-t border-border pt-4">
                                <p className="text-sm font-semibold text-card-foreground">Create a new department</p>
                                <div className="grid gap-4 md:grid-cols-3 mt-3">
                                  <div className="space-y-2">
                                    <Label htmlFor="department-name">Department Name</Label>
                                    <Input
                                      id="department-name"
                                      value={departmentName}
                                      onChange={(event) => setDepartmentName(event.target.value)}
                                      placeholder="Department of Medicine"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="department-code">Department Code</Label>
                                    <Input
                                      id="department-code"
                                      value={departmentCode}
                                      onChange={(event) => setDepartmentCode(event.target.value)}
                                      placeholder="MED"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="department-id">Department ID</Label>
                                    <Input
                                      id="department-id"
                                      value={departmentID}
                                      onChange={(event) => setDepartmentID(event.target.value)}
                                      placeholder="MED-2026-001"
                                    />
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-4">
                                  <Button onClick={handleSaveDepartment} disabled={departmentSaving}>
                                    Create Department
                                  </Button>
                                  <Button variant="outline" onClick={cancelCreateDepartmentForm} disabled={departmentSaving}>
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}

                          {loadingFacultyDepartments[faculty._id] ? (
                            <div className="rounded-3xl border border-border bg-card p-4 text-sm text-muted-foreground">Loading departments…</div>
                          ) : departments.length === 0 ? (
                            <div className="rounded-3xl border border-border bg-card p-4 text-sm text-muted-foreground">
                              No departments found for this faculty.
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {departments.map((department) => (
                                <div key={department._id} className="flex flex-col gap-3 rounded-3xl border border-border bg-muted p-4 sm:flex-row sm:items-center sm:justify-between">
                                  <div>
                                    <p className="text-base font-semibold text-card-foreground">{department.name}</p>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">{department.code} · {department.departmentID}</p>
                                  </div>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => {
                                      setDeleteDepartmentId(department._id);
                                      setDeleteDepartmentFacultyId(faculty._id);
                                      setIsDepartmentDeleteOpen(true);
                                    }}
                                  >
                                    <Trash className="h-4 w-4" /> Remove
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      <CustomAlert
        handleDelete={handleDelete}
        isOpen={isDeleteOpen}
        setIsOpen={setIsDeleteOpen}
        title="Delete Faculty"
        description="Are you sure you want to delete this faculty? This action cannot be undone. Departments under this faculty will be unlinked." 
      />      <CustomAlert
        handleDelete={handleDeleteDepartment}
        isOpen={isDepartmentDeleteOpen}
        setIsOpen={setIsDepartmentDeleteOpen}
        title="Delete Department"
        description="Are you sure you want to delete this department from the faculty? This action cannot be undone."
      />    </div>
  );
};

export default AdminFaculties;
