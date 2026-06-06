import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { api } from "@/lib/api";
import { toast } from "sonner";

const Account = () => {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!user) return;
    try {
      setSaving(true);
      const payload = { name, email };
      await api.put(`/users/update/${user._id}`, payload);
      // refresh user
      const { data } = await api.get(`/users/${user._id}`);
      setUser(data.user ?? data);
      toast.success("Profile updated");
    } catch (e) {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-4">Account Settings</h1>
      <FieldGroup>
        <div className="grid grid-cols-1 gap-4">
          <Field>
            <FieldLabel>Name</FieldLabel>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel>Email</FieldLabel>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => { setName(user?.name ?? ""); setEmail(user?.email ?? ""); }}>
              Reset
            </Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </div>
        </div>
      </FieldGroup>
    </div>
  );
};

export default Account;
