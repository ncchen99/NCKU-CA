"use client";

import type {
  ChangeEvent,
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { useLocale } from "next-intl";
import { AppSelect } from "@/components/ui/app-select";
import { normalizeLocale } from "@/lib/i18n-config";

interface BaseFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  hint?: string;
}

type InputFieldProps = BaseFieldProps &
  InputHTMLAttributes<HTMLInputElement> & {
    as?: "input";
  };

type TextareaFieldProps = BaseFieldProps &
  TextareaHTMLAttributes<HTMLTextAreaElement> & {
    as: "textarea";
  };

type SelectFieldProps = BaseFieldProps &
  SelectHTMLAttributes<HTMLSelectElement> & {
    as: "select";
    options: { value: string; label: string }[];
    searchable?: boolean;
    searchPlaceholder?: string;
  };

type FormFieldProps = InputFieldProps | TextareaFieldProps | SelectFieldProps;

const inputBase =
  "block w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-neutral-950 outline-none transition-colors placeholder:text-neutral-400 focus:border-primary focus:ring-1 focus:ring-primary/30 disabled:bg-neutral-50 disabled:text-neutral-500";

function SelectFieldInner({
  fieldProps,
  error: hasError,
}: {
  fieldProps: SelectFieldProps;
  error: boolean;
}) {
  const {
    options,
    onChange,
    className,
    value,
    disabled,
    id,
    name,
    autoFocus,
    searchable,
    searchPlaceholder,
  } = fieldProps;

  return (
    <AppSelect
      options={options}
      value={value}
      onChange={(newValue) => {
        onChange?.({
          target: { value: newValue },
          currentTarget: { value: newValue },
        } as ChangeEvent<HTMLSelectElement>);
      }}
      disabled={disabled}
      id={id}
      name={name}
      autoFocus={autoFocus}
      invalid={hasError}
      aria-invalid={hasError || undefined}
      className={className}
      searchable={searchable}
      searchPlaceholder={searchPlaceholder}
    />
  );
}

export function FormField(props: FormFieldProps) {
  const locale = normalizeLocale(useLocale());
  const { label, error, required, hint, as = "input", ...rest } = props;

  return (
    <div className="w-full">
      <label className="mb-1.5 block text-sm font-medium text-neutral-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {as === "textarea" ? (
        <textarea
          className={`${inputBase} min-h-[80px] resize-y ${error ? "border-red-400 focus:border-red-500 focus:ring-red-200" : ""}`}
          {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : as === "select" ? (
        <SelectFieldInner fieldProps={props as SelectFieldProps} error={!!error} />
      ) : (
        (() => {
          const inputProps = rest as InputHTMLAttributes<HTMLInputElement>;
          const isTemporalInput =
            inputProps.type === "date" ||
            inputProps.type === "time" ||
            inputProps.type === "datetime-local" ||
            inputProps.type === "month" ||
            inputProps.type === "week";

          return (
            <input
              className={`${inputBase} ${error ? "border-red-400 focus:border-red-500 focus:ring-red-200" : ""}`}
              {...inputProps}
              lang={inputProps.lang ?? (isTemporalInput ? locale : undefined)}
            />
          );
        })()
      )}
      {hint && !error && (
        <p className="mt-1 text-xs text-neutral-400">{hint}</p>
      )}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
