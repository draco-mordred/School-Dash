import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import Modal from "@/components/global/Modal";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Pencil,
  Plus,
  MapPin,
  Trash2,
  LocateFixed,
  Power,
} from "lucide-react";

type Venue = {
  _id: string;
  name: string;
  code?: string;
  description?: string;
  room?: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  isActive: boolean;
};

type VenueForm = {
  name: string;
  code: string;
  room: string;
  description: string;
  lat: string;
  lng: string;
  radiusMeters: string;
};

const EMPTY_FORM: VenueForm = {
  name: "",
  code: "",
  room: "",
  description: "",
  lat: "",
  lng: "",
  radiusMeters: "150",
};

// Admin page (Phase A1): configure lecture locations used globally for
// attendance GPS proximity checks. Radius defaults to 150 m (D7).
const VenuesPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<VenueForm>(EMPTY_FORM);

  const fetchVenues = async (includeInactive = false) => {
    try {
      setLoading(true);
      const { data } = await api.get(
        "/venues" + (includeInactive ? "?includeInactive=true" : ""),
      );
      setVenues((data?.venues ?? []) as Venue[]);
    } catch {
      toast.error("Failed to load venues");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    void fetchVenues(showInactive);
  }, [isAdmin, showInactive]);

  if (!isAdmin) {
    return (
      <div className="p-4">
        <p className="text-sm text-muted-foreground">
          Only administrators can manage lecture locations.
        </p>
      </div>
    );
  }

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (venue: Venue) => {
    setEditingId(venue._id);
    setForm({
      name: venue.name ?? "",
      code: venue.code ?? "",
      room: venue.room ?? "",
      description: venue.description ?? "",
      lat: String(venue.lat ?? ""),
      lng: String(venue.lng ?? ""),
      radiusMeters: String(venue.radiusMeters ?? 150),
    });
    setFormOpen(true);
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported on this device");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((f) => ({
          ...f,
          lat: position.coords.latitude.toFixed(6),
          lng: position.coords.longitude.toFixed(6),
        }));
        toast.success("Location captured");
      },
      () => toast.error("Could not read your location. Check permissions."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleSave = async () => {
    const lat = Number(form.lat);
    const lng = Number(form.lng);
    const radius = Number(form.radiusMeters || "150");
    if (!form.name.trim()) {
      toast.error("Venue name is required");
      return;
    }
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      toast.error("Latitude must be between -90 and 90");
      return;
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      toast.error("Longitude must be between -180 and 180");
      return;
    }
    if (!Number.isFinite(radius) || radius < 10 || radius > 2000) {
      toast.error("Radius must be between 10 and 2000 metres");
      return;
    }
    try {
      setSaving(true);
      const body = {
        name: form.name.trim(),
        code: form.code.trim(),
        room: form.room.trim(),
        description: form.description.trim(),
        lat,
        lng,
        radiusMeters: radius,
      };
      if (editingId) {
        await api.patch("/venues/update/" + editingId, body);
        toast.success("Venue updated");
      } else {
        await api.post("/venues/create", body);
        toast.success("Venue created");
      }
      setFormOpen(false);
      await fetchVenues(showInactive);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to save venue");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (venue: Venue) => {
    try {
      if (venue.isActive) {
        await api.delete("/venues/delete/" + venue._id);
        toast.success("Venue deactivated");
      } else {
        await api.patch("/venues/update/" + venue._id, {
          name: venue.name,
          lat: venue.lat,
          lng: venue.lng,
          isActive: true,
        });
        toast.success("Venue reactivated");
      }
      await fetchVenues(showInactive);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to update venue");
    }
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Venues &amp; Locations
          </h1>
          <p className="text-muted-foreground">
            Configure lecture locations used globally for attendance GPS
            proximity checks.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowInactive((v) => !v)}>
            {showInactive ? "Hide inactive" : "Show inactive"}
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Venue
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : venues.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <MapPin className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              No venues yet. Add your first lecture location to enable GPS
              proximity checks.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {venues.map((venue) => (
            <Card key={venue._id}>
              <CardContent className="py-3 flex items-center gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">
                      {venue.name}
                    </span>
                    {venue.room ? (
                      <span className="text-xs text-muted-foreground truncate">
                        {venue.room}
                      </span>
                    ) : null}
                    {!venue.isActive ? (
                      <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">
                        inactive
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {venue.lat.toFixed(5)}, {venue.lng.toFixed(5)} · radius{" "}
                    {venue.radiusMeters} m
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(venue)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => void toggleActive(venue)}
                  >
                    {venue.isActive ? (
                      <Trash2 className="h-4 w-4 text-destructive" />
                    ) : (
                      <Power className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={formOpen}
        setOpen={setFormOpen}
        title={editingId ? "Edit Venue" : "Add Venue"}
        description="Lecture location used for GPS proximity verification."
      >
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. New Lecture Theatre"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Room / Hall (optional)</Label>
              <Input
                value={form.room}
                onChange={(e) => setForm((f) => ({ ...f, room: e.target.value }))}
                placeholder="e.g. Hall B"
              />
            </div>
            <div className="space-y-2">
              <Label>Code (optional)</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="e.g. NLT"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Short note about this location"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Latitude</Label>
              <Input
                value={form.lat}
                onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value }))}
                placeholder="e.g. 6.5244"
              />
            </div>
            <div className="space-y-2">
              <Label>Longitude</Label>
              <Input
                value={form.lng}
                onChange={(e) => setForm((f) => ({ ...f, lng: e.target.value }))}
                placeholder="e.g. 3.3792"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 items-end">
            <div className="space-y-2">
              <Label>Radius (metres)</Label>
              <Input
                type="number"
                min={10}
                max={2000}
                value={form.radiusMeters}
                onChange={(e) => setForm((f) => ({ ...f, radiusMeters: e.target.value }))}
              />
            </div>
            <Button variant="outline" onClick={useCurrentLocation}>
              <LocateFixed className="mr-2 h-4 w-4" />
              Use my current location
            </Button>
          </div>
          <Button className="w-full" onClick={() => void handleSave()} disabled={saving}>
            {saving ? "Saving..." : editingId ? "Update Venue" : "Create Venue"}
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default VenuesPage;
