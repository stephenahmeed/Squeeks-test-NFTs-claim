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
