import { saveChatMessage, mordredsWords, trackMordredPerformance } from "../controllers/mordred";
import express from "express";
import { protect, authorize } from "../middleware/auth";
import User from "../models/user";
import MordredLog from "../models/mordredLog";
import mordredMessenger from "../models/mordredMessenger";
import { sendMordredWhatsAppAlert } from "../services/whatsappGateway";

const mordredAIRouter = express.Router();

mordredAIRouter.post(
  "/save-message", 
  protect, 
  saveChatMessage
); //How can I test this in Thunder CLient: POST http://localhost:5000/api/mordred/save-message
// Body: {"message": "Hello, Mordred!"}
// Headers: {"Authorization": "Bearer <token>"}
// Note: Replace <token> with your actual token.
// Make sure to include the correct token in the Authorization header to authenticate the request.

// Test endpoint Mocking MORDRED AI instant response behavior
mordredAIRouter.post(
  "/chat", 
  (
    req, 
    res
  ) => {
  const { message } = req.body;
  
  // Quick logic rule emulation to verify parsing behavior
  if (message.toLowerCase().includes("attendance")) {
    return res.status(200).json({
      sender: "mordred_ai",
      reply: "System notice: I see an attendance query. Use your mobile geolocation service to verify ward placement boundaries."
    });
  }

  return res.status(200).json({
    sender: "mordred_ai",
    reply: "I am MORDRED. Your request has been cataloged inside Medlog servers."
  });
});

mordredAIRouter.post(
  "/chat/handle", 
  protect,
  mordredsWords
); //How can I test this in Thunder CLient: POST http://localhost:5000/mordred/saveChatMessage
// Headers:

mordredAIRouter.get(
  "admin/diagnostics",
  protect,
  trackMordredPerformance
)

// Test endpoint to trigger WhatsApp messages
mordredAIRouter.post("/test-whatsapp", 
  
  async (req, res) => {
  const { destination, alertText } = req.body;
  
  if (!destination || !alertText) {
    return res.status(400).json({ error: "Missing destination phone/link details or alert texts variables." });
  }

  const deliveryStatus = await sendMordredWhatsAppAlert(destination, alertText);
  
  if (deliveryStatus) {
    return res.status(200).json({ success: true, message: "Alert processed by MORDRED WhatsApp Gateway routing rules." });
  } else {
    return res.status(500).json({ success: false, error: "Gateway transaction pipeline crash." });
  }
});

export default mordredAIRouter;