import { BaseSchemaUtil } from "@/utils/base-schema.utils";
import { model, Schema, type Types } from "mongoose";

export interface IEventQrToken {
  _id: Types.ObjectId;
  kind: "event";
  participantId: Types.ObjectId;
  payload: string;
  scannedAt?: Date[];
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const eventQrTokenSchema = BaseSchemaUtil.createSchema<IEventQrToken>({
  kind: {
    type: String,
    enum: ["event"],
    required: true,
    index: true,
  },
  participantId: {
    type: Schema.Types.ObjectId,
    ref: "EventParticipant",
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

export const EventQrToken = model<IEventQrToken>(
  "EventQrToken",
  eventQrTokenSchema,
);
