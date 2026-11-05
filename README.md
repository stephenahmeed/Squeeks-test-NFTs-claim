# Squeekchain test NFT claim

Browser console script that claims your Community tier allowance on Sepolia when [sepolia.squeekchain.com/mint](https://sepolia.squeekchain.com/mint) fails because the site's own RPC is down.

This is the test distribution, not the production Genesis sale. Cost is 0 ETH plus Sepolia gas.

Allowances: Gold 6, Silver 4, Bronze / member / unranked 1.

## Video guide

https://x.com/0xStephen_/status/2118278002723500539

## How to use

1. Open [https://sepolia.squeekchain.com/mint](https://sepolia.squeekchain.com/mint) and stay on that page. The session and CORS only work there.
2. In Rabby or MetaMask, switch to Sepolia and pick the wallet you linked on Genesis. You need a little Sepolia ETH for gas. Faucet: [https://faucet.quicknode.com/ethereum/sepolia](https://faucet.quicknode.com/ethereum/sepolia)
3. Press F12, open Console, and type `allow pasting` if the browser asks. On this page, click the copy button on the script below, paste it into the console, and press Enter.
4. If you are not already signed in on that page, the wallet will first ask you to sign a login message. Then it will ask you to confirm the claim. Check three things: you are on Sepolia, the amount is 0 ETH, and the contract is the `authMinter` address printed in the console.
5. The console prints the transaction hash. Look it up on [Sepolia Etherscan](https://sepolia.etherscan.io).

## Copy the script

Click the copy icon on the top right of this block, then paste it into the browser console on the mint page.

```javascript
// Squeekchain Sepolia test NFT claim
// Run this in the browser console on https://sepolia.squeekchain.com/mint
// Uses the official community API, then sends claim() through your injected wallet (Rabby / MetaMask).
// Cost is 0 ETH plus Sepolia gas. This is the test distribution, not the production Genesis sale.

(async () => {
  const API = 'https://community.squeekchain.com/v1/community';
  const SEPOLIA = 11155111;
  if (!window.ethereum) throw new Error('No injected wallet found');
  try {
    await ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0xaa36a7' }] });
  } catch (e) {
    if (e.code !== 4902) throw e;
    await ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: '0xaa36a7',
        chainName: 'Sepolia',
        nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
        rpcUrls: ['https://ethereum-sepolia-rpc.publicnode.com'],
        blockExplorerUrls: ['https://sepolia.etherscan.io']
      }]
    });
  }
  const [me] = await ethereum.request({ method: 'eth_requestAccounts' });
  const addr = me.toLowerCase();
  const api = async (path, { method = 'GET', token, body } = {}) => {
    const headers = { 'content-type': 'application/json' };
    if (token) headers.authorization = 'Bearer ' + token;
    const res = await fetch(API + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: 'omit',
      cache: 'no-store'
    });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch {}
    if (!res.ok) throw new Error((data && data.error) || String(res.status));
    return data;
  };
  let session = null;
  try { session = JSON.parse(localStorage.getItem('squeek.community.session') || 'null'); } catch {}
  if (session && Date.parse(session.expiresAt) <= Date.now()) session = null;
  if (!session || !session.token) {
    const ch = await api('/auth/challenge', { method: 'POST', body: { address: addr, chainId: SEPOLIA } });
    const signature = await ethereum.request({ method: 'personal_sign', params: [ch.message, addr] });
    session = await api('/auth/verify', { method: 'POST', body: { nonce: ch.nonce, signature } });
    localStorage.setItem('squeek.community.session', JSON.stringify({ token: session.token, expiresAt: session.expiresAt }));
    localStorage.setItem('squeek.community.signedInBefore', '1');
  }
  const status = await api('/mint/status', { token: session.token });
  console.log('mint status', status);
  if (!status.claimsOpen) throw new Error('claims are not open');
  if (!status.recipient) throw new Error('no eligible recipient, link a sepolia wallet in genesis');
  if (status.recipient.toLowerCase() !== addr) throw new Error('wrong wallet, connect ' + status.recipient);
  if (!status.available) throw new Error('nothing left to claim, already ' + status.claimed + '/' + status.allowance);
  const fresh = (a) =>
    a &&
    a.chainId === SEPOLIA &&
    a.recipient.toLowerCase() === addr &&
    BigInt(a.deadline) > BigInt(Math.floor(Date.now() / 1000)) &&
    Date.parse(a.expiresAt) > Date.now();
  const auth = fresh(status.authorization)
    ? status.authorization
    : await api('/mint/authorization', { method: 'POST', token: session.token, body: {} });
  console.log('authorization', auth);
  if (auth.recipient.toLowerCase() !== addr) throw new Error('authorization recipient mismatch');
  const pad = (h) => h.replace(/^0x/, '').toLowerCase().padStart(64, '0');
  const sig = auth.signature.replace(/^0x/, '').toLowerCase();
  const data =
    '0x3374b3df' +
    pad(auth.recipient) +
    pad(BigInt(auth.quantity).toString(16)) +
    pad(auth.authorizationId) +
    pad(BigInt(auth.deadline).toString(16)) +
    pad('a0') +
    pad((sig.length / 2).toString(16)) +
    sig.padEnd(Math.ceil(sig.length / 64) * 64, '0');
  console.log('etherscan write contract', {
    to: auth.authMinter,
    recipient: auth.recipient,
    quantity: auth.quantity,
    authorizationId: auth.authorizationId,
    deadline: auth.deadline,
    signature: auth.signature
  });
  const hash = await ethereum.request({
    method: 'eth_sendTransaction',
    params: [{ from: me, to: auth.authMinter, value: '0x0', data }]
  });
  console.log('claim tx', hash);
  return hash;
})();
```

The same script is also in [`claim-test-nfts.js`](claim-test-nfts.js).

## What it does

1. Uses your existing Genesis session on the mint page, or signs you in through Squeek's official community API.
2. Calls `GET /v1/community/mint/status` and `POST /v1/community/mint/authorization`.
3. Sends `claim(recipient, quantity, authorizationId, deadline, signature)` to the official auth minter.

If you see `signup_required` or `human_verification_failed`, finish Genesis sign-up first at [https://squeekchain.com/genesis](https://squeekchain.com/genesis). If you see `wrong wallet`, switch to the recipient address it prints.
