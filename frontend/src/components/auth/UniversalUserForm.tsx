import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
 
import {
  type Class,
  type UserRole,
  type pagination,
  type courses,
  type department,
  type user,
} from "@/types";
import { FieldGroup } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { CustomInput } from "@/components/global/CustomInput";
import { api } from "@/lib/api";
import { CustomSelect } from "@/components/global/CustomSelect";
import { CustomMultiSelect } from "@/components/global/CustomMultiSelect";

export type FormType = "login" | "create" | "update";
interface Props {
  type: FormType;
  initialData?: user | null;
  onSuccess?: () => void;
  role?: UserRole;
  singleColumn?: boolean;
}

const createSchema = (type: FormType) => {
  return z
    .object({
      name:
        type === "login"
          ? z.string().optional()
          : z.string().min(2, "Name is required"),
      classId: z.string().optional(),
      subjectIds: z.array(z.string()).optional(),
      email: z.email("Invalid email address"),
      role: z.string().optional(),
      academicStatus: z.string().optional(),
      departmentRole: z.string().optional(),
      departmentId: z.string().optional(),
      password:
        type === "update"
          ? z
              .string()
              .optional()
              .refine((val) => !val || val.length >= 6, {
                message: "Password must be at least 6 characters",
              })
          : z.string().min(6, "Password must be at least 6 characters"),
      confirmPassword:
        type === "create"
          ? z.string().min(8, {
              message: "Password must be at least 8 characters.",
            })
          : z.string().optional(),
    })
    .superRefine((data, ctx) => {
      if (type === "create" && data.password !== data.confirmPassword) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Passwords don't match",
          path: ["confirmPassword"],
        });
      }
    });
};

type FormValues = z.infer<ReturnType<typeof createSchema>>;

const UniversalUserForm = ({ type, initialData, onSuccess, role, singleColumn }: Props) => {
  const isUpdate = type === "update";
  const isLogin = type === "login"; 
  const { user, setUser } = useAuth();

  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [departments, setDepartments] = useState<department[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);
  const [subjects, setSubjects] = useState<courses[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(createSchema(type)),
    defaultValues: {
      name: "",
      email: "",
      role: role,
      password: "",
      classId: undefined,
      subjectIds: [],
      academicStatus: undefined,
      departmentRole: undefined,
      departmentId: undefined,
    },
  });

  // fetch classes
  useEffect(() => {
    const fetchClasses = async () => {
      if (isLogin) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const { data } = (await api.get("/classes")) as {
          data: { classes: Class[]; pagination: pagination };
        };
        setClasses(data.classes);
      } catch (error) {
        if (!isLogin) {
          toast.error("Failed to load Classes");
          console.log(error);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchClasses();
  }, [type, isLogin]);

  // Fetch subjects
  useEffect(() => {
    const fetchSubjects = async () => {
      if (isLogin) {
        setLoadingOptions(false);
        return;
      }
      try {
        setLoadingOptions(true);
        const { data } = (await api.get("/courses")) as {
          data: { courses: courses[]; pagination: pagination };
        };
        setSubjects(data.courses);
      } catch (error) {
        if (!isLogin) {
          toast.error("Failed to load subjects");
          console.log(error);
        }
      } finally {
        setLoadingOptions(false);
      }
    };
    fetchSubjects();
  }, [type, isLogin]);

  // Fetch departments for staff assignment
  useEffect(() => {
    const fetchDepartments = async () => {
      if (isLogin) {
        setDepartmentsLoading(false);
        return;
      }
      try {
        setDepartmentsLoading(true);
        const { data } = await api.get("/courses/departments");
        setDepartments(data.departments ?? []);
      } catch (error) {
        if (!isLogin) {
          toast.error("Failed to load departments");
          console.log(error);
        }
      } finally {
        setDepartmentsLoading(false);
      }
    };
    fetchDepartments();
  }, [type, isLogin]);

  // Populate form for Update mode
  useEffect(() => {
    if (initialData && isUpdate) {
      const initialDataWithDept = initialData as user & { departmentId?: string };
      const existingClassId =
        typeof initialData.studentClasses === "object" 
          ? initialData.studentClasses?._id
          : initialData.studentClasses ||
            (typeof initialData.studentClass === "object"
              ? initialData.studentClass?._id
              : initialData.studentClass);

      const subjectIds = Array.isArray(initialData.teacherSubject)
        ? initialData.teacherSubject.map((subject) =>
            typeof subject === "object" ? subject._id : subject
          )
        : Array.isArray(initialData.teacherSubjects)
        ? initialData.teacherSubjects.map((subject) => subject._id)
        : [];

      form.reset({
        name: initialData.name || "",
        email: initialData.email || "",
        role: initialData.role || "student",
        password: "",
        classId: existingClassId || "",
        subjectIds,
        academicStatus: initialData.academicStatus || undefined,
        departmentRole: initialData.departmentRole || undefined,
        departmentId: initialDataWithDept.departmentId || "",
      });
    }
  }, [isUpdate, initialData, form, classes]);

  async function onSubmit(data: FormValues) {
    try {
      // console.log(data);
      const { classId, subjectIds, departmentId, ...formData } = data;
      const payload = {
        ...formData,
        studentClasses: classId || undefined,
        teacherSubject: subjectIds || [],
        parentStudents: [],
        role: data.role || role,
        academicStatus: data.academicStatus || null,
        departmentRole: data.departmentRole || null,
        departmentId: departmentId || undefined,
      };
      if (isLogin) {
        const response = await api.post("/users/login", {
          email: data.email,
          password: data.password,
        });
        const responseData = response.data;
        if (responseData.token) {
          localStorage.setItem("token", responseData.token);
        }
        setUser(responseData.user ?? responseData);
        const displayName = responseData.user?.name ?? responseData.name ?? "";
        toast.success(`Welcome ${displayName}`);
        if (onSuccess) {
          onSuccess();
        } else {
          window.location.assign("/dashboard");
        }
      } else if (type === "create") {
        await api.post("/users/register", payload);
        toast.success("Account created successfully!");
        if (onSuccess) onSuccess();
      } else if (type === "update" && initialData) {
        const userRecord = initialData as user & { _id?: string; id?: string };
        const userId = userRecord._id || userRecord.id;
        if (!userId) {
          throw new Error("Missing user id for update");
        }
        await api.patch(`/users/update/${userId}`, payload);
        toast.success("User updated successfully");
        if (onSuccess) onSuccess();
      }
    } catch (error) {
      console.log(error);
      toast.error("An error occurred. Please try again.");
    }
  }

  const classOptions = Array.isArray(classes)
    ? classes.map((c) => ({
        label: c.name,
        value: c._id,
      }))
    : [];
  const subjectOptions = Array.isArray(subjects)
    ? subjects.map((s) => ({ label: s.name, value: s._id }))
    : [];

  const departmentOptions = Array.isArray(departments)
    ? departments.map((dept) => ({
        label: `${dept.name} (${dept.departmentID})`,
        value: dept._id,
      }))
    : [];

  const roleDisplayMap: Record<string, string> = {
    admin: "Admin",
    teacher: "Teacher",
    student: "Student",
    parent: "Parent",
    unitconsultant: "Unit Consultant",
    unitresident: "Unit Resident",
  };

  const allRoles = ["admin", "teacher", "student", "parent", "unitconsultant", "unitresident"] as const;
  const roleOptions = (() => {
    if (isUpdate && user?.role === "admin") {
      return allRoles.map((r) => ({ label: roleDisplayMap[r] ?? r, value: r }));
    }
    if (role) return [{ label: roleDisplayMap[role] ?? role, value: role }];
    return [];
  })();

  const pending = form.formState.isSubmitting;
  const userRole = role ?? form.watch("role");
  const showRoleSelector = !isLogin;
  const showClassSelector = !isLogin && userRole === "student";
  const showSubjectSelector = !isLogin && userRole === "teacher";
  const showTeacherFields = !isLogin && userRole === "teacher";
  const showStaffDepartment = !isLogin && ["teacher", "unitconsultant", "unitresident"].includes(userRole || "");

  const gridCols = singleColumn ? "grid-cols-1" : "grid-cols-2";

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup>
        <div className={`grid ${gridCols} gap-4 w-full`}>
          {!isLogin && (
            <CustomInput
              control={form.control}
              name="name"
              label="Full Name"
              placeholder="Jane Doe"
              disabled={pending}
            />
          )}
          {/* role selector */}
          {showRoleSelector && (
            <CustomSelect
              control={form.control}
              name="role"
              label="Role"
              placeholder="Select role"
              options={roleOptions}
              disabled={pending}
            />
          )}
          <div className="col-span-2 space-y-2">
            {/* class */}
            {showClassSelector && (
              <CustomSelect
                control={form.control}
                name="classId"
                label="Class"
                placeholder="Select Class"
                options={classOptions}
                disabled={pending}
                loading={loading}
              />
            )}
            {/* subjects(multiple select is need here) */}
            {showSubjectSelector && (
              <CustomMultiSelect
                control={form.control}
                name="subjectIds"
                label="Subjects"
                placeholder="Select subjects..."
                options={subjectOptions}
                loading={loadingOptions}
                disabled={pending}
              />
            )}
            {/* academic status */}
            {showTeacherFields && (
              <CustomSelect
                control={form.control}
                name="academicStatus"
                label="Academic Status"
                placeholder="Select academic status"
                options={[
                  { label: "Professor", value: "professor" },
                  { label: "Associate Professor", value: "associate professor" },
                  { label: "Lecturer I", value: "lecturer i" },
                  { label: "Lecturer II", value: "lecturer ii" },
                  { label: "Assistant Lecturer", value: "assistant lecturer" },
                  { label: "Resident", value: "resident" },
                ]}
                disabled={pending}
              />
            )}
            {/* department role */}
            {showTeacherFields && (
              <CustomSelect
                control={form.control}
                name="departmentRole"
                label="Department Role"
                placeholder="Select department role"
                options={[
                  { label: "Head of Department", value: "head of department" },
                  { label: "Dean of Faculty", value: "dean of faculty" },
                  { label: "Exam Officer", value: "exam officer" },
                ]}
                disabled={pending}
              />
            )}
            {/* department selector for staff */}
            {showStaffDepartment && (
              <CustomSelect
                control={form.control}
                name="departmentId"
                label="Department"
                placeholder="Select department"
                options={departmentOptions}
                disabled={pending}
                loading={departmentsLoading}
              />
            )}
            <CustomInput
              control={form.control}
              name="email"
              label="Email Address"
              type="email"
              placeholder="m@example.com"
              className={isLogin ? "rounded-full h-12 px-4" : undefined}
              disabled={pending}
            />
          </div>
          <div className="col-span-2">
            <CustomInput
              control={form.control}
              name="password"
              label="Password"
              type="password"
              placeholder={isUpdate ? "New Password (Optional)" : "Password"}
              className={isLogin ? "rounded-full h-12 px-4" : undefined}
              disabled={pending}
            />
          </div>
          {type === "create" && (
            <div className="col-span-2">
              <CustomInput
                control={form.control}
                name="confirmPassword"
                label="Confirm Password"
                type="password"
                placeholder={"Confirm Password"}
                disabled={pending}
              />
            </div>
          )}
          <div className="col-span-2 mt-2">
            <Button type="submit" className="w-full" disabled={pending}>
              {pending
                ? "Processing..."
                : type === "login"
                ? "Sign In"
                : type === "create"
                ? "Create Account"
                : "Save Changes"}
            </Button>
          </div>
        </div>
      </FieldGroup>
    </form>
  );
};

export default UniversalUserForm;
