const axios = require("axios");
const { setData } = require("./marketDataStore");

const REFRESH_INTERVAL_MS = 30 * 1000; // 30 seconds
const INST_ID = "BTC-USDT-SWAP";
const HISTORY_SIZE = 10; // keep last 10 readings (~5 minutes at 30s interval)

let history = [];

async function fetchOpenInterest() {
    try {
        const response = await axios.get(
            "https://www.okx.com/api/v5/public/open-interest",
            { params: { instId: INST_ID } }
        );

        const data = response.data.data[0];
        const oi = Number(data.oi); // open interest in contracts

        history.push(oi);
        if (history.length > HISTORY_SIZE) {
            history.shift();
        }

        const result = analyzeOpenInterest(history, oi);

        setData("openInterest", result);

        console.log(`[openInterestService] updated -> ${oi} (${result.signal})`);
    } catch (err) {
        console.error("[openInterestService] fetch failed:", err.message);

        const { getData } = require("./marketDataStore");
        if (!getData("openInterest")) {
            setData("openInterest", {
                source: "openInterest",
                openInterest: null,
                percentChange: null,
                signal: "UNKNOWN",
                score: 50,
                reason: "Open interest unavailable",
            });
        }
    }
}

function analyzeOpenInterest(history, latestOi) {
    // Not enough data yet to detect a trend
    if (history.length < 3) {
        return {
            source: "openInterest",
            openInterest: latestOi,
            percentChange: 0,
            signal: "NEUTRAL",
            score: 50,
            reason: "Gathering open interest history",
        };
    }

    const oldest = history[0];
    const percentChange = ((latestOi - oldest) / oldest) * 100;

    // Open interest rising = fresh positions entering = trend more likely to continue
    // Open interest falling = positions closing = trend more likely exhausted/reversing
    let signal = "NEUTRAL";
    let score = 50;
    let reason = "Open interest roughly flat";

    if (percentChange > 1) {
        signal = "BUY";
        score = 65;
        reason = "Open interest rising — new positions entering the market";
    } else if (percentChange < -1) {
        signal = "SELL";
        score = 35;
        reason = "Open interest falling — positions being closed";
    }

    return {
        source: "openInterest",
        openInterest: latestOi,
        percentChange: Number(percentChange.toFixed(3)),
        signal,
        score,
        reason,
    };
}

function startOpenInterestService() {
    fetchOpenInterest(); // fetch immediately on startup
    setInterval(fetchOpenInterest, REFRESH_INTERVAL_MS);
}

module.exports = startOpenInterestService;