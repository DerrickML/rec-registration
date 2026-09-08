import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function ConferenceSelect({
  value,
  onValueChange,
  conferences = [],
  label = "Conference",
  countKey,
}) {
  return (
    <div className="grid min-w-0 gap-2 text-sm font-semibold">
      <span>{label}</span>
      <Select
        value={value}
        onValueChange={onValueChange}
        disabled={!conferences.length}
      >
        <SelectTrigger
          aria-label={label}
          className="h-12 w-full min-w-0 max-w-full bg-white"
        >
          <SelectValue
            placeholder={
              conferences.length
                ? "Select conference"
                : "No conferences available"
            }
          />
        </SelectTrigger>
        <SelectContent
          align="end"
          className="w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-2rem)] overflow-hidden"
        >
          {conferences.map((item) => (
            <SelectItem key={item.$id} value={item.$id}>
              <span className="block max-w-full whitespace-normal break-words text-left">
                {item.title ||
                  item.shortName ||
                  item.fullName ||
                  `REC ${item.year}`}
                {countKey && item[countKey] != null
                  ? ` (${item[countKey]})`
                  : ""}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
