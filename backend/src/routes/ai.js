import { Router } from "express";
import { authRequired } from "../middleware/auth.js";

const router = Router();
router.use(authRequired);

router.post("/generate-reminder", async (req, res) => {
  const { clientName, renewalDate, policyNumber, tone } = req.body;
  const key = process.env.OPENAI_API_KEY;
  const context = [
    `Client: ${clientName || "Valued customer"}`,
    `Renewal / due date: ${renewalDate || "TBD"}`,
    `Policy number: ${policyNumber || "N/A"}`,
    `Tone: ${tone || "friendly, concise SMS/WhatsApp style"}`,
  ].join("\n");
  if (!key) {
    return res.status(503).json({
      error: "OpenAI API key not configured",
      fallback:
        `Reminder: Dear ${clientName || "Customer"}, your policy ${policyNumber || ""} renewal is due on ${renewalDate || "soon"}. Please reply to this message or call your advisor to complete renewal. Thank you.`,
    });
  }
  try {
    const system =
      "You write short renewal reminder messages for Indian insurance customers. Under 320 characters if possible, plain text, no markdown.";
    const user = `Write one reminder message.\n${context}`;
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.5,
      }),
    });
    const data = await r.json();
    if (!r.ok) {
      return res.status(502).json({ error: data.error?.message || "OpenAI error" });
    }
    const text = data.choices?.[0]?.message?.content?.trim() || "";
    res.json({ text });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to generate reminder" });
  }
});

router.post("/generate-email", async (req, res) => {
  const { purpose, context } = req.body;
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return res.status(503).json({
      error: "OpenAI API key not configured",
      fallback:
        "Subject: Follow-up on your insurance policy\n\nDear Client,\n\nThank you for your patience. We are writing regarding your policy and will share an update shortly.\n\nRegards,\nStar Health Insurance CRM Team",
    });
  }
  try {
    const system =
      "You draft short, polite professional emails for Star Health Insurance CRM operations staff writing to customers and leads. Keep under 180 words. Plain text only.";
    const user = `Purpose: ${purpose || "general follow-up"}\nContext:\n${context || "(none)"}`;
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.4,
      }),
    });
    const data = await r.json();
    if (!r.ok) {
      return res.status(502).json({ error: data.error?.message || "OpenAI error" });
    }
    const text = data.choices?.[0]?.message?.content?.trim() || "";
    res.json({ text });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to generate email" });
  }
});

export default router;
