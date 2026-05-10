import express from "express";

const userRoutes = express.Router();

import { registerUser } from "../controllers/user";

userRoutes.post("/register", registerUser);

export default userRoutes;