const analyzeOrderBook = require("./indicators/orderBook");
const calculateFlowScore = require("./indicators/flowScore");
const { getData } = require("./marketData/marketDataStore");

function calculateSignal(orderBook) {
    const orderBookIndicator = analyzeOrderBook(orderBook);

    const cachedFunding = getData("fundingRate");
    const fundingIndicator = cachedFunding
        ? cachedFunding.value
        : {
            source: "fundingRate",
            fundingRate: null,
            signal: "UNKNOWN",
            score: 50,
            reason: "Waiting for first funding rate refresh",
        };

    const cachedOI = getData("openInterest");
    const oiIndicator = cachedOI
        ? cachedOI.value
        : {
            source: "openInterest",
            openInterest: null,
            percentChange: null,
            signal: "UNKNOWN",
            score: 50,
            reason: "Waiting for first open interest refresh",
        };

    const cachedLiq = getData("liquidations");
    const liqIndicator = cachedLiq
        ? cachedLiq.value
        : {
            source: "liquidations",
            longLiqVolume: 0,
            shortLiqVolume: 0,
            signal: "UNKNOWN",
            score: 50,
            reason: "Waiting for liquidation data",
        };

    const indicators = {
        orderBook: orderBookIndicator,
        fundingRate: fundingIndicator,
        openInterest: oiIndicator,
        liquidations: liqIndicator,
    };

    const flow = calculateFlowScore(indicators);

    return {
        pair: "BTC-USDT",
        signal: flow.signal,
        flowScore: flow.flowScore,

        indicators: {
            orderBook: {
                score: orderBookIndicator.score,
                confidence: orderBookIndicator.confidence,
                imbalance: Number(orderBookIndicator.imbalance.toFixed(4)),
                bidVolume: Number(orderBookIndicator.bidVolume.toFixed(4)),
                askVolume: Number(orderBookIndicator.askVolume.toFixed(4)),
                reason: orderBookIndicator.reason,
            },

            fundingRate: {
                score: fundingIndicator.score,
                fundingRate: fundingIndicator.fundingRate,
                signal: fundingIndicator.signal,
                reason: fundingIndicator.reason,
            },

            openInterest: {
                score: oiIndicator.score,
                openInterest: oiIndicator.openInterest,
                percentChange: oiIndicator.percentChange,
                signal: oiIndicator.signal,
                reason: oiIndicator.reason,
            },

            liquidations: {
                score: liqIndicator.score,
                longLiqVolume: liqIndicator.longLiqVolume,
                shortLiqVolume: liqIndicator.shortLiqVolume,
                signal: liqIndicator.signal,
                reason: liqIndicator.reason,
            },
        },

        timestamp: new Date().toISOString(),
    };
}

module.exports = calculateSignal;