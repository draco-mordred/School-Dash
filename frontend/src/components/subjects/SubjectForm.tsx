import { useEffect, useState } from "react";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { subjectFormSchema, type SubjectFormValues } from "./schema";

// UI Imports
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CustomInput } from "@/components/global/CustomInput";
import { CustomMultiSelect } from "@/components/global/CustomMultiSelect";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import type { subject } from "@/types";
import Modal from "@/components/global/Modal";

interface Option {
  _id: string;
  name: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData: subject | null;
  onSuccess: () => void;
}

export function SubjectForm({
  open,
  onOpenChange,
  initialData,
  onSuccess,
}: Props) {
  const [teachers, setTeachers] = useState<Option[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // 1. Fetch Teachers for the dropdown
  useEffect(() => {
    if (open) {
      const fetchTeachers = async () => {
        setLoadingOptions(true);
        try {
          const { data } = await api.get("/users?role=teacher");
          setTeachers(data.users);
        } catch (error) {
          toast.error("Failed to load teachers");
        } finally {
          setLoadingOptions(false);
        }
      };
      fetchTeachers();
    }
  }, [open]);

  const form = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectFormSchema) as Resolver<SubjectFormValues>,
    defaultValues: {
      name: "",
      code: "",
      teacher: [],
      isActive: true,
    },
  });

  // 2. Populate or Reset Form
  useEffect(() => {
    if (initialData) {
      // FIX: Map the array of teacher objects to an array of IDs (strings)
      const teacherIds = initialData.teacher
        ? initialData.teacher.map((t: any) =>
            typeof t === "object" ? t._id : t
          )
        : [];

      form.reset({
        name: initialData.name || "",
        code: initialData.code || "",
        teacher: teacherIds, // <--- Send IDs only, not objects
        isActive: initialData.isActive ?? true,
      });
    } else {
      form.reset({
        name: "",
        code: "",
        teacher: [],
        isActive: true,
      });
    }
  }, [initialData, form, open]);

  const onSubmit = async (values: SubjectFormValues) => {
    // console.log("Submitting:", values);
    try {
      // Logic: Convert empty array -> null for the backend
      const payload = {
        ...values,
        teacher:
          !values.teacher || values.teacher.length === 0
            ? null
            : values.teacher,
      };

      if (initialData) {
        await api.patch(`/subjects/update/${initialData._id}`, payload);
        toast.success("Subject updated successfully");
      } else {
        await api.post("/subjects/create", payload);
        toast.success("Subject created successfully");
      }
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      const msg =
        error.response?.data?.message || error.message || "Operation failed";
      toast.error(typeof msg === "string" ? msg : "Error occurred");
    }
  };

  const pending = form.formState.isSubmitting;
  const teachersOptions = teachers.map((teacher) => ({
    label: teacher.name,
    value: teacher._id,
  }));

  return (
    <Modal
      title={initialData ? "Edit Subject" : "Create Subject"}
      description={
        initialData
          ? "Edit the subject details."
          : "Fill in the details to create a new subject."
      }
      open={open}
      setOpen={onOpenChange}
    >
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <CustomInput
              control={form.control}
              name="name"
              label="Name"
              placeholder="Mathematics"
              disabled={pending}
            />
            <CustomInput
              control={form.control}
              name="code"
              label="Code"
              placeholder="MATH-101"
              disabled={pending}
            />
          </div>
          <CustomMultiSelect
            control={form.control}
            name="teacher"
            label="Teacher"
            placeholder="Select teacher..."
            options={teachersOptions}
            loading={loadingOptions}
            disabled={pending}
          />
          <Controller
            name="isActive"
            control={form.control}
            render={({ field: { value, onChange, ...field }, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <div className="flex flex-row space-x-3 rounded-md border p-3">
                  <Checkbox
                    id="isActive"
                    checked={value}
                    onCheckedChange={onChange}
                    {...field}
                  />
                  <div className="space-y-1">
                    <FieldLabel
                      htmlFor="isActive"
                      className="cursor-pointer mb-0"
                    >
                      Active Subject
                    </FieldLabel>
                    <p className="text-xs text-muted-foreground">
                      Inactive subjects won't appear in schedules.
                    </p>
                  </div>
                </div>
              </Field>
            )}
          />
        </FieldGroup>
        <Button
          type="submit"
          className="w-full mt-4"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? "Saving..." : "Save Subject"}
        </Button>
      </form>
    </Modal>
  );
}
