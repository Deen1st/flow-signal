const router = require("express").Router();

const { getSignal } = require("../store/signalStore");

router.get("/", (req, res) => {
    const signal = getSignal();

    if (!signal) {
        return res.json({
            status: "waiting",
            message: "Waiting for market data...",
        });
    }

    res.json(signal);
});

module.exports = router;