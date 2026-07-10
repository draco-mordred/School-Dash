import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import PortalAuthLayout from "@/components/auth/PortalAuthLayout";
import PortalTopNav from "@/components/auth/PortalTopNav";
import { Button } from "@/components/ui/button";
import { CustomInput } from "@/components/global/CustomInput";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const schema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  rememberMe: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

const rememberMeStorageKey = "adminPortalRememberMe";

export default function AdminPortalLogin() {
  const navigate = useNavigate();
  const { setUser, refreshAuth } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [institutionName, setInstitutionName] = useState<string | null>(null);
  const [institutionLogoUrl, setInstitutionLogoUrl] = useState<string | null>(null);
  const [institutionBackgroundImageUrl, setInstitutionBackgroundImageUrl] = useState<string | null>(null);
  const [institutionPrimaryColor, setInstitutionPrimaryColor] = useState<string | null>(null);
  const [institutionAccentColor, setInstitutionAccentColor] = useState<string | null>(null);

  const { control, handleSubmit, setValue } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const rememberMe = useWatch({ control, name: "rememberMe" });

  useEffect(() => {
    const cached = localStorage.getItem("adminPortalInstitutionCache");
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as { name?: string | null; logoUrl?: string | null; backgroundImageUrl?: string | null; primaryColor?: string | null; accentColor?: string | null };
        if (parsed?.name) {
          setInstitutionName(parsed.name);
          setInstitutionLogoUrl(parsed.logoUrl || null);
          setInstitutionBackgroundImageUrl(parsed.backgroundImageUrl || null);
          setInstitutionPrimaryColor(parsed.primaryColor || null);
          setInstitutionAccentColor(parsed.accentColor || null);
        }
      } catch {
        localStorage.removeItem("adminPortalInstitutionCache");
      }
    }

    const cachedCredentials = localStorage.getItem(rememberMeStorageKey);
    if (cachedCredentials) {
      try {
        const parsed = JSON.parse(cachedCredentials) as { email?: string; password?: string; rememberMe?: boolean };
        if (parsed?.rememberMe) {
          if (parsed.email) setValue("email", parsed.email);
          if (parsed.password) setValue("password", parsed.password);
          setValue("rememberMe", true);
        }
      } catch {
        localStorage.removeItem(rememberMeStorageKey);
      }
    }

    const fetchInstitution = async () => {
      try {
        const response = await api.get("/setup/status");
        const nextInstitution = response.data?.configured && response.data?.institution?.name
          ? {
              name: response.data.institution.name,
              logoUrl: response.data.institution.logoUrl || response.data.institution.logo || null,
              backgroundImageUrl: response.data.institution.backgroundImageUrl || null,
              primaryColor: response.data.institution.brandingSettings?.primaryColor || null,
              accentColor: response.data.institution.brandingSettings?.accentColor || null,
            }
          : { name: null, logoUrl: null, backgroundImageUrl: null, primaryColor: null, accentColor: null };

        setInstitutionName(nextInstitution.name ?? null);
        setInstitutionLogoUrl(nextInstitution.logoUrl ?? null);
        setInstitutionBackgroundImageUrl(nextInstitution.backgroundImageUrl ?? null);
        setInstitutionPrimaryColor(nextInstitution.primaryColor ?? null);
        setInstitutionAccentColor(nextInstitution.accentColor ?? null);
        localStorage.setItem("adminPortalInstitutionCache", JSON.stringify(nextInstitution));
      } catch (error) {
        console.error("Failed to fetch institution:", error);
        setInstitutionName(null);
        setInstitutionLogoUrl(null);
        setInstitutionBackgroundImageUrl(null);
        setInstitutionPrimaryColor(null);
        setInstitutionAccentColor(null);
      }
    };

    void fetchInstitution();
  }, [setValue]);

  async function onSubmit(data: FormData) {
    setIsSubmitting(true);
    try {
      const response = await api.post("/users/login", {
        email: data.email,
        password: data.password,
      });

      if (response.data?.user?.role !== "admin") {
        toast.error("This account cannot access the Administrator Portal.");
        setIsSubmitting(false);
        return;
      }

      if (response.data?.token) {
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("lastPortalRole", response.data.user?.role || "admin");
        if (data.rememberMe) {
          localStorage.setItem(rememberMeStorageKey, JSON.stringify({
            email: data.email,
            password: data.password,
            rememberMe: true,
          }));
        } else {
          localStorage.removeItem(rememberMeStorageKey);
        }
      }

      setUser(response.data.user);
      if (refreshAuth) {
        await refreshAuth();
      }

      toast.success(`Welcome, Administrator`);
      navigate("/dashboard");
    } catch (error: unknown) {
      const responseMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      const msg = responseMessage || "Login failed. Please check your credentials.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen">
      <PortalTopNav institutionName={institutionName} institutionLogoUrl={institutionLogoUrl} kind="admin" />

      {/* Portal Layout */}
      <div className="bg-gradient-to-br from-slate-50 via-white to-slate-100 px-4 py-8 text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 dark:text-slate-50 sm:px-6 lg:px-8">
        <PortalAuthLayout
          kind="admin"
          title="Administrator Portal"
          description="Institutional administrators access institution-wide configuration, user management, audit logs, and system settings."
          note="Only authorized institutional administrators have access to this portal. Unauthorized access attempts are logged and monitored."
          helperText="Enter your institutional email and password. Two-factor authentication is supported for enhanced security."
          backgroundImageUrl={institutionBackgroundImageUrl}
          primaryColor={institutionPrimaryColor}
          accentColor={institutionAccentColor}
        >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 p-4 text-amber-900 dark:from-amber-600/20 dark:to-orange-700/20 dark:text-amber-100">
          <Lock className="h-5 w-5 mr-2" />
          <span className="text-sm font-semibold">Secure Access Only</span>
        </div>

        <div className="space-y-4">
          <CustomInput
            control={control}
            name="email"
            label="Institutional Email"
            type="email"
            placeholder="admin@institution.edu"
            disabled={isSubmitting}
          />

          <CustomInput
            control={control}
            name="password"
            label="Password"
            type="password"
            placeholder="Enter your password"
            disabled={isSubmitting}
          />

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => {
                setValue("rememberMe", e.target.checked);
                if (!e.target.checked) {
                  localStorage.removeItem(rememberMeStorageKey);
                }
              }}
              className="h-4 w-4 rounded border-slate-300"
            />
            <span className="text-slate-600 dark:text-slate-300">Remember me on this device</span>
          </label>
        </div>

        <Button type="submit" disabled={isSubmitting} className="w-full h-11 font-semibold bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700">
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSubmitting ? "Verifying credentials..." : "Access Portal"}
        </Button>

        <div className="space-y-3 border-t border-slate-200/70 pt-4 text-center dark:border-slate-800/70">
          <a href="/admin/forgot-password" className="block text-sm text-[#6e56cf] hover:underline font-medium">
            Forgot your password?
          </a>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            All login attempts are recorded and monitored for security purposes.
          </p>
        </div>
      </form>
        </PortalAuthLayout>
      </div>
    </div>
  );
}
