import { describe, test, expect } from "bun:test";
import {
  MORDRED_TOOL_SPECS,
  toolsForRole,
  toolSpecByName,
  canUseTool,
  DEFAULT_MORDRED_LIMITS,
  limitsForRole,
  usageDateKey,
  withinLimits,
} from "../src/utils/mordredTools";

describe("PR M1 — MORDRED tool registry (DALE)", () => {
  test("tool names are unique", () => {
    const names = MORDRED_TOOL_SPECS.map((s) => s.name);
    expect(names.length).toBe(new Set(names).size);
  });

  test("every tool has a description, allowed roles and a fields object", () => {
    for (const spec of MORDRED_TOOL_SPECS) {
      expect(spec.description.length > 10).toBe(true);
      expect(spec.allowedRoles.length > 0).toBe(true);
      expect(spec.fields).toBeDefined();
    }
  });

  test("students only get student tools — never admin tools", () => {
    const studentTools = toolsForRole("student").map((t) => t.name);
    expect(studentTools).toContain("get_my_risk_snapshot");
    expect(studentTools).toContain("get_my_results_and_gpa");
    expect(studentTools).toContain("request_escalation");
    expect(studentTools.includes("release_course_results")).toBe(false);
    expect(studentTools.includes("get_class_risk_overview")).toBe(false);
    expect(studentTools.includes("send_system_alert")).toBe(false);
  });

  test("staff get class tools but not admin system actions", () => {
    const teacherTools = toolsForRole("teacher").map((t) => t.name);
    expect(teacherTools).toContain("get_class_risk_overview");
    expect(teacherTools).toContain("check_exam_overlap");
    expect(teacherTools.includes("release_course_results")).toBe(false);
    expect(teacherTools.includes("recompute_course_results")).toBe(false);
  });

  test("admins get staff tools plus system actions", () => {
    const adminTools = toolsForRole("admin").map((t) => t.name);
    expect(adminTools).toContain("get_class_risk_overview");
    expect(adminTools).toContain("release_course_results");
    expect(adminTools).toContain("override_withheld_result");
    expect(adminTools).toContain("recompute_course_results");
    expect(adminTools).toContain("send_system_alert");
  });

  test("role matching is case-insensitive and unknown roles get nothing", () => {
    expect(toolsForRole("Student").length).toBe(toolsForRole("student").length);
    expect(toolsForRole("nonexistent-role").length).toBe(0);
  });

  test("canUseTool re-checks roles (defense in depth)", () => {
    expect(canUseTool("get_my_risk_snapshot", "student")).toBe(true);
    expect(canUseTool("get_my_risk_snapshot", "teacher")).toBe(false);
    expect(canUseTool("release_course_results", "admin")).toBe(true);
    expect(canUseTool("release_course_results", "student")).toBe(false);
    expect(canUseTool("no-such-tool", "admin")).toBe(false);
  });

  test("toolSpecByName finds tools and ignores whitespace", () => {
    expect(toolSpecByName(" check_exam_overlap ")?.name).toBe("check_exam_overlap");
    expect(toolSpecByName("missing")).toBeUndefined();
  });

  test("usageDateKey is UTC YYYY-MM-DD", () => {
    expect(usageDateKey(new Date("2026-11-02T23:30:00Z"))).toBe("2026-11-02");
    expect(usageDateKey(new Date("2026-01-01T00:00:00Z"))).toBe("2026-01-01");
  });

  test("limits exist per role with a default fallback", () => {
    expect(DEFAULT_MORDRED_LIMITS.student.messages).toBeGreaterThan(0);
    expect(DEFAULT_MORDRED_LIMITS.admin.messages).toBeGreaterThan(DEFAULT_MORDRED_LIMITS.student.messages);
    expect(limitsForRole("student").toolCalls).toBeGreaterThan(0);
    expect(limitsForRole("mystery-role")).toBe(DEFAULT_MORDRED_LIMITS.default);
  });

  test("withinLimits boundary is inclusive", () => {
    const limits = withinLimits({ messages: 20, toolCalls: 40 }, "student");
    expect(limits.messages).toBe(true);
    expect(limits.toolCalls).toBe(true);
    const over = withinLimits({ messages: 21, toolCalls: 41 }, "student");
    expect(over.messages).toBe(false);
    expect(over.toolCalls).toBe(false);
  });
});