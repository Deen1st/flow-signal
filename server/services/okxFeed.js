const WebSocket = require("ws");
const { websocketUrl, instrument } = require("../config/okx");
const calculateSignal = require("./signalEngine");
const { setSignal } = require("../store/signalStore");

function connect() {
    console.log("Connecting to OKX...");

    const ws = new WebSocket(websocketUrl);

    ws.on("open", () => {
        console.log("Connected!");

        ws.send(
            JSON.stringify({
                op: "subscribe",
                args: [
                    {
                        channel: "books5",
                        instId: instrument,
                    },
                ],
            })
        );
    });

    ws.on("message", (message) => {
        const payload = JSON.parse(message);

        if (!payload.data) {
            return;
        }

        console.log("Market data received");

        const orderBook = payload.data[0];

        const signal = calculateSignal(orderBook);

        console.log("Signal generated:", signal);

        setSignal(signal);

        console.log("Signal saved");
    });

    ws.on("close", () => {
        console.log("Connection closed. Retrying in 5 seconds...");
        setTimeout(connect, 5000);
    });

    ws.on("error", (err) => {
        console.error("WebSocket error:", err.message);
    });
}

module.exports = connect;