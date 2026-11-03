import { type Request, type Response } from "express";
import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createMistral } from "@ai-sdk/mistral";
import {
  getGoogleApiKeys,
  getMistralApiKeys,
  resolveMordredProvider,
} from "../services/mordredEngine";

// ─── DALE provider health diagnostics (admin) ──────────────────────────
// Answers "why does DALE say 'All provider keys failed'?" without exposing
// key material: reports which env vars are configured and performs a LIVE
// one-token test call per configured key, surfacing the real error text.
const keyConfigured = (name: string) =>
  Boolean(String((process.env as any)[name] ?? "").trim());

const maskError = (err: any) =>
  String(err?.message ?? err ?? "unknown error").slice(0, 300);

export const getProviderHealth = async (req: Request, res: Response) => {
  const startedAt = Date.now();
  const mistralKeys = getMistralApiKeys();
  const googleKeys = getGoogleApiKeys();

  const configured = {
    mistral: {
      MISTRAL_API_KEY: keyConfigured("MISTRAL_API_KEY"),
      MISTRAL_API_KEY_2: keyConfigured("MISTRAL_API_KEY_2"),
    },
    google: {
      AI_GATEWAY_API_KEY: keyConfigured("AI_GATEWAY_API_KEY"),
      GEMINI_API_KEY: keyConfigured("GEMINI_API_KEY"),
      GOOGLE_GENERATIVE_AI_API_KEY: keyConfigured("GOOGLE_GENERATIVE_AI_API_KEY"),
      GOOGLE_GENERATIVE_AI_API_KEY_2: keyConfigured("GOOGLE_GENERATIVE_AI_API_KEY_2"),
    },
  };

  const liveTests: Record<string, any>[] = [];

  for (let i = 0; i < mistralKeys.length; i++) {
    const started = Date.now();
    try {
      const mistral = createMistral({ apiKey: mistralKeys[i] });
      const { text } = await generateText({
        model: mistral(process.env.MORDRED_MISTRAL_MODEL || "mistral-small-latest"),
        prompt: "Reply with the single word: healthy",
        maxOutputTokens: 16,
      });
      liveTests.push({
        provider: "mistral",
        keyIndex: i + 1,
        ok: true,
        sample: String(text ?? "").slice(0, 40),
        ms: Date.now() - started,
      });
    } catch (err: any) {
      liveTests.push({
        provider: "mistral",
        keyIndex: i + 1,
        ok: false,
        errorName: err?.name ?? "Error",
        error: maskError(err),
        ms: Date.now() - started,
      });
    }
  }

  for (let i = 0; i < googleKeys.length; i++) {
    const started = Date.now();
    try {
      const googleAI = createGoogleGenerativeAI({ apiKey: googleKeys[i] });
      const { text } = await generateText({
        model: googleAI(process.env.MORDRED_MODEL || "gemini-3.8-flash"),
        prompt: "Reply with the single word: healthy",
        maxOutputTokens: 16,
      });
      liveTests.push({
        provider: "google",
        keyIndex: i + 1,
        ok: true,
        sample: String(text ?? "").slice(0, 40),
        ms: Date.now() - started,
      });
    } catch (err: any) {
      liveTests.push({
        provider: "google",
        keyIndex: i + 1,
        ok: false,
        errorName: err?.name ?? "Error",
        error: maskError(err),
        ms: Date.now() - started,
      });
    }
  }

  const anyOk = liveTests.some((t) => t.ok);
  const modelVersions = {
    mistralModel: process.env.MORDRED_MISTRAL_MODEL || "mistral-small-latest",
    googleModel: process.env.MORDRED_MODEL || "gemini-3.8-flash",
  };

  return res.status(200).json({
    status: anyOk ? "healthy" : mistralKeys.length + googleKeys.length === 0 ? "no-keys-configured" : "all-keys-failing",
    resolvedProvider: resolveMordredProvider(),
    mistralKeyCount: mistralKeys.length,
    googleKeyCount: googleKeys.length,
    configured,
    modelVersions,
    liveTests,
    diagnosis: anyOk
      ? "At least one provider responded — DALE chat should work."
      : mistralKeys.length + googleKeys.length === 0
        ? "NO provider keys are visible to the backend process. The AI keys were probably set on Vercel (frontend) but NOT on the Render backend service — add them in Render → Service → Environment, then redeploy."
        : "Keys are configured but every live test call failed. Read liveTests[].error: 401/403 = invalid or expired key; model errors = wrong key type for this provider (e.g. an AI-gateway key used directly against Gemini); timeouts/network = outbound issue on the host.",
    totalMs: Date.now() - startedAt,
  });
};
