import { saveChatMessage, mordredsWords, trackMordredPerformance, dynamicAIInsights } from "../controllers/mordred";
import express from "express";
import { protect, authorize } from "../middleware/auth";
import { sendMordredWhatsAppAlert } from "../services/whatsappGateway";
const mordredAIRouter = express.Router();
mordredAIRouter.post("/save-message", protect, saveChatMessage); //How can I test this in Thunder CLient: POST http://localhost:5000/api/mordred/save-message
// Body: {"message": "Hello, Mordred!"}
// Headers: {"Authorization": "Bearer <token>"}
// Note: Replace <token> with your actual token.
// Make sure to include the correct token in the Authorization header to authenticate the request.
mordredAIRouter.post("/chat/handle", protect, mordredsWords); //How can I test this in Thunder CLient: POST http://localhost:5000/mordred/saveChatMessage
// Headers:
mordredAIRouter.get("/admin/diagnostics", protect, authorize(["admin"]), trackMordredPerformance);
mordredAIRouter.get("/insights", protect, authorize(["admin", "teacher", "unitconsultant", "unitresident", "parent"]), dynamicAIInsights);
// Test endpoint to trigger WhatsApp messages
mordredAIRouter.post("/test-whatsapp", async (req, res) => {
    const { destination, alertText } = req.body;
    if (!destination || !alertText) {
        return res.status(400).json({ error: "Missing destination phone/link details or alert texts variables." });
    }
    const deliveryStatus = await sendMordredWhatsAppAlert(destination, alertText);
    if (deliveryStatus) {
        return res.status(200).json({ success: true, message: "Alert processed by MORDRED WhatsApp Gateway routing rules." });
    }
    else {
        return res.status(500).json({ success: false, error: "Gateway transaction pipeline crash." });
    }
});
export default mordredAIRouter;
