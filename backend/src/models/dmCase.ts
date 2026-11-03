import mongoose, { Schema, Document } from "mongoose";

export interface IDmContextItem {
  sender: mongoose.Types.ObjectId | null;
  text: string;
  at: Date;
}

export interface IDmCase extends Document {
  kind: "soft_flag" | "hard_block";
  user: mongoose.Types.ObjectId; // the sender whose message was flagged
  dm: mongoose.Types.ObjectId; // the flagged message (evidence)
  rules: string[];
  // Small context window attached to the escalation report (privacy: ONLY
  // flagged message + this window is ever exposed — never the full thread).
  contextWindow: IDmContextItem[];
  status: "open" | "resolved";
  // Hard blocks freeze the sender chat-wide until an admin resolves.
  chatFrozen: boolean;
  strikeCountAtCreation: number;
  escalationReportSent: boolean;
  penalty: {
    level: number;
    label: string;
    suspensionUntil: Date | null;
    referral: boolean;
  } | null;
  resolution: {
    penaltyLevel: number | null;
    suspensionUntil: Date | null;
    deviationReason: string | null;
    note: string | null;
    resolvedBy: mongoose.Types.ObjectId | null;
    resolvedAt: Date | null;
  };
  appeal: {
    text: string | null;
    submittedAt: Date | null;
  };
  // TINASHA audit: every admin access to the flagged content is logged here.
  accessedBy: Array<{ admin: mongoose.Types.ObjectId; at: Date }>;
}

const DmCaseSchema = new Schema<IDmCase>(
  {
    kind: { type: String, enum: ["soft_flag", "hard_block"], required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    dm: { type: Schema.Types.ObjectId, ref: "DmMessage", required: true },
    rules: { type: [String], default: [] },
    contextWindow: {
      type: [
        {
          _id: false,
          sender: { type: Schema.Types.ObjectId, ref: "User", default: null },
          text: { type: String, default: "" },
          at: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    status: { type: String, enum: ["open", "resolved"], default: "open", index: true },
    chatFrozen: { type: Boolean, default: false },
    strikeCountAtCreation: { type: Number, default: 0 },
    escalationReportSent: { type: Boolean, default: false },
    penalty: {
      type: {
        _id: false,
        level: { type: Number, default: 0 },
        label: { type: String, default: "" },
        suspensionUntil: { type: Date, default: null },
        referral: { type: Boolean, default: false },
      },
      default: null,
    },
    resolution: {
      type: {
        _id: false,
        penaltyLevel: { type: Number, default: null },
        suspensionUntil: { type: Date, default: null },
        deviationReason: { type: String, default: null },
        note: { type: String, default: null },
        resolvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
        resolvedAt: { type: Date, default: null },
      },
      default: {},
    },
    appeal: {
      type: {
        _id: false,
        text: { type: String, default: null },
        submittedAt: { type: Date, default: null },
      },
      default: {},
    },
    accessedBy: {
      type: [
        {
          _id: false,
          admin: { type: Schema.Types.ObjectId, ref: "User" },
          at: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.model<IDmCase>("DmCase", DmCaseSchema);
