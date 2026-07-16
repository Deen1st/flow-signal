const { generatePrivateKey, privateKeyToAccount } = require("viem/accounts");

const privateKey = generatePrivateKey();
const account = privateKeyToAccount(privateKey);

console.log("Private key (save this, keep secret):", privateKey);
console.log("Address (fund this with test USDC on X Layer):", account.address);