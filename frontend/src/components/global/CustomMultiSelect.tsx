import {
  type Control,
  Controller,
  type FieldValues,
  type Path,
} from "react-hook-form";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  MultiSelect,
  MultiSelectContent,
  MultiSelectGroup,
  MultiSelectItem,
  MultiSelectTrigger,
  MultiSelectValue,
} from "@/components/ui/multi-select";

export interface MultiSelectOption {
  label: string;
  value: string;
}

interface CustomMultiSelectProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  placeholder?: string;
  options: MultiSelectOption[];
  loading?: boolean;
  disabled?: boolean;
}

export function CustomMultiSelect<T extends FieldValues>({
  control,
  name,
  label,
  placeholder = "Select options...",
  options,
  loading = false,
  disabled,
}: CustomMultiSelectProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} className="w-full">
          <FieldLabel htmlFor={name}>{label}</FieldLabel>
          <MultiSelect
            onValuesChange={field.onChange}
            values={field.value || []} // Ensure it is always an array
          >
            <MultiSelectTrigger
              className="w-full"
              id={name}
              disabled={disabled || loading}
            >
              <MultiSelectValue placeholder={placeholder} />
            </MultiSelectTrigger>
            <MultiSelectContent>
              <MultiSelectGroup>
                {loading ? (
                  <div className="p-2 text-center text-sm text-muted-foreground">
                    Loading options...
                  </div>
                ) : options.length === 0 ? (
                  <div className="p-2 text-center text-sm text-muted-foreground">
                    No options available
                  </div>
                ) : (
                  options.map((option) => (
                    <MultiSelectItem key={option.value} value={option.value}>
                      {option.label}
                    </MultiSelectItem>
                  ))
                )}
              </MultiSelectGroup>
            </MultiSelectContent>
          </MultiSelect>

          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}
