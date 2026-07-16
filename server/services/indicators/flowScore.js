function calculateFlowScore(indicators) {
    const weights = {
        orderBook: 0.4,
        fundingRate: 0.2,
        openInterest: 0.2,
        liquidations: 0.2,
    };

    let weightedScore = 0;

    for (const [key, indicator] of Object.entries(indicators)) {
        if (!weights[key]) continue;

        weightedScore += indicator.score * weights[key];
    }

    const flowScore = Math.round(weightedScore);

    let signal = "NEUTRAL";

    if (flowScore >= 80) {
        signal = "STRONG BUY";
    } else if (flowScore >= 60) {
        signal = "BUY";
    } else if (flowScore >= 40) {
        signal = "NEUTRAL";
    } else if (flowScore >= 20) {
        signal = "SELL";
    } else {
        signal = "STRONG SELL";
    }

    return {
        flowScore,
        signal,
    };
}

module.exports = calculateFlowScore;