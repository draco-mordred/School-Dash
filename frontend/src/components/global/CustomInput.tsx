import {
  type Control,
  Controller,
  type FieldValues,
  type Path,
} from "react-hook-form";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { type ComponentProps } from "react";

// Extend standard Input props but override specific ones we handle manually
interface CustomInputProps<T extends FieldValues>
  extends Omit<ComponentProps<typeof Input>, "name"> {
  control: Control<T>;
  name: Path<T>; // Ensures type safety for the field name
  label: string;
  description?: string;
}

export function CustomInput<T extends FieldValues>({
  control,
  name,
  label,
  description,
  disabled,
  ...props
}: CustomInputProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel>{label}</FieldLabel>
          <Input {...field} {...props} />

          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}
