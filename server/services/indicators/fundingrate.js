const axios = require("axios");

async function analyzeFundingRate() {
    try {
        const response = await axios.get(
            "https://www.okx.com/api/v5/public/funding-rate",
            {
                params: {
                    instId: "BTC-USDT-SWAP",
                },
            }
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

        return {
            source: "fundingRate",
            fundingRate,
            signal,
            score,
            reason,
        };
    } catch (err) {
        console.error("Funding rate error:", err.message);

        return {
            source: "fundingRate",
            fundingRate: null,
            signal: "UNKNOWN",
            score: 50,
            reason: "Funding rate unavailable",
        };
    }
}

module.exports = analyzeFundingRate;