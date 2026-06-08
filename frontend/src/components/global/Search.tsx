import { Input } from "@/components/ui/input";
import { SearchIcon } from "lucide-react";

const Search = ({
  value,
  onChange,
  placeholder = "Search",
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) => {
  return (
    <div className={`relative w-full md:w-64 ${className}`}>
      <SearchIcon className="absolute left-2 top-2.5 size-4 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        className="pl-8 rounded-lg"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
};

export default Search;
