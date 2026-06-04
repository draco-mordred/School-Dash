import Modal from "@/components/global/Modal";
import UniversalUserForm from "@/components/auth/UniversalUserForm";
import type { user, UserRole } from "@/types";

const UserDialog = ({
  open,
  setOpen,
  editingUser,
  role,
  onSuccess,
}: {
  setOpen: (open: boolean) => void;
  open: boolean;
  editingUser: user | null;
  role: UserRole;
  onSuccess?: () => void;
}) => {
  const title = editingUser ? "Update User" : "Create User";
  const description = editingUser ? "Update user details" : "Add a new user";
  const onSuccessPlus = () => {
    setOpen(false);
    onSuccess?.();
  };
  return (
    <Modal
      title={title}
      description={description}
      open={open}
      setOpen={setOpen}
    >
      <UniversalUserForm
        type={editingUser ? "update" : "create"}
        role={role}
        initialData={editingUser}
        onSuccess={onSuccessPlus}
      />
    </Modal>
  );
};

export default UserDialog;
