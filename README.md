# Flow Signal

**Flow Signal** is a real-time, multi-factor market intelligence API for BTC-USDT, built as an **Agent Service Provider (ASP)** on the OKX.AI Agent-to-MCP (A2MCP) network. It's designed to be consumed by AI trading agents - not humans - and is monetized per-request using the OKX x402 Agent Payment Protocol, settled in USDC on X Layer.

Instead of giving away raw market data, Flow Signal fuses four independent OKX data sources into a single weighted **Flow Score**, and sells access to that score on a pay-per-call basis.

## What it does

On every request, Flow Signal returns a live `BUY` / `SELL` / `NEUTRAL` signal for BTC-USDT, along with a confidence score and a breakdown of the underlying indicators:

```json
{
  "pair": "BTC-USDT",
  "signal": "BUY",
  "flowScore": 72,
  "indicators": {
    "orderBook": {
      "score": 78,
      "confidence": 74,
      "imbalance": 0.86,
      "bidVolume": 2.15,
      "askVolume": 0.35,
      "reason": "Bid liquidity dominates ask liquidity"
    },
    "fundingRate": {
      "score": 65,
      "fundingRate": -0.0003,
      "signal": "BUY",
      "reason": "Shorts are paying a relatively high funding rate."
    },
    "openInterest": {
      "score": 65,
      "openInterest": 48213,
      "percentChange": 1.42,
      "signal": "BUY",
      "reason": "Open interest rising — new positions entering the market"
    },
    "liquidations": {
      "score": 70,
      "longLiqVolume": 1.2,
      "shortLiqVolume": 4.8,
      "signal": "BUY",
      "reason": "Short liquidations dominate — potential short squeeze pressure"
    }
  },
  "timestamp": "2026-07-16T12:15:10.153Z"
}
```

The endpoint is protected by the x402 payment protocol - every request without a valid payment receives an HTTP `402 Payment Required` response with the price and payment details. Agents attach a signed payment authorization and retry; on success, the signal is returned and payment is settled on-chain in the same round trip.

## Why a composite signal instead of raw data

A single indicator (like order book imbalance alone) is noisy and short-lived - often stale within seconds. Flow Signal combines four signals with different time horizons into one score:

| Indicator | Weight | Update frequency | What it captures |
|---|---|---|---|
| Order book imbalance | 40% | Real-time (WebSocket) | Short-term liquidity pressure |
| Funding rate | 20% | ~30s | Derivatives market sentiment |
| Open interest trend | 20% | ~30s | Position buildup / unwind |
| Liquidations | 20% | Real-time (WebSocket), 5-min rolling window | Forced-close cascades / squeeze pressure |

This is intentionally transparent, simple math - not a black-box model - so any agent (or human) consuming the signal can understand exactly why a given score was produced.

## Tech stack

- **Backend:** Node.js, Express
- **Real-time data:** OKX public WebSocket API (order book, liquidations)
- **Market data:** OKX public REST API (funding rate, open interest)
- **Payments:** OKX x402 Agent Payment Protocol (`@okxweb3/x402-express`, `@okxweb3/x402-core`, `@okxweb3/x402-evm`)
- **Settlement network:** X Layer (`eip155:196`), gas-subsidized
- **Wallet:** OKX Agentic Wallet (TEE-secured, non-custodial)
- **Registration:** OKX OnchainOS CLI (`onchainos`)
- **Deployment:** Render

## Architecture

```
OKX WebSocket (order book, liquidations)
                │
                ▼
      Market Data Ingestion
                │
     ┌──────────┴──────────┐
     ▼                     ▼
Order Book Indicator   Liquidation Service (5-min rolling window)
     │                     │
     │    Funding Rate Service (30s poll)
     │                     │
     │    Open Interest Service (30s poll)
     │                     │
     └─────────┬───────────┘
               ▼
        Flow Score Engine
      (weighted combination)
               │
               ▼
      x402-Protected /signal
               │
     402 Payment Required
               │
   Agent signs & submits payment
               │
       Verified & settled
        via OKX Facilitator
               │
               ▼
        Live Flow Signal
          (200 OK)
```

Slower-moving data (funding rate, open interest) is cached in an in-memory market data store and refreshed on independent intervals, rather than being fetched on every request - this keeps the `/signal` endpoint fast (memory reads only) and avoids hammering OKX's REST API.

## Project structure

```
server/
├── config/
│   └── okx.js                    # WebSocket URL, instrument config
├── routes/
│   └── signal.js                 # GET /signal route
├── services/
│   ├── okxFeed.js                # OKX WebSocket connection (order book)
│   ├── signalEngine.js           # Combines all indicators into a Flow Score
│   ├── paymentGateway.js         # x402 payment middleware configuration
│   ├── indicators/
│   │   ├── orderBook.js          # Order book imbalance analysis
│   │   └── flowScore.js          # Weighted score combiner
│   └── marketData/
│       ├── marketDataStore.js    # Generic in-memory key-value cache
│       ├── fundingRateService.js # Funding rate polling (30s)
│       ├── openInterestService.js# Open interest polling + trend (30s)
│       └── liquidationService.js # Liquidation WebSocket + rolling window
├── store/
│   └── signalStore.js            # Latest order-book-derived signal
├── index.js                      # Express app entry point
└── package.json
```

## Running locally

**Requirements:** Node.js 18+, an OKX Agentic Wallet, and OKX Web3/OnchainOS API credentials.

```bash
cd server
npm install
```

Create a `.env` file in `server/`:

```
PORT=5000
OKX_WS_URL=wss://ws.okx.com:8443/ws/v5/public
OKX_SYMBOL=BTC-USDT
PAY_TO_ADDRESS=your-agentic-wallet-address
OKX_API_KEY=your-okx-web3-api-key
OKX_SECRET_KEY=your-okx-web3-secret-key
OKX_PASSPHRASE=your-okx-web3-passphrase
```

Run it:

```bash
node index.js
```

The server starts polling funding rate and open interest, connects to the OKX order book and liquidation WebSocket feeds, and exposes `GET /signal` on the configured port.

> **Note:** OKX's public APIs may be inaccessible from certain networks/regions without a VPN.

## Testing the payment flow

`test-client.js` is included as a **reference implementation** of a paying agent — useful both for testing this service and as an example of how to consume any x402-protected endpoint in general. It requests `/signal`, receives the `402`, builds and signs a payment authorization with the OKX x402 client SDK, and retries with the signed payload attached.

```bash
node test-client.js
```

To run it, you'll need your own EVM wallet with a small amount of USDC on X Layer, referenced via a `TEST_BUYER_PRIVATE_KEY` variable in `.env`. This is intentionally a separate key from your Agentic Wallet (whose key can't be exported, by design) — generate one with any EVM wallet tool, fund it lightly, and use it purely for testing.

**Never commit a real private key to `.env` or the repository.** The `.gitignore` already excludes `.env`; keep it that way.

## Live endpoint

A live instance is deployed at:

```
https://flow-signal.onrender.com/signal
```

Hitting this without a valid payment returns `402 Payment Required` with the current price and payment details. Two things to know before testing against it:

- **Cold starts:** this runs on Render's free tier, which spins down after inactivity. The first request after idle time can take 50+ seconds to respond while the instance wakes up.
- **Pricing:** the price currently set on this deployment is a low placeholder used during development/testing, not a finalized production price. Don't treat it as the intended long-term cost per call.

## Deployment

Deployed on Render as a Node web service, with root directory `server`, build command `npm install`, and start command `node index.js`. All secrets are set as environment variables in the Render dashboard rather than committed to the repository.

## ASP registration

Registered on the OKX.AI Agent Marketplace as an A2MCP service via the `onchainos` CLI (`agent create` / `agent activate`), priced per call and paid in USDC on X Layer.

## Disclaimer

The underlying indicators — particularly the open-interest trend heuristic — are intentionally simplified for transparency and easy interpretability, and are not intended as financial advice or a standalone trading strategy. Signals are short-lived by nature (seconds to minutes) and should be treated as one input among several, not a complete system on their own.

## Status / Roadmap

This project is under active development. Planned next steps include:

- Support for additional trading pairs (e.g. ETH-USDT)
- More robust production error handling and monitoring
- A more rigorous open-interest model that accounts for price direction alongside OI change, rather than OI change alone
- Tiered pricing (e.g. a lower-cost basic signal vs. a full multi-indicator signal)
