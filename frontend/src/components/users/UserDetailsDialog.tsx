import Modal from "@/components/global/Modal";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

const labelClass = "text-sm font-medium text-muted-foreground";
const valueClass = "text-sm text-foreground";

const UserDetailsDialog = ({
  open,
  setOpen,
  user,
  loading = false,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  user: any;
  loading?: boolean;
}) => {
  if (!user) return null;

  const attendanceValue = typeof user.attendancePercentage === "number" ? `${user.attendancePercentage}%` : "—";
  const currentPostingValue = user.currentPosting || "Not assigned";

  const roleLabel =
    user.role ||
    (user.matricNumber ? "Student" : user.studentsCount ? "Parent" : "Staff") ||
    "User";

  return (
    <Modal
      title="User Details"
      description={`Viewing full details for ${user.name}`}
      open={open}
      setOpen={setOpen}
    >
      <div className="mt-2 animate-[pop-in_220ms_cubic-bezier(0.16,1,0.3,1)] rounded-2xl border border-border/70 bg-card/70 p-4 shadow-[0_18px_45px_-20px_rgba(15,23,42,0.45)]">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-4">
          <div>
            <p className="text-lg font-semibold text-foreground">{user.name || "Unnamed user"}</p>
            <p className="text-sm text-muted-foreground">{user.email || "No email provided"}</p>
          </div>
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            {roleLabel}
          </Badge>
        </div>

        {loading ? (
          <div className="mt-4 flex items-center justify-center rounded-2xl border border-dashed border-border/70 bg-background/60 p-4 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading details…
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border/60 bg-background/70 p-3">
            <p className={labelClass}>Role</p>
            <p className={valueClass}>{roleLabel}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/70 p-3">
            <p className={labelClass}>Status</p>
            <p className={valueClass}>{user.status || "—"}</p>
          </div>
          {user.matricNumber && (
            <div className="rounded-xl border border-border/60 bg-background/70 p-3">
              <p className={labelClass}>Matric Number</p>
              <p className={valueClass}>{user.matricNumber}</p>
            </div>
          )}
          {user.class && (
            <div className="rounded-xl border border-border/60 bg-background/70 p-3">
              <p className={labelClass}>Class</p>
              <p className={valueClass}>{user.class}</p>
            </div>
          )}
          <div className="rounded-xl border border-border/60 bg-background/70 p-3">
            <p className={labelClass}>Current Posting</p>
            <p className={valueClass}>{currentPostingValue}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/70 p-3">
            <p className={labelClass}>Attendance</p>
            <p className={valueClass}>{attendanceValue}</p>
          </div>
          {user.studentsCount !== undefined && (
            <div className="rounded-xl border border-border/60 bg-background/70 p-3">
              <p className={labelClass}>Students</p>
              <p className={valueClass}>{user.studentsCount}</p>
            </div>
          )}
          {user.department && (
            <div className="rounded-xl border border-border/60 bg-background/70 p-3">
              <p className={labelClass}>Department</p>
              <p className={valueClass}>{user.department}</p>
            </div>
          )}
          {user.roles && Array.isArray(user.roles) && (
            <div className="sm:col-span-2 rounded-xl border border-border/60 bg-background/70 p-3">
              <p className={labelClass}>Roles</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {user.roles.map((role: string) => (
                  <Badge key={role} variant="outline" className="text-xs">
                    {role}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default UserDetailsDialog;
