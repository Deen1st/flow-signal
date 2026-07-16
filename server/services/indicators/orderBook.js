function analyzeOrderBook(orderBook) {
    const bids = orderBook.bids;
    const asks = orderBook.asks;

    let bidVolume = 0;
    let askVolume = 0;

    for (const [, size] of bids) {
        bidVolume += Number(size);
    }

    for (const [, size] of asks) {
        askVolume += Number(size);
    }

    const imbalance = bidVolume / (bidVolume + askVolume);

    let signal = "NEUTRAL";

    if (imbalance > 0.60) {
        signal = "BUY";
    } else if (imbalance < 0.40) {
        signal = "SELL";
    }

    const confidence = Math.round(Math.abs(imbalance - 0.5) * 200);
    const score = confidence;
    let reason = "Balanced order book";

    if (signal === "BUY") {
        reason = "Bid liquidity dominates ask liquidity";
    }

    if (signal === "SELL") {
        reason = "Ask liquidity dominates bid liquidity";
    }

    return {
        source: "orderBook",
        score,
        confidence,
        signal,
        imbalance,
        bidVolume,
        askVolume,
        reason,
    };
}

module.exports = analyzeOrderBook;