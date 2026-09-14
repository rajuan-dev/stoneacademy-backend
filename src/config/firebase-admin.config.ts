import admin from "firebase-admin";

import { env } from "@/env";
import { BadRequestException } from "@/utils/app-error.utils";

function getFirebasePrivateKey() {
  if (!env.FIREBASE_PRIVATE_KEY)
    return undefined;
  return env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n");
}

export function getFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin;
  }

  const privateKey = getFirebasePrivateKey();
  if (!env.FIREBASE_PROJECT_ID || !env.FIREBASE_CLIENT_EMAIL || !privateKey) {
    throw new BadRequestException("Firebase auth is not configured");
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  });

  return admin;
}
