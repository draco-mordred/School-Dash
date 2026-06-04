import { Input } from "@/components/ui/input";
import { SearchIcon } from "lucide-react";

const Search = ({
  search,
  setSearch,
  title,
}: {
  search: string;
  setSearch: (search: string) => void;
  title: string;
}) => {
  return (
    <div className="relative w-full md:w-64">
      <SearchIcon className="absolute left-2 top-2.5 size-4 text-muted-foreground" />
      <Input
        placeholder={`Search ${title}`}
        className="pl-8"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
    </div>
  );
};

export default Search;
