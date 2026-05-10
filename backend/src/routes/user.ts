import express from "express";

const userRoutes = express.Router();

import { login, register } from "../controllers/user";

userRoutes.post("/register", register);
userRoutes.post("/login", login);

export default userRoutes;

//Next we protect the routes, also add rolebased access