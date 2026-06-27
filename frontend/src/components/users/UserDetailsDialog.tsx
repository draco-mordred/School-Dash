import Modal from "@/components/global/Modal";
import { Badge } from "@/components/ui/badge";

const labelClass = "text-sm font-medium text-slate-600";
const valueClass = "text-sm text-slate-900";

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
      <div className="grid gap-4 sm:grid-cols-2 py-4">
        <div>
          <p className={labelClass}>Name</p>
          <p className={valueClass}>{user.name || "—"}</p>
        </div>
        <div>
          <p className={labelClass}>Email</p>
          <p className={valueClass}>{user.email || "—"}</p>
        </div>
        <div>
          <p className={labelClass}>Role</p>
          <Badge variant="secondary" className="mt-1">
            {roleLabel}
          </Badge>
        </div>
        <div>
          <p className={labelClass}>Status</p>
          <p className={valueClass}>{user.status || "—"}</p>
        </div>
        {user.matricNumber && (
          <div>
            <p className={labelClass}>Matric Number</p>
            <p className={valueClass}>{user.matricNumber}</p>
          </div>
        )}
        {user.class && (
          <div>
            <p className={labelClass}>Class</p>
            <p className={valueClass}>{user.class}</p>
          </div>
        )}
        {user.currentPosting && (
          <div>
            <p className={labelClass}>Current Posting</p>
            <p className={valueClass}>{user.currentPosting}</p>
          </div>
        )}
        {typeof user.attendancePercentage === "number" && (
          <div>
            <p className={labelClass}>Attendance</p>
            <p className={valueClass}>{user.attendancePercentage}%</p>
          </div>
        )}
        {user.studentsCount !== undefined && (
          <div>
            <p className={labelClass}>Students</p>
            <p className={valueClass}>{user.studentsCount}</p>
          </div>
        )}
        {user.department && (
          <div>
            <p className={labelClass}>Department</p>
            <p className={valueClass}>{user.department}</p>
          </div>
        )}
        {user.roles && Array.isArray(user.roles) && (
          <div className="sm:col-span-2">
            <p className={labelClass}>Roles</p>
            <div className="flex flex-wrap gap-2 mt-1">
              {user.roles.map((role: string) => (
                <Badge key={role} variant="outline" className="text-xs">
                  {role}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default UserDetailsDialog;
