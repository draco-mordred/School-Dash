import { useEffect, useState } from "react";
import { useForm, type Resolver, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { getEntityId } from "@/lib/getEntityId";
import { classFormSchema, type ClassFormValues } from "./schema";

// UI Imports
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import type { Class } from "@/types";
import { CustomInput } from "@/components/global/CustomInput";
import { CustomSelect } from "@/components/global/CustomSelect";
import { CustomMultiSelect } from "@/components/global/CustomMultiSelect";
import Modal from "@/components/global/Modal";

interface Option {
  _id: string;
  name: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData: Class | null;
  onSuccess: () => void;
}
const ClassForm = ({ open, onOpenChange, initialData, onSuccess }: Props) => {
  const [teachers, setTeachers] = useState<Option[]>([]);
  const [years, setYears] = useState<Option[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [subjects, setSubjects] = useState<Option[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [students, setStudents] = useState<Option[]>([]);

  // fetch teachers and years
  useEffect(() => {
    if (open) {
      const fetchData = async () => {
        setLoadingOptions(true);
        try {
          const [teachersRes, yearsRes] = await Promise.all([
            api.get("/users?role=teacher"),
            api.get("/academic-years"),
          ]);
          setTeachers(teachersRes.data.users);
          setYears(yearsRes.data.years);
        } catch (error) {
          console.error(error);
          toast.error("Failed to load options");
        } finally {
          setLoadingOptions(false);
        }
      };
      fetchData();
    }
  }, [open]);

  //   fetch subjects
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        setLoadingSubjects(true);
        const { data } = await api.get("/courses");
        setSubjects(data.courses);
        setLoadingSubjects(false);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load Courses");
      } finally {
        setLoadingSubjects(false);
      }
    };
    fetchSubjects();
  }, []);

  // fetch students
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoadingStudents(true);
        const { data } = await api.get("/users?role=student&page=1&limit=500");
        setStudents(data.users ?? []);
      } catch {
        toast.error("Failed to load students");
      } finally {
        setLoadingStudents(false);
      }
    };
    if (open) fetchStudents();
  }, [open]);

  //   form
  const form = useForm<ClassFormValues>({
    resolver: zodResolver(classFormSchema) as Resolver<ClassFormValues>,
    defaultValues: {
      name: "",
      capacity: 40,
      academicYear: "",
      classTeacher: "",
      subjectIds: [],
      studentIds: [],
    },
  });

  type ReferenceItem = { _id: string } | string;

  const getReferenceId = (item: ReferenceItem) =>
    typeof item === "string" ? item : item._id;

  const getSubjectIdsFromClass = (
    classData: Class | null | undefined,
  ): string[] => {
    if (!classData || typeof classData !== "object") return [];

    const fromSubjects = Array.isArray(classData.subjects)
      ? classData.subjects
          .map((subject) => subject?._id)
          .filter((id): id is string => Boolean(id))
      : [];

    const courseItems = Array.isArray(
      (classData as Partial<{ courses: ReferenceItem[] }>).courses,
    )
      ? (classData as Partial<{ courses: ReferenceItem[] }>).courses ?? []
      : [];

    const fromCourses = (courseItems ?? [])
      .map(getReferenceId)
      .filter((id): id is string => Boolean(id));

    return [...fromSubjects, ...fromCourses];
  };

  const getStudentIdsFromClass = (
    classData: Class | null | undefined,
  ): string[] => {
    if (!classData || typeof classData !== "object") return [];
    const studentItems = Array.isArray(
      (classData as Partial<{ students: ReferenceItem[] }>).students,
    )
      ? (classData as Partial<{ students: ReferenceItem[] }>).students ?? []
      : [];
    return studentItems.map(getReferenceId).filter((id): id is string => Boolean(id));
  };

  //  Populate Form on Edit
  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        capacity: initialData.capacity,
        academicYear: initialData.academicYear?._id || "",
        classTeacher: initialData.classTeacher?._id || "",
        subjectIds: getSubjectIdsFromClass(initialData),
        studentIds: getStudentIdsFromClass(initialData),
      });
    } else {
      form.reset({
        name: "",
        capacity: 40,
        academicYear: "",
        classTeacher: "",
        subjectIds: [],
        studentIds: [],
      });
    }
  }, [initialData, form, open]);

  const onSubmit = async (data: ClassFormValues) => {
    try {
      const payload = {
        ...data,
        classTeacher:
          data.classTeacher === "unassigned" || data.classTeacher === ""
            ? null
            : data.classTeacher,
        courses: data.subjectIds,
        students: data.studentIds,
      };
      if (initialData) {
        const id = getEntityId(initialData);
        await api.patch(`/classes/update/${id}`, payload);
        toast.success("Class updated successfully");
      } else {
        await api.post("/classes/create", payload);
        toast.success("Class created successfully");
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.log(error);
      toast.error("Failed to save class");
    }
  };

  const pending = form.formState.isSubmitting;

  const yearOptions = (Array.isArray(years) ? years : []).map((year) => ({
    label: year.name,
    value: year._id,
  }));
  const subjectOptions = (Array.isArray(subjects) ? subjects : []).map((subject) => ({
    label: subject.name,
    value: subject._id,
  }));
  const teachersOptions = (Array.isArray(teachers) ? teachers : []).map((teacher) => ({
    label: teacher.name,
    value: teacher._id,
  }));
  const studentOptions = (Array.isArray(students) ? students : []).map((student) => ({
    label: student.name,
    value: student._id,
  }));
  return (
    <Modal
      open={open}
      setOpen={onOpenChange}
      description={initialData ? "Edit Class" : "Create New Class"}
      title={initialData ? "Edit Class" : "Create New Class"}
    >
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <CustomInput
              control={form.control}
              name="name"
              label="Name"
              placeholder="Grade 1"
              disabled={pending}
            />
            <CustomSelect
              control={form.control}
              name="academicYear"
              label="Year"
              placeholder="Select Year"
              options={yearOptions}
              disabled={pending}
              loading={loadingOptions}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <CustomSelect
              control={form.control}
              name="classTeacher"
              label="Class Teacher"
              placeholder="Select Teacher"
              options={teachersOptions}
              disabled={pending}
              loading={loadingOptions}
            />
            <Controller
              name="capacity"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="capacity">Max Capacity</FieldLabel>
                  <Input id="capacity" type="number" {...field} />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </div>
          <CustomMultiSelect
            control={form.control}
            name="subjectIds"
            label="Subjects"
            placeholder="Select subjects..."
            options={subjectOptions}
            loading={loadingSubjects}
            disabled={pending}
          />
          <CustomMultiSelect
            control={form.control}
            name="studentIds"
            label="Students"
            placeholder="Select students..."
            options={studentOptions}
            loading={loadingStudents}
            disabled={pending}
          />
        </FieldGroup>
        <Button
          className="w-full mt-2"
          type="submit"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? "Saving..." : "Save Class"}
        </Button>
      </form>
    </Modal>
  );
};

export default ClassForm;
