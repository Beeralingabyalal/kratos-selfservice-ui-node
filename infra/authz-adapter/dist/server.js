"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const pino_1 = __importDefault(require("pino"));
const app = (0, express_1.default)();
app.use(express_1.default.json());
const logger = (0, pino_1.default)();
const KETO_ADMIN_URL = process.env.KETO_ADMIN_URL || "http://host.docker.internal:4466";
function extractCN(header) {
    if (!header)
        return null;
    const match = header.match(/CN=([^;]+)/);
    return match ? match[1] : null;
}
app.post("/check", async (req, res) => {
    try {
        const xfcc = req.headers["x-forwarded-client-cert"];
        const clientCN = extractCN(xfcc);
        if (!clientCN) {
            return res.status(403).json({ allowed: false });
        }
        const { namespace, object, relation } = req.body;
        const response = await axios_1.default.post(`${KETO_ADMIN_URL}/relation-tuples/check`, {
            namespace,
            object,
            relation,
            subject_id: clientCN
        });
        return res.json({ allowed: response.data.allowed });
    }
    catch (err) {
        logger.error(err);
        return res.status(500).json({ allowed: false });
    }
});
app.listen(3000, () => {
    console.log("AuthZ Adapter running on port 3000");
});
