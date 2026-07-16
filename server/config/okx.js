require("dotenv").config();

module.exports = {
    websocketUrl: process.env.OKX_WS_URL,
    instrument: process.env.OKX_SYMBOL,
};