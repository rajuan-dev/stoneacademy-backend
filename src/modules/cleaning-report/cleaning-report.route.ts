// file: src/modules/cleaning-report/cleaning-report.route.ts

import { Router } from "express";

const router = Router();

router.all("/", (req, res) => {
  res.status(501).json({
    message: "Cleaning report module placeholder for demo/template use.",
  });
});

export default router;
