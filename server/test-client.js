require("dotenv").config();
const { privateKeyToAccount } = require("viem/accounts");
const { ExactEvmScheme } = require("@okxweb3/x402-evm/exact/client");

const SERVER_URL = "https://flow-signal.onrender.com/signal";

function decodePaymentRequiredHeader(headerValue) {
    const json = Buffer.from(headerValue, "base64").toString("utf8");
    return JSON.parse(json);
}

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

    const paymentRequiredHeader = firstRes.headers.get("payment-required");
    if (!paymentRequiredHeader) {
        console.log("No payment-required header found. Headers were:");
        console.log(Object.fromEntries(firstRes.headers.entries()));
        return;
    }

    const paymentRequiredBody = decodePaymentRequiredHeader(paymentRequiredHeader);
    console.log("Payment requirements:", JSON.stringify(paymentRequiredBody, null, 2));

    const requirements = paymentRequiredBody.accepts[0];

    // Step 2: build a signed payment payload
    const x402Version = paymentRequiredBody.x402Version ?? 2;
    const paymentPayloadResult = await scheme.createPaymentPayload(
        x402Version,
        requirements
    );

    paymentPayloadResult.accepted = requirements;

    console.log("Signed payload:", JSON.stringify(paymentPayloadResult, null, 2));

    // Step 3: encode and retry with the payment header attached
    const headerValue = encodePaymentHeader(paymentPayloadResult);

    const secondRes = await fetch(SERVER_URL, {
        headers: {
            "payment-signature": headerValue,
        },
    });

    console.log("Second response status:", secondRes.status);
    console.log("Second response headers:", Object.fromEntries(secondRes.headers.entries()));

    const paymentResponseHeader = secondRes.headers.get("payment-response");
    if (paymentResponseHeader) {
        const decoded = JSON.parse(
            Buffer.from(paymentResponseHeader, "base64").toString("utf8")
        );
        console.log("Settlement info:", decoded);
    }

    const rawBody = await secondRes.text();
    console.log("Raw body:", rawBody);
}

main().catch((err) => {
    console.error("Test client failed:", err);
});