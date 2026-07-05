"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var dotenv = require("dotenv");
var node_child_process_1 = require("node:child_process");
dotenv.config();
var port = process.env.PORT || "5000";
var targetUrl = "http://localhost:".concat(port, "/api/inngest");
console.log("Starting Inngest on ".concat(targetUrl));
var child = (0, node_child_process_1.spawn)("npx", ["inngest-cli@latest", "dev", "-u", targetUrl], {
    shell: true,
    stdio: "inherit",
});
child.on("error", function (error) {
    console.error("Failed to start Inngest:", error);
    process.exit(1);
});
child.on("exit", function (code) {
    process.exit(code !== null && code !== void 0 ? code : 1);
});
