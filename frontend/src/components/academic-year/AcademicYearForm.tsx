import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { CustomInput } from "@/components/global/CustomInput";
import { api } from "@/lib/api";
import { formSchema, type FormValues } from "./schema";
import type { academicYear } from "@/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData: academicYear | null;
  onSuccess: () => void;
}

const AcademicYearForm = ({
  open,
  onOpenChange,
  initialData,
  onSuccess,
}: Props) => {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      isCurrent: false,
    },
  });
  // Reset form when dialog opens or data changes
  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        fromYear: new Date(initialData.fromYear),
        toYear: new Date(initialData.toYear),
        isCurrent: initialData.isCurrent,
      });
    } else {
      form.reset({
        name: "",
        fromYear: undefined,
        toYear: undefined,
        isCurrent: false,
      });
    }
  }, [initialData, form, open]);

  const onSubmit = async (data: FormValues) => {
    try {
      if (initialData) {
        await api.patch(`/academic-years/update/${initialData._id}`, data);
        toast.success("Academic year updated");
      } else {
        await api.post("/academic-years/create", data);
        toast.success("Academic year created");
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.log(error);
      toast.error("Failed to save academic year");
    }
  };
  const pending = form.formState.isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Edit Year" : "New Academic Year"}
          </DialogTitle>
          <DialogDescription>
            Set the duration for this session.
          </DialogDescription>
        </DialogHeader>
        {/* form */}
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup className="space-y-2">
            {/* Name Field */}
            <CustomInput
              control={form.control}
              name="name"
              label="Year Name"
              placeholder="2026"
              disabled={pending}
            />
            {/* date grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Start Date */}
              <Controller
                name="fromYear"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Start Date</FieldLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          autoFocus
                        />
                      </PopoverContent>
                    </Popover>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              {/* End Date */}
              <Controller
                name="toYear"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>End Date</FieldLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < form.getValues("fromYear")}
                          autoFocus
                        />
                      </PopoverContent>
                    </Popover>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </div>
            {/* Checkbox */}
            <Controller
              name="isCurrent"
              control={form.control}
              render={({ field: { value, onChange, ...field } }) => (
                <Field>
                  <div className="flex gap-2 rounded-md border p-4">
                    <Checkbox
                      id="isCurrent"
                      checked={value}
                      onCheckedChange={onChange}
                      {...field}
                    />
                    <div className="space-y-1 leading-none">
                      <FieldLabel
                        htmlFor="isCurrent"
                        className="cursor-pointer"
                      >
                        Set as Active
                      </FieldLabel>
                      <p className="text-[0.8rem] text-muted-foreground mt-1">
                        Automatically deactivates others.
                      </p>
                    </div>
                  </div>
                </Field>
              )}
            />
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="w-full"
            >
              {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AcademicYearForm;
