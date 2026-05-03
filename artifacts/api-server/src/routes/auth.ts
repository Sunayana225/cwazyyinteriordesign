import { Router } from "express";
import { z } from "zod";
import type { Request, Response } from "express";
import { issueToken } from "../middlewares/auth";

const router = Router();

const tokenRequestSchema = z.object({
  email: z.string().email().max(254),
});

router.post("/auth/token", (req: Request, res: Response) => {
  const parsed = tokenRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Valid email required" });
    return;
  }

  const token = issueToken(parsed.data.email);
  res.json({ token, email: parsed.data.email });
});

export default router;
