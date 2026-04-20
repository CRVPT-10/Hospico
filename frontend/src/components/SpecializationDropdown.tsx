import { useMemo, useState } from "react";

type SpecializationDropdownProps = {
  label: string;
  valueCsv: string;
  options: string[];
  onChangeCsv: (value: string) => void;
  required?: boolean;
};

const splitCsv = (value: string) =>
  value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

export default function SpecializationDropdown({
  label,
  valueCsv,
  options,
  onChangeCsv,
  required = false,
}: SpecializationDropdownProps) {
  const selected = useMemo(() => splitCsv(valueCsv), [valueCsv]);
  const [selectedOption, setSelectedOption] = useState("");

  const availableOptions = useMemo(() => {
    const used = new Set(selected);
    return options.filter((option) => !used.has(option));
  }, [options, selected]);

  const addSelectedOption = () => {
    if (!selectedOption.trim()) return;
    const next = [...selected, selectedOption].join(", ");
    onChangeCsv(next);
    setSelectedOption("");
  };

  const removeSelectedOption = (value: string) => {
    const next = selected.filter((entry) => entry !== value).join(", ");
    onChangeCsv(next);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm text-gray-700 dark:text-slate-300">{label}{required ? " *" : ""}</label>

      {/* Keeps native required-validation behavior in form submit. */}
      <input
        value={valueCsv}
        readOnly
        className="sr-only"
        tabIndex={-1}
        required={required}
        aria-hidden="true"
      />

      <div className="flex gap-2">
        <select
          value={selectedOption}
          onChange={(event) => setSelectedOption(event.target.value)}
          className="flex-1 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-slate-100"
          disabled={availableOptions.length === 0}
        >
          <option value="">
            {availableOptions.length > 0 ? "Select specialization" : "All specializations selected"}
          </option>
          {availableOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={addSelectedOption}
          disabled={!selectedOption}
          className="rounded-lg px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium"
        >
          Add
        </button>
      </div>

      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selected.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 text-xs text-blue-700 dark:text-blue-200"
            >
              {item}
              <button
                type="button"
                onClick={() => removeSelectedOption(item)}
                className="font-semibold leading-none"
                aria-label={`Remove ${item}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-500 dark:text-slate-400">No specialization selected.</p>
      )}
    </div>
  );
}
