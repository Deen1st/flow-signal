const { spawnSync } = require("child_process");

const serviceJson = JSON.stringify([
    {
        serviceName: "Flow Signal",
        serviceDescription:
            "Live BTC-USDT trading signal computed from order book imbalance, funding rate, open interest, and liquidation data. Returns BUY/SELL/NEUTRAL with confidence score and per-indicator breakdown.",
        serviceType: "A2MCP",
        fee: "0.02",
        endpoint: "https://flow-signal.onrender.com/signal",
    },
]);

const args = [
    "agent",
    "create",
    "--name",
    "Flow Signal",
    "--role",
    "asp",
    "--description",
    "Real-time multi-factor BTC-USDT market signal for AI trading agents, combining order book imbalance, funding rate, open interest, and liquidation flow into a single weighted Flow Score with BUY/SELL/NEUTRAL signal and confidence rating.",
    "--picture",
    "https://static.okx.com/cdn/web3/wallet/marketplace/headimages/agent/avatar/20a55a04-ec42-46fb-bbfa-1154ce7794ff.png",
    "--service",
    serviceJson,
];

console.log("Service JSON being sent:", serviceJson);
console.log("");

const ONCHAINOS_PATH = "C:\\Users\\sheri\\.local\\bin\\onchainos.exe";

const result = spawnSync(ONCHAINOS_PATH, args, {
    encoding: "utf-8",
    shell: false,
});

console.log("STDOUT:", result.stdout);
console.log("STDERR:", result.stderr);
console.log("Exit code:", result.status);

if (result.error) {
    console.error("Spawn error:", result.error);
}