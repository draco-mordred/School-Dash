import { saveChatMessage, mordredsWords, trackMordredPerformance, dynamicAIInsights } from "../controllers/mordred";
import express from "express";
import { protect, authorize } from "../middleware/auth";
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
export default mordredAIRouter;
