import { PARTICIPANT_STATUS } from "@/constants/app.constants";
import { BaseSchemaUtil } from "@/utils/base-schema.utils";
import { model, Schema, type Types } from "mongoose";

export interface IEventParticipant {
  _id: Types.ObjectId;
  eventId: Types.ObjectId;
  userId: Types.ObjectId;
  status: (typeof PARTICIPANT_STATUS)[keyof typeof PARTICIPANT_STATUS];
  joinedAt?: Date;
  paymentTransactionId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const eventParticipantSchema = BaseSchemaUtil.createSchema<IEventParticipant>({
  eventId: {
    type: Schema.Types.ObjectId,
    ref: "Event",
    required: true,
    index: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: Object.values(PARTICIPANT_STATUS),
    default: PARTICIPANT_STATUS.JOINED,
    index: true,
  },
  joinedAt: {
    type: Date,
  },
  paymentTransactionId: {
    type: Schema.Types.ObjectId,
    ref: "PaymentTransaction",
  },
});

eventParticipantSchema.index({ eventId: 1, userId: 1 }, { unique: true });

export const EventParticipant = model<IEventParticipant>(
  "EventParticipant",
  eventParticipantSchema,
);
