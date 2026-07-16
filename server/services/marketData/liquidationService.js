const WebSocket = require("ws");
const { setData } = require("./marketDataStore");

const WS_URL = "wss://ws.okx.com:8443/ws/v5/public";
const INST_TYPE = "SWAP";

const WINDOW_MS = 5 * 60 * 1000; // 5-minute rolling window
const RECOMPUTE_INTERVAL_MS = 10 * 1000; // recompute score every 10s

let recentLiquidations = []; // { side, size, timestamp }

function pruneOldEntries() {
    const cutoff = Date.now() - WINDOW_MS;
    recentLiquidations = recentLiquidations.filter((entry) => entry.timestamp > cutoff);
}

function recomputeScore() {
    pruneOldEntries();

    let longLiqVolume = 0;  // longs getting liquidated (forced sells)
    let shortLiqVolume = 0; // shorts getting liquidated (forced buys)

    for (const entry of recentLiquidations) {
        if (entry.side === "sell") {
            // a liquidation "sell" order means a long position was force-closed
            longLiqVolume += entry.size;
        } else if (entry.side === "buy") {
            // a liquidation "buy" order means a short position was force-closed
            shortLiqVolume += entry.size;
        }
    }

    const total = longLiqVolume + shortLiqVolume;

    let signal = "NEUTRAL";
    let score = 50;
    let reason = "No significant liquidation activity";

    if (total > 0) {
        const shortLiqRatio = shortLiqVolume / total;

        // Heavy short liquidations = shorts getting squeezed = often fuels further upside
        // Heavy long liquidations = longs getting flushed = often fuels further downside
        if (shortLiqRatio > 0.65) {
            signal = "BUY";
            score = 70;
            reason = "Short liquidations dominate — potential short squeeze pressure";
        } else if (shortLiqRatio < 0.35) {
            signal = "SELL";
            score = 30;
            reason = "Long liquidations dominate — potential cascade pressure";
        } else {
            reason = "Liquidations roughly balanced between longs and shorts";
        }
    }

    setData("liquidations", {
        source: "liquidations",
        longLiqVolume: Number(longLiqVolume.toFixed(4)),
        shortLiqVolume: Number(shortLiqVolume.toFixed(4)),
        signal,
        score,
        reason,
    });

    console.log(
        `[liquidationService] window update -> long: ${longLiqVolume.toFixed(2)}, short: ${shortLiqVolume.toFixed(2)} (${signal})`
    );
}

function connect() {
    console.log("[liquidationService] Connecting to OKX...");

    const ws = new WebSocket(WS_URL);

    ws.on("open", () => {
        console.log("[liquidationService] Connected!");

        ws.send(
            JSON.stringify({
                op: "subscribe",
                args: [
                    {
                        channel: "liquidation-orders",
                        instType: INST_TYPE,
                    },
                ],
            })
        );
    });

    ws.on("message", (message) => {
        const payload = JSON.parse(message);

        if (!payload.data) return; // ignore subscribe acks

        for (const item of payload.data) {
            // item.details is an array of individual liquidation fills
            if (!item.details) continue;

            for (const detail of item.details) {
                recentLiquidations.push({
                    side: detail.side, // "buy" or "sell"
                    size: Number(detail.sz),
                    timestamp: Number(detail.ts),
                });
            }
        }
    });

    ws.on("close", () => {
        console.log("[liquidationService] Disconnected. Retrying in 5 seconds...");
        setTimeout(connect, 5000);
    });

    ws.on("error", (err) => {
        console.error("[liquidationService] WebSocket error:", err.message);
    });
}

function startLiquidationService() {
    // seed a neutral value immediately so /signal doesn't show "waiting" forever
    setData("liquidations", {
        source: "liquidations",
        longLiqVolume: 0,
        shortLiqVolume: 0,
        signal: "NEUTRAL",
        score: 50,
        reason: "Gathering liquidation data",
    });

    connect();
    setInterval(recomputeScore, RECOMPUTE_INTERVAL_MS);
}

module.exports = startLiquidationService;