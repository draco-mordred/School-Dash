import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
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
  idNumber: z.string().min(1, "Matriculation number or email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  rememberMe: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

const rememberMeStorageKey = "studentPortalRememberMe";

export default function StudentPortalLogin() {
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
      idNumber: "",
      password: "",
      rememberMe: false,
    },
  });

  const rememberMe = useWatch({ control, name: "rememberMe" });

  useEffect(() => {
    const cached = localStorage.getItem("studentPortalInstitutionCache");
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
        localStorage.removeItem("studentPortalInstitutionCache");
      }
    }

    const cachedCredentials = localStorage.getItem(rememberMeStorageKey);
    if (cachedCredentials) {
      try {
        const parsed = JSON.parse(cachedCredentials) as { idNumber?: string; password?: string; rememberMe?: boolean };
        if (parsed?.rememberMe) {
          if (parsed.idNumber) setValue("idNumber", parsed.idNumber);
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
        localStorage.setItem("studentPortalInstitutionCache", JSON.stringify(nextInstitution));
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
      const isEmail = data.idNumber.includes("@");
      const payload = isEmail
        ? { email: data.idNumber, password: data.password }
        : { password: data.password, idNumber: data.idNumber, credential: data.idNumber };

      const response = await api.post("/users/login", payload);

      if (response.data?.user?.role !== "student") {
        toast.error("This account cannot access the Student Portal.");
        setIsSubmitting(false);
        return;
      }

      if (response.data?.token) {
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("lastPortalRole", response.data.user?.role || "student");
        if (data.rememberMe) {
          localStorage.setItem(rememberMeStorageKey, JSON.stringify({
            idNumber: data.idNumber,
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

      toast.success(`Welcome, ${response.data.user?.name || "Student"}`);
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
      <PortalTopNav institutionName={institutionName} institutionLogoUrl={institutionLogoUrl} kind="student" />

      {/* Portal Layout */}
      <div className="bg-gradient-to-br from-slate-50 via-white to-slate-100 px-4 py-8 text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 dark:text-slate-50 sm:px-6 lg:px-8">
        <PortalAuthLayout
          kind="student"
          title="Student Portal"
          description="Sign in with your matriculation number or your institutional email to access your dashboard, postings, and logbooks."
          note="Student accounts are provisioned by your institution during initial setup. Contact your Faculty Administrator if you have not received your login credentials."
          helperText="You may sign in using either your matriculation number (e.g., UJ/0000/MN/0000) or your institutional email address."
          backgroundImageUrl={institutionBackgroundImageUrl}
          primaryColor={institutionPrimaryColor}
          accentColor={institutionAccentColor}
        >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <CustomInput
            control={control}
            name="idNumber"
            label="Matriculation Number or Email"
            placeholder="e.g., UJ/0000/MN/0000 or student@school.edu"
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
            <span className="text-slate-600 dark:text-slate-300">Remember me</span>
          </label>
        </div>

        <Button type="submit" disabled={isSubmitting} className="w-full h-11 font-semibold">
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSubmitting ? "Signing in..." : "Sign In"}
        </Button>

        <div className="space-y-3 border-t border-slate-200/70 pt-4 text-center dark:border-slate-800/70">
          <a href="/student/forgot-password" className="block text-sm text-[#6e56cf] hover:underline font-medium">
            Forgot your password?
          </a>
          <a href="/" className="block text-sm text-slate-600 hover:text-[#6e56cf] dark:text-slate-400">
            Need help? Contact support
          </a>
        </div>
      </form>
        </PortalAuthLayout>
      </div>
    </div>
  );
}
