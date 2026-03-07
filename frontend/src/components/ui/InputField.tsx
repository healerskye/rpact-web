"use client";

interface InputFieldProps {
  label: string;
  name: string;
  type?: "number" | "text";
  value: string | number;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  step?: number;
  helpText?: string;
}

export function InputField({ label, name, type = "number", value, onChange, min, max, step, helpText }: InputFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={name}
        type={type}
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      {helpText && <p className="text-xs text-slate-500">{helpText}</p>}
    </div>
  );
}

interface SelectFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  helpText?: string;
}

export function SelectField({ label, name, value, onChange, options, helpText }: SelectFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <select
        id={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {helpText && <p className="text-xs text-slate-500">{helpText}</p>}
    </div>
  );
}
