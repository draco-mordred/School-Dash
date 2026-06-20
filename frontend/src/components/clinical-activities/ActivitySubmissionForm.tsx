import { useState } from "react";
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
  unitId: z.string().min(1, "Unit is required"),
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
  const [rotations, setRotations] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [loadingRotations, setLoadingRotations] = useState(false);

  const form = useForm<ActivitySubmissionInput>({
    resolver: zodResolver(activitySubmissionSchema),
    defaultValues: {
      clinicsAttended: false,
      wardRoundsAttended: "NONE",
      callDutyCompleted: false,
    },
  });

  // Fetch rotations when component mounts
  const fetchRotations = async () => {
    try {
      setLoadingRotations(true);
      const { data } = await api.get(`/clinical-rotations/active?studentId=${user?._id}`);
      setRotations(data.rotations || []);
    } catch (error) {
      console.error("Failed to load rotations:", error);
      toast.error("Failed to load rotations");
    } finally {
      setLoadingRotations(false);
    }
  };

  // Fetch units when category changes
  const fetchUnits = async (category: string) => {
    try {
      const { data } = await api.get(`/hospital-data/units?umbrella=${category}`);
      setUnits(data.units || []);
    } catch (error) {
      console.error("Failed to load units:", error);
      toast.error("Failed to load units");
    }
  };

  const umbrellaCategory = form.watch("umbrellaCategory");

  // Handle category change
  const handleCategoryChange = (value: string) => {
    form.setValue("umbrellaCategory", value as "MEDICINE" | "SURGERY");
    form.setValue("unitId", ""); // Reset unit selection
    fetchUnits(value);
  };

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
        studentId: user?._id,
        rotationId: data.rotationId,
        unitId: data.unitId,
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
      form.reset();
      onSuccess?.();
    } catch (error: any) {
      console.error("Failed to submit activity:", error);
      toast.error(error.response?.data?.message || "Failed to submit activity");
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
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Rotation & Unit Selection */}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="rotationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Clinical Rotation</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      fetchRotations();
                    }}
                  >
                    <FormControl>
                      <SelectTrigger disabled={loadingRotations}>
                        <SelectValue placeholder="Select rotation" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {rotations.map((rotation) => (
                        <SelectItem key={rotation._id} value={rotation._id}>
                          {rotation.rotationType} - {rotation.class}
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

          {/* Unit Selection */}
          <FormField
            control={form.control}
            name="unitId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hospital Unit</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit" />
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
      </CardContent>
    </Card>
  );
}
