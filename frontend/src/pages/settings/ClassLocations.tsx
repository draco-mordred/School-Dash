import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { LocateFixed, MapPin, Save } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ClassLocationVenue = {
  _id: string;
  name: string;
  lat: number;
  lng: number;
  radiusMeters: number;
};

type ClassLocation = {
  _id: string;
  name: string;
  suggestedName: string;
  defaultVenue: ClassLocationVenue | null;
};

type LocationForm = {
  name: string;
  lat: string;
  lng: string;
  radiusMeters: string;
};

// PR B — admin "Class Locations" page: per-class default lecture location
// (auto-named "<Class> Lecture Classroom"), editable GPS coordinates and
// radius, with a "Calibrate Here" device-GPS shortcut.
const ClassLocationsPage = () => {
  const [classes, setClasses] = useState<ClassLocation[]>([]);
  const [forms, setForms] = useState<Record<string, LocationForm>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchLocations = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/class-locations");
      const list: ClassLocation[] = response.data?.classes ?? [];
      setClasses(list);
      setForms((prev) => {
        const next: Record<string, LocationForm> = {};
        for (const cls of list) {
          next[cls._id] =
            prev[cls._id] ??
            {
              name: cls.defaultVenue?.name || cls.suggestedName,
              lat:
                cls.defaultVenue?.lat != null ? String(cls.defaultVenue.lat) : "",
              lng:
                cls.defaultVenue?.lng != null ? String(cls.defaultVenue.lng) : "",
              radiusMeters:
                cls.defaultVenue?.radiusMeters != null
                  ? String(cls.defaultVenue.radiusMeters)
                  : "150",
            };
        }
        return next;
      });
    } catch (error) {
      console.error(error);
      toast.error("Failed to load class locations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLocations();
  }, [fetchLocations]);

  const updateField = (
    classId: string,
    field: keyof LocationForm,
    value: string,
  ) =>
    setForms((prev) => ({
      ...prev,
      [classId]: { ...prev[classId], [field]: value },
    }));

  const calibrateHere = (classId: string) => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported on this device.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateField(classId, "lat", String(position.coords.latitude));
        updateField(classId, "lng", String(position.coords.longitude));
        toast.success("Location calibrated from this device. Save to apply.");
      },
      () => toast.error("Could not read device GPS. Check location permissions."),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const saveLocation = async (cls: ClassLocation) => {
    const form = forms[cls._id];
    if (!form) return;
    setSavingId(cls._id);
    try {
      await api.put(`/class-locations/${cls._id}`, {
        name: form.name,
        lat: form.lat,
        lng: form.lng,
        radiusMeters: form.radiusMeters,
      });
      toast.success(`Location saved for ${cls.name}.`);
      await fetchLocations();
    } catch (error: unknown) {
      console.error(error);
      const maybeResponse = error as {
        response?: { data?: { message?: string } };
      };
      toast.error(
        maybeResponse.response?.data?.message ||
          "Failed to save class location.",
      );
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Class Locations</h1>
        <p className="text-sm text-muted-foreground">
          Set each class's default lecture location. Proximity check-ins are
          validated against these GPS coordinates when no more specific
          venue is configured.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading class locations…</p>
      ) : classes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No classes found. Create classes first.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {classes.map((cls) => {
            const form = forms[cls._id];
            const configured = cls.defaultVenue?.lat != null;
            return (
              <Card key={cls._id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {cls.name}
                  </CardTitle>
                  <CardDescription>
                    {configured
                      ? `Default: ${cls.defaultVenue?.name}`
                      : "Not configured — check-ins for this class stay pending"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor={`loc-name-${cls._id}`}>Location name</Label>
                      <Input
                        id={`loc-name-${cls._id}`}
                        value={form?.name ?? ""}
                        onChange={(e) => updateField(cls._id, "name", e.target.value)}
                        placeholder={cls.suggestedName}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`loc-radius-${cls._id}`}>Radius (meters)</Label>
                      <Input
                        id={`loc-radius-${cls._id}`}
                        value={form?.radiusMeters ?? ""}
                        onChange={(e) =>
                          updateField(cls._id, "radiusMeters", e.target.value)
                        }
                        placeholder="150"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`loc-lat-${cls._id}`}>Latitude</Label>
                      <Input
                        id={`loc-lat-${cls._id}`}
                        value={form?.lat ?? ""}
                        onChange={(e) => updateField(cls._id, "lat", e.target.value)}
                        placeholder="e.g. 9.87589"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`loc-lng-${cls._id}`}>Longitude</Label>
                      <Input
                        id={`loc-lng-${cls._id}`}
                        value={form?.lng ?? ""}
                        onChange={(e) => updateField(cls._id, "lng", e.target.value)}
                        placeholder="e.g. 8.8834"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => calibrateHere(cls._id)}
                    >
                      <LocateFixed className="mr-2 h-4 w-4" />
                      Calibrate Here
                    </Button>
                    <Button
                      type="button"
                      className="flex-1"
                      disabled={savingId === cls._id}
                      onClick={() => void saveLocation(cls)}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {savingId === cls._id ? "Saving…" : "Save"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ClassLocationsPage;
