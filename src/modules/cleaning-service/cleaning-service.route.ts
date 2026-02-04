// file: src/modules/cleaning-service/cleaning-service.route.ts

import { Router } from "express";

const router = Router();

router.all("/", (req, res) => {
  res.status(501).json({
    message: "Cleaning service module placeholder for demo/template use.",
  });
});

export default router;
