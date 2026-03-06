// file: src/database/plugins/audit.plugin.ts

import { Schema } from "mongoose";

type AuditPluginOptions = {
  softDelete?: boolean;
};

export function addAdminAuditFields(schema: Schema, options: AuditPluginOptions = {}) {
  schema.add({
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
      index: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
      index: true,
    },
  });

  schema.set("timestamps", true);

  if (options.softDelete !== false) {
    schema.add({
      isDeleted: {
        type: Boolean,
        default: false,
        index: true,
      },
      deletedAt: {
        type: Date,
      },
      deletedBy: {
        type: Schema.Types.ObjectId,
        ref: "Admin",
      },
    });
  }
}
