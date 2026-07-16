const axios = require("axios");
const { setData } = require("./marketDataStore");

const REFRESH_INTERVAL_MS = 30 * 1000; // 30 seconds
const INST_ID = "BTC-USDT-SWAP";

async function fetchFundingRate() {
    try {
        const response = await axios.get(
            "https://www.okx.com/api/v5/public/funding-rate",
            { params: { instId: INST_ID } }
        );

        const data = response.data.data[0];
        const fundingRate = Number(data.fundingRate);

        let signal = "NEUTRAL";
        let score = 50;
        let reason = "Funding is balanced";

        if (fundingRate > 0.0005) {
            signal = "SELL";
            score = 30;
            reason = "Longs are paying a relatively high funding rate.";
        } else if (fundingRate < -0.0005) {
            signal = "BUY";
            score = 70;
            reason = "Shorts are paying a relatively high funding rate.";
        }

        setData("fundingRate", {
            source: "fundingRate",
            fundingRate,
            signal,
            score,
            reason,
        });

        console.log(`[fundingRateService] updated -> ${fundingRate} (${signal})`);
    } catch (err) {
        console.error("[fundingRateService] fetch failed:", err.message);

        // Only overwrite with "unknown" if we don't already have a cached value.
        const { getData } = require("./marketDataStore");
        if (!getData("fundingRate")) {
            setData("fundingRate", {
                source: "fundingRate",
                fundingRate: null,
                signal: "UNKNOWN",
                score: 50,
                reason: "Funding rate unavailable",
            });
        }
    }
}

function startFundingRateService() {
    fetchFundingRate(); // fetch immediately on startup
    setInterval(fetchFundingRate, REFRESH_INTERVAL_MS);
}

module.exports = startFundingRateService;