import express from "express";
import { createInitialSetup, getSetupStatus } from "../controllers/setup";

const setupRouter = express.Router();

setupRouter.get("/status", getSetupStatus);
setupRouter.post("/", createInitialSetup);

export default setupRouter;
