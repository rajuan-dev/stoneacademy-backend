// file: src/modules/activity/qr-token.model.ts

import type { Types } from "mongoose";

import { model, Schema } from "mongoose";

import { BaseSchemaUtil } from "@/utils/base-schema.utils";

export type IQrToken = {
  _id: Types.ObjectId;
  kind: "activity";
  participantId: Types.ObjectId;
  payload: string;
  scannedAt?: Date[];
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

const qrTokenSchema = BaseSchemaUtil.createSchema<IQrToken>({
  kind: {
    type: String,
    enum: ["activity"],
    required: true,
    index: true,
  },
  participantId: {
    type: Schema.Types.ObjectId,
    ref: "ActivityParticipant",
    required: true,
    index: true,
  },
  payload: {
    type: String,
    required: true,
  },
  scannedAt: {
    type: [Date],
    default: [],
  },
  revokedAt: {
    type: Date,
  },
});

export const QrToken = model<IQrToken>("QrToken", qrTokenSchema);
