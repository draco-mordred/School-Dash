import express from "express";

const DEFAULT_BODY_LIMIT = process.env.EXPRESS_BODY_LIMIT || "10mb";

export const getBodyLimit = () => process.env.EXPRESS_BODY_LIMIT || "10mb";

export const createBodyParsers = () => ({
  json: express.json({ limit: DEFAULT_BODY_LIMIT }),
  urlencoded: express.urlencoded({ extended: true, limit: DEFAULT_BODY_LIMIT }),
});
