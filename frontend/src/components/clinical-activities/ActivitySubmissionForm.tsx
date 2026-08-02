import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Activity Submission Schema
const activitySubmissionSchema = z.object({
  rotationId: z.string().min(1, "Rotation is required"),
  departmentGroupId: z.string().optional(),
  unitId: z.string().optional(),
  entryDate: z.string().min(1, "Date is required"),
  umbrellaCategory: z.enum(["MEDICINE", "SURGERY"], {
    errorMap: () => ({ message: "Category is required" }),
  }),
  clinicsAttended: z.boolean().default(false),
  wardRoundsAttended: z.enum(["NONE", "RESIDENT_ROUND", "CONSULTANT_ROUND", "BOTH"]).default("NONE"),
  callDutyCompleted: z.boolean().default(false),
  // Surgery-specific
  theatreDaysCount: z.number().int().min(0).optional(),
  casesObserved: z.string().optional(), // comma-separated
  casesAssisted: z.string().optional(), // comma-separated
  // Medicine-specific
  proceduresWitnessedOrDone: z.string().optional(), // comma-separated
});

type ActivitySubmissionInput = z.infer<typeof activitySubmissionSchema>;

interface ActivitySubmissionFormProps {
  onSuccess?: () => void;
}

export default function ActivitySubmissionForm({ onSuccess }: ActivitySubmissionFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [postings, setPostings] = useState<any[]>([]);
  const [selectedPostingId, setSelectedPostingId] = useState<string>("");
  const [departmentGroups, setDepartmentGroups] = useState<any[]>([]);
  const [selectedDepartmentGroupId, setSelectedDepartmentGroupId] = useState<string>("");
  const [units, setUnits] = useState<any[]>([]);
  const [loadingPostings, setLoadingPostings] = useState(false);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [postingError, setPostingError] = useState<string | null>(null);

  const form = useForm<ActivitySubmissionInput>({
    resolver: zodResolver(activitySubmissionSchema),
    defaultValues: {
      clinicsAttended: false,
      wardRoundsAttended: "NONE",
      callDutyCompleted: false,
    },
  });

  // Fetch rotations when component mounts
  const getDepartmentQuery = (window: any) => {
    return (
      window?.departmentName ||
      window?.department ||
      window?.departmentId ||
      window?.departmentCode ||
      ""
    );
  };

  const normalizeText = (value: unknown) => {
    if (typeof value !== "string") return "";
    return value.trim().toLowerCase();
  };

  const findBestUnitMatch = (window: any, unitList: any[]) => {
    if (!unitList.length) return null;

    const unitId = String(window?.unitId || "").trim();
    const unitName = String(window?.unitName || "").trim().toLowerCase();

    if (unitId) {
      const byId = unitList.find((unit) => String(unit._id) === unitId || String(unit._id) === unitId);
      if (byId) return byId;
    }

    if (unitName) {
      const byName = unitList.find(
        (unit) =>
          normalizeText(unit.name) === unitName ||
          normalizeText(String(unit._id)) === unitName ||
          normalizeText(unit.department) === unitName
      );
      if (byName) return byName;
    }

    return unitList[0];
  };

  const fetchUnitsForPosting = async (posting: any, category?: string) => {
    try {
      setLoadingUnits(true);
      const windowData = posting?.window ?? {};
      const departmentQuery = getDepartmentQuery(windowData);
      let endpoint = "/hospital-data/units?limit=200";
      if (departmentQuery) {
        endpoint += `&department=${encodeURIComponent(departmentQuery)}`;
      }
      if (category) {
        endpoint += `&umbrella=${encodeURIComponent(category)}`;
      }

      const { data } = await api.get(endpoint);
      const fetchedUnits = Array.isArray(data.units) ? data.units : [];
      setUnits(fetchedUnits);

      const bestMatch = findBestUnitMatch(windowData, fetchedUnits);
      if (bestMatch) {
        form.setValue("unitId", bestMatch._id);
      } else {
        form.setValue("unitId", "");
      }
    } catch (error) {
      console.error("Failed to load units:", error);
      toast.error("Failed to load units for current posting");
      setUnits([]);
      form.setValue("unitId", "");
    } finally {
      setLoadingUnits(false);
    }
  };

  const loadCurrentPostings = async () => {
    try {
      setLoadingPostings(true);
      setPostingError(null);
      const studentId = user?._id;
      if (!studentId) {
        setPostingError("User session not available");
        return;
      }

      const { data } = await api.get(`/rotation-schedules/student/${studentId}/current`);
      const currentPostings = Array.isArray(data.current) ? data.current : [];
      const mapped = currentPostings.map((item: any) => ({
        id: String(item.scheduleId ?? item.windowIndex ?? item._id ?? ""),
        label:
          item.postingName ||
          item.window?.unitName ||
          item.window?.departmentName ||
          `Posting ${Number(item.windowIndex ?? 0) + 1}`,
        scheduleId: item.scheduleId,
        window: item.window,
        schedule: item.schedule,
      }));

      setPostings(mapped);

      if (mapped.length > 0) {
        const first = mapped[0];
        setSelectedPostingId(first.id);
        form.setValue("rotationId", first.id);
        // populate department groups from schedule postings if available
        const schedule = first.schedule || {};
        const deptIndex = first.window?.departmentIndex ?? 0;
        const postingDef = (schedule.postings && schedule.postings[deptIndex]) || (schedule.postings && schedule.postings[0]) || null;
        const groups = postingDef?.groups || [];
        setDepartmentGroups(groups);
        if (groups.length > 0) {
          const gid = groups[0].id || groups[0].groupId || groups[0]._id || groups[0].group?._id || "";
          form.setValue("departmentGroupId", gid);
        }
        await fetchUnitsForPosting(first, form.getValues("umbrellaCategory"));
      } else {
        setPostingError("No active posting schedule found for your account.");
      }
    } catch (error) {
      console.error("Failed to load current postings:", error);
      toast.error("Failed to load active posting schedule");
      setPostingError("Unable to load your current posting schedule.");
    } finally {
      setLoadingPostings(false);
    }
  };

  const handlePostingChange = async (value: string) => {
    setSelectedPostingId(value);
    form.setValue("rotationId", value);
    form.setValue("unitId", "");
    form.setValue("departmentGroupId", "");

    const posting = postings.find((postingItem) => postingItem.id === value);
    if (posting) {
      // populate department groups for selected posting
      const schedule = posting.schedule || {};
      const deptIndex = posting.window?.departmentIndex ?? 0;
      const postingDef = (schedule.postings && schedule.postings[deptIndex]) || (schedule.postings && schedule.postings[0]) || null;
      const groups = postingDef?.groups || [];
      setDepartmentGroups(groups);
      if (groups.length > 0) {
        const gid = groups[0].id || groups[0].groupId || groups[0]._id || groups[0].group?._id || "";
        form.setValue("departmentGroupId", gid);
      } else {
        setDepartmentGroups([]);
      }
      await fetchUnitsForPosting(posting, form.getValues("umbrellaCategory"));
    }
  };

  const umbrellaCategory = form.watch("umbrellaCategory");

  // Handle category change
  const handleCategoryChange = async (value: string) => {
    form.setValue("umbrellaCategory", value as "MEDICINE" | "SURGERY");
    form.setValue("unitId", ""); // Reset unit selection

    const posting = postings.find((postingItem) => postingItem.id === selectedPostingId);
    if (posting) {
      await fetchUnitsForPosting(posting, value);
    }
  };

  useEffect(() => {
    if (user?._id) {
      void loadCurrentPostings();
    }
  }, [user?._id]);

  const onSubmit = async (data: ActivitySubmissionInput) => {
    try {
      setLoading(true);

      // Validate weekday (not weekend)
      const entryDate = new Date(data.entryDate);
      const dayOfWeek = entryDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        toast.error("Clinical activities must be submitted on weekdays only (Monday-Friday)");
        return;
      }

      // Validate umbrella-specific requirements
      if (data.umbrellaCategory === "SURGERY") {
        if (!data.theatreDaysCount && !data.casesObserved && !data.casesAssisted) {
          toast.error("Surgery activities require theatre days or cases");
          return;
        }
      } else if (data.umbrellaCategory === "MEDICINE") {
        if (!data.proceduresWitnessedOrDone) {
          toast.error("Medicine activities require procedures");
          return;
        }
      }

      // Prepare submission payload
      const payload = {
        student: user?._id,
        rotation: data.rotationId,
        ...(data.departmentGroupId ? { departmentGroupId: data.departmentGroupId } : {}),
        ...(data.unitId ? { unit: data.unitId } : {}),
        entryDate: data.entryDate,
        umbrellaCategory: data.umbrellaCategory,
        clinicsAttended: data.clinicsAttended,
        wardRoundsAttended: data.wardRoundsAttended,
        callDutyCompleted: data.callDutyCompleted,
        ...(data.umbrellaCategory === "SURGERY" && {
          surgicalMetrics: {
            theatreDaysCount: data.theatreDaysCount || 0,
            casesObserved: data.casesObserved?.split(",").map((c) => c.trim()) || [],
            casesAssisted: data.casesAssisted?.split(",").map((c) => c.trim()) || [],
          },
        }),
        ...(data.umbrellaCategory === "MEDICINE" && {
          medicalMetrics: {
            proceduresWitnessedOrDone: data.proceduresWitnessedOrDone?.split(",").map((p) => p.trim()) || [],
          },
        }),
      };

      await api.post("/activity-entries", payload);
      toast.success("Activity submitted successfully");
      form.reset({
        clinicsAttended: false,
        wardRoundsAttended: "NONE",
        callDutyCompleted: false,
      });
      onSuccess?.();
    } catch (error: any) {
      console.error("Failed to submit activity:", error);
      toast.error(error.response?.data?.error || error.response?.data?.message || "Failed to submit activity");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit Clinical Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {postingError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {postingError}
          </div>
        ) : null}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Rotation & Unit Selection */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
              control={form.control}
              name="rotationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Posting</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      void handlePostingChange(value);
                    }}
                  >
                    <FormControl>
                      <SelectTrigger disabled={loadingPostings}>
                        <SelectValue placeholder="Select current posting" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {postings.map((posting) => (
                        <SelectItem key={posting.id} value={posting.id}>
                          {posting.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="umbrellaCategory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Clinical Category</FormLabel>
                  <Select value={field.value} onValueChange={handleCategoryChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="MEDICINE">Medicine</SelectItem>
                      <SelectItem value="SURGERY">Surgery</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          {/* Department Group Selection */}
          <FormField
            control={form.control}
            name="departmentGroupId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Department Group</FormLabel>
                <Select value={field.value} onValueChange={(v) => { field.onChange(v); }}>
                  <FormControl>
                    <SelectTrigger disabled={!departmentGroups.length}>
                      <SelectValue placeholder={departmentGroups.length ? "Select group" : "No groups available"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {departmentGroups.map((g: any, idx: number) => {
                      const gid = g.id || g.groupId || g._id || g.group?._id || String(idx);
                      const label = g.group?.name || g.name || g.groupId || gid;
                      return (
                        <SelectItem key={gid} value={gid}>{label}</SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Unit Selection */}
          <FormField
            control={form.control}
            name="unitId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hospital Unit</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger disabled={loadingUnits || !units.length}>
                      <SelectValue placeholder={
                        loadingUnits
                          ? "Loading units..."
                          : units.length
                          ? "Select unit"
                          : "No units available"
                      } />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {units.map((unit) => (
                      <SelectItem key={unit._id} value={unit._id}>
                        {unit.name} ({unit.department})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Date */}
          <FormField
            control={form.control}
            name="entryDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Activity Date (Mon-Fri only)</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Shared Metrics */}
          <div className="space-y-3 border-t pt-4">
            <h3 className="font-semibold text-sm">Clinical Attendance</h3>
            
            <FormField
              control={form.control}
              name="clinicsAttended"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="font-normal cursor-pointer">Attended clinic today</FormLabel>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="wardRoundsAttended"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ward Rounds Attended</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="NONE">None</SelectItem>
                      <SelectItem value="RESIDENT_ROUND">Resident Round</SelectItem>
                      <SelectItem value="CONSULTANT_ROUND">Consultant Round</SelectItem>
                      <SelectItem value="BOTH">Both Rounds</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="callDutyCompleted"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="font-normal cursor-pointer">Completed call duty</FormLabel>
                </FormItem>
              )}
            />
          </div>

          {/* Category-Specific Metrics */}
          {umbrellaCategory === "SURGERY" && (
            <div className="space-y-3 border-t pt-4">
              <h3 className="font-semibold text-sm">Surgery Metrics</h3>

              <FormField
                control={form.control}
                name="theatreDaysCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Theatre Days</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="casesObserved"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cases Observed (comma-separated)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g., Laparotomy, Appendectomy" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="casesAssisted"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cases Assisted (comma-separated)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g., Wound dressing, Suturing" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {umbrellaCategory === "MEDICINE" && (
            <div className="space-y-3 border-t pt-4">
              <h3 className="font-semibold text-sm">Medicine Metrics</h3>

              <FormField
                control={form.control}
                name="proceduresWitnessedOrDone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Procedures Witnessed or Done (comma-separated)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g., Blood draw, ECG, Intubation" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {/* Submit Button */}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Submitting..." : "Submit Activity"}
          </Button>
        </form>
      </Form>
      </CardContent>
    </Card>
  );
}
