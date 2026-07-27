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

try {
    app.use(buildPaymentMiddleware());
    console.log("Payment middleware enabled.");
} catch (err) {
    console.error("Payment middleware failed:", err.message);
    console.error("Server will continue without payment protection.");
}

app.use("/signal", signalRoutes);

const PORT = process.env.PORT || 5000;

startFundingRateService();
startOpenInterestService();
startLiquidationService();
startFeed();

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});