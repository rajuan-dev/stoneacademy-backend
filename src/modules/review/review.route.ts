// file: src/modules/review/review.route.ts

import { Router } from "express";

const router = Router();

router.all("/", (req, res) => {
  res.status(501).json({
    message: "Review module placeholder for demo/template use.",
  });
});

export default router;
