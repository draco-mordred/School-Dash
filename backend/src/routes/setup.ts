import express from "express";
import { createInitialSetup, getSetupStatus, updateSetup } from "../controllers/setup";

const setupRouter = express.Router();

setupRouter.get("/status", getSetupStatus);
setupRouter.post("/", createInitialSetup);
setupRouter.patch("/", updateSetup);

export default setupRouter;
