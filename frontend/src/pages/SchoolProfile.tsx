import { useEffect, useState } from "react";
import { Building2, CalendarDays, Compass, ImageIcon, MapPin, Palette, School2 } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

type InstitutionProfile = {
  name: string;
  shortName: string;
  type: string;
  country: string;
  state: string;
  city: string;
  academicCalendarType: string;
  timezone: string;
  logoUrl: string;
  backgroundImageUrl: string;
  brandingSettings?: {
    primaryColor?: string;
    accentColor?: string;
  };
};

const DetailItem = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm">
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
    <p className="mt-2 text-sm font-medium text-foreground">{value || "—"}</p>
  </div>
);

export default function SchoolProfile() {
  const [institution, setInstitution] = useState<InstitutionProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadInstitution = async () => {
      setLoading(true);
      try {
        const response = await api.get<{ institution?: InstitutionProfile }>('/setup/status');
        if (isMounted) {
          setInstitution(response.data?.institution ?? null);
        }
      } catch (error) {
        console.error(error);
        if (isMounted) {
          setInstitution(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadInstitution();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-6 py-10">
        <div className="rounded-3xl border border-border bg-card px-6 py-5 text-sm text-muted-foreground shadow-sm">
          Loading Insitution profile…
        </div>
      </div>
    );
  }

  if (!institution) {
    return (
      <div className="px-6 py-10">
        <Card className="rounded-3xl border-dashed border-border/80 shadow-sm">
          <CardContent className="p-10 text-center text-muted-foreground">
            Insitution profile information is not available yet.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-6 py-8">
      <Card className="overflow-hidden rounded-3xl border-0 shadow-sm">
        <div
          className="relative min-h-[260px] bg-slate-950/90 p-8 text-white"
          style={institution.backgroundImageUrl ? { backgroundImage: `url(${institution.backgroundImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
        >
          {institution.backgroundImageUrl && <div className="absolute inset-0 bg-slate-950/75" />}
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-white/10 shadow-lg backdrop-blur">
                {institution.logoUrl ? (
                  <img src={institution.logoUrl} alt={`${institution.name} logo`} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl font-semibold">
                    {String(institution.shortName || institution.name || "SC").slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300">Insitution Profile</p>
                <h1 className="mt-2 text-3xl font-semibold text-white">{institution.name || "Institution"}</h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-300">
                  This page displays the institution profile information that is currently configured for the school.
                </p>
              </div>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-slate-100 backdrop-blur">
              <Building2 className="h-4 w-4" />
              {institution.type || "Institution"}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.8fr]">
        <Card className="rounded-3xl shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <School2 className="h-5 w-5" />
              Institution details
            </CardTitle>
            <CardDescription>Core profile information shared across the platform.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <DetailItem label="Institution Name" value={institution.name} />
            <DetailItem label="Short Name" value={institution.shortName} />
            <DetailItem label="Type" value={institution.type} />
            <DetailItem label="Academic Calendar" value={institution.academicCalendarType} />
            <DetailItem label="Timezone" value={institution.timezone} />
            <DetailItem label="Location" value={[institution.city, institution.state, institution.country].filter(Boolean).join(", ") || "—"} />
          </CardContent>
        </Card>

        <Card className="rounded-3xl shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Palette className="h-5 w-5" />
              Branding
            </CardTitle>
            <CardDescription>The visual identity that currently appears in the app.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <ImageIcon className="h-4 w-4" />
                Logo status
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {institution.logoUrl ? "A logo is currently configured for this institution." : "No logo has been uploaded yet."}
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Compass className="h-4 w-4" />
                Background image
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {institution.backgroundImageUrl ? "A background image is currently configured." : "No background image has been uploaded yet."}
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Palette className="h-4 w-4" />
                Primary colors
              </div>
              <div className="mt-3 flex items-center gap-3">
                <span className="h-8 w-8 rounded-full border border-border" style={{ backgroundColor: institution.brandingSettings?.primaryColor || "#2563eb" }} />
                <span className="text-sm text-muted-foreground">Primary: {institution.brandingSettings?.primaryColor || "#2563eb"}</span>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <span className="h-8 w-8 rounded-full border border-border" style={{ backgroundColor: institution.brandingSettings?.accentColor || "#4f46e5" }} />
                <span className="text-sm text-muted-foreground">Accent: {institution.brandingSettings?.accentColor || "#4f46e5"}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarDays className="h-5 w-5" />
            Additional context
          </CardTitle>
          <CardDescription>Read-only information for staff, students, and parents.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <DetailItem label="Country" value={institution.country} />
          <DetailItem label="State" value={institution.state} />
          <DetailItem label="City" value={institution.city} />
        </CardContent>
      </Card>
    </div>
  );
}
