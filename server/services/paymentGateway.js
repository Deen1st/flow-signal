const {
    paymentMiddleware,
    x402ResourceServer,
} = require("@okxweb3/x402-express");
const { ExactEvmScheme } = require("@okxweb3/x402-evm/exact/server");
const { OKXFacilitatorClient } = require("@okxweb3/x402-core");

const NETWORK = "eip155:196"; // X Layer
const PAY_TO = process.env.PAY_TO_ADDRESS;

function buildPaymentMiddleware() {
    if (!PAY_TO) {
        throw new Error("PAY_TO_ADDRESS is not set in .env");
    }

    // No OKX_API_KEY/SECRET/PASSPHRASE needed when using Agentic Wallet
    const facilitatorClient = new OKXFacilitatorClient({
        apiKey: process.env.OKX_API_KEY || "",
        secretKey: process.env.OKX_SECRET_KEY || "",
        passphrase: process.env.OKX_PASSPHRASE || "",
    });

    const resourceServer = new x402ResourceServer(facilitatorClient);
    resourceServer.register(NETWORK, new ExactEvmScheme());

    return paymentMiddleware(
        {
            "GET /signal": {
                accepts: [
                    {
                        scheme: "exact",
                        network: NETWORK,
                        
                        payTo: PAY_TO,
                        price: "$0.02", // price per call, tune as you like
                    },
                ],
                description: "Flow Signal — real-time multi-factor BTC-USDT market signal",
                mimeType: "application/json",
            },
        },
        resourceServer,
    );
}

module.exports = buildPaymentMiddleware;