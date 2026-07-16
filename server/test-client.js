require("dotenv").config();
const { privateKeyToAccount } = require("viem/accounts");
const { ExactEvmScheme } = require("@okxweb3/x402-evm/exact/client");

const SERVER_URL = "http://localhost:5000/signal";

function encodePaymentHeader(paymentPayloadResult) {
    const json = JSON.stringify(paymentPayloadResult);
    return Buffer.from(json, "utf8").toString("base64");
}

async function main() {
    const account = privateKeyToAccount(process.env.TEST_BUYER_PRIVATE_KEY);
    const scheme = new ExactEvmScheme(account);

    console.log("Buyer address:", account.address);
    console.log("Requesting:", SERVER_URL);

    // Step 1: initial request, expect 402
    const firstRes = await fetch(SERVER_URL);
    console.log("First response status:", firstRes.status);

    if (firstRes.status !== 402) {
        console.log("No payment required, or unexpected status. Body:");
        console.log(await firstRes.text());
        return;
    }

    const paymentRequiredBody = await firstRes.json();
    console.log("Payment requirements:", JSON.stringify(paymentRequiredBody, null, 2));

    const requirements = paymentRequiredBody.accepts[0];

    // Step 2: build a signed payment payload
    const x402Version = paymentRequiredBody.x402Version ?? 2;
    const paymentPayloadResult = await scheme.createPaymentPayload(
        x402Version,
        requirements
    );

    console.log("Signed payload:", JSON.stringify(paymentPayloadResult, null, 2));

    // Step 3: encode and retry with the payment header attached
    const headerValue = encodePaymentHeader(paymentPayloadResult);

    const secondRes = await fetch(SERVER_URL, {
        headers: {
            "payment-signature": headerValue,
        },
    });

    console.log("Second response status:", secondRes.status);

    const paymentResponseHeader = secondRes.headers.get("payment-response");
    if (paymentResponseHeader) {
        const decoded = JSON.parse(
            Buffer.from(paymentResponseHeader, "base64").toString("utf8")
        );
        console.log("Settlement info:", decoded);
    }

    const body = await secondRes.json();
    console.log("Signal received:", body);
}

main().catch((err) => {
    console.error("Test client failed:", err);
});