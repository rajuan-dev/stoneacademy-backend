// file: src/modules/quote/quote.route.ts

import { Router } from "express";

const router = Router();

router.all("/", (req, res) => {
  res.status(501).json({
    message: "Quote module placeholder for demo/template use.",
  });
});

export default router;
