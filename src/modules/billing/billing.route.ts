// file: src/modules/billing/billing.route.ts

import { Router } from "express";

const router = Router();

router.all("/", (req, res) => {
  res.status(501).json({
    message: "Billing module placeholder for demo/template use.",
  });
});

export default router;
