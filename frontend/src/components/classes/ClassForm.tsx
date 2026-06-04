import { useEffect, useState } from "react";
import { useForm, type Resolver, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { api } from "@/lib/api";
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
        const { data } = await api.get("/subjects");
        setSubjects(data.subjects);
        setLoadingSubjects(false);
      } catch (error) {
        toast.error("Failed to load subjects");
      } finally {
        setLoadingOptions(false);
      }
    };
    fetchSubjects();
  }, []);

  //   form
  const form = useForm<ClassFormValues>({
    resolver: zodResolver(classFormSchema) as Resolver<ClassFormValues>,
    defaultValues: {
      name: "",
      capacity: 40,
      academicYear: "",
      classTeacher: "",
      subjectIds: [],
    },
  });

  //  Populate Form on Edit
  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        capacity: initialData.capacity,
        academicYear: initialData.academicYear?._id || "",
        classTeacher: initialData.classTeacher?._id || "",
        subjectIds: initialData.subjects.map((s) => s._id),
      });
    } else {
      form.reset({
        name: "",
        capacity: 40,
        academicYear: "",
        classTeacher: "",
        subjectIds: [],
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
        subjects: data.subjectIds,
      };
      if (initialData) {
        await api.put(`/classes/update/${initialData._id}`, payload);
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

  const yearOptions = years.map((year) => ({
    label: year.name,
    value: year._id,
  }));
  const subjectOptions = subjects.map((subject) => ({
    label: subject.name,
    value: subject._id,
  }));
  const teachersOptions = teachers.map((teacher) => ({
    label: teacher.name,
    value: teacher._id,
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
              label="Year"
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
