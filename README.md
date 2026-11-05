# Squeekchain test NFT claim

Browser console script that claims your Community tier allowance on Sepolia when [sepolia.squeekchain.com/mint](https://sepolia.squeekchain.com/mint) fails because the site's own RPC is down.

This is the test distribution, not the production Genesis sale. Cost is 0 ETH plus Sepolia gas.

Allowances: Gold 6, Silver 4, Bronze / member / unranked 1.

## How to use

1. Open [https://sepolia.squeekchain.com/mint](https://sepolia.squeekchain.com/mint) and stay on that page. The session and CORS only work there.
2. In Rabby or MetaMask, switch to Sepolia and pick the wallet you linked on Genesis. You need a little Sepolia ETH for gas. Faucet: [https://faucet.quicknode.com/ethereum/sepolia](https://faucet.quicknode.com/ethereum/sepolia)
3. Press F12, open Console, type `allow pasting` if the browser asks, then paste the contents of `claim-test-nfts.js` and press Enter.
4. If you are not already signed in on that page, the wallet will first ask you to sign a login message. Then it will ask you to confirm the claim. Check three things: you are on Sepolia, the amount is 0 ETH, and the contract is the `authMinter` address printed in the console.
5. The console prints the transaction hash. Look it up on [Sepolia Etherscan](https://sepolia.etherscan.io).

## What it does

1. Uses your existing Genesis session on the mint page, or signs you in through Squeek's official community API.
2. Calls `GET /v1/community/mint/status` and `POST /v1/community/mint/authorization`.
3. Sends `claim(recipient, quantity, authorizationId, deadline, signature)` to the official auth minter.

If you see `signup_required` or `human_verification_failed`, finish Genesis sign-up first at [https://squeekchain.com/genesis](https://squeekchain.com/genesis). If you see `wrong wallet`, switch to the recipient address it prints.
