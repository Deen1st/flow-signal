const express = require("express");
const cors = require("cors");
const startFeed = require("./services/okxFeed");
const startFundingRateService = require("./services/marketData/fundingRateService");
const startOpenInterestService = require("./services/marketData/openInterestService");
const startLiquidationService = require("./services/marketData/liquidationService");
const buildPaymentMiddleware = require("./services/paymentGateway");

const signalRoutes = require("./routes/signal");

const app = express();

app.use(cors());
app.use(express.json());

// Payment gate — must come BEFORE the route it protects
app.use(buildPaymentMiddleware());

app.use("/signal", signalRoutes);

const PORT = process.env.PORT || 5000;

startFundingRateService();
startOpenInterestService();
startLiquidationService();
startFeed();

let paymentMiddlewareReady = false;

try {
    app.use(buildPaymentMiddleware());
    paymentMiddlewareReady = true;
} catch (err) {
    console.error("Payment middleware failed to initialize:", err.message);
    console.error("Server will continue WITHOUT payment protection on /signal.");
}

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});