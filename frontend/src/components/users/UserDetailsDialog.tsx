import Modal from "@/components/global/Modal";
import { Badge } from "@/components/ui/badge";

const labelClass = "text-sm font-medium text-muted-foreground";
const valueClass = "text-sm text-foreground";

const UserDetailsDialog = ({
  open,
  setOpen,
  user,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  user: any;
}) => {
  if (!user) return null;

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
      <div className="mt-2 rounded-2xl border border-border/70 bg-card/70 p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-4">
          <div>
            <p className="text-lg font-semibold text-foreground">{user.name || "Unnamed user"}</p>
            <p className="text-sm text-muted-foreground">{user.email || "No email provided"}</p>
          </div>
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            {roleLabel}
          </Badge>
        </div>

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
          {user.currentPosting && (
            <div className="rounded-xl border border-border/60 bg-background/70 p-3">
              <p className={labelClass}>Current Posting</p>
              <p className={valueClass}>{user.currentPosting}</p>
            </div>
          )}
          {typeof user.attendancePercentage === "number" && (
            <div className="rounded-xl border border-border/60 bg-background/70 p-3">
              <p className={labelClass}>Attendance</p>
              <p className={valueClass}>{user.attendancePercentage}%</p>
            </div>
          )}
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
      </div>
    </Modal>
  );
};

export default UserDetailsDialog;
