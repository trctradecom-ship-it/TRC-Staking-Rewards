// Global variables
let provider;
let signer;
let referralContract;
let tokenContract;
let connected = false;

const referralAddress = "0xDF499393474984A4EB94B868fC72c7a5D66d6d59"; // Your staking contract
const tokenAddress = "0xc08983be707bf4b763e7A0f3cCAD3fd00af6620d"; // TRC token

// Replace with your actual ABIs
const referralABI = [
  "function register(address _ref) public",
  "function joinLevel1() public",
  "function joinLevel2() public",
  "function joinLevel3() public",
  "function joinLevel4() public",
  "function joinLevel5() public",
  "function joinLevel6() public",
  "function claimReward() public",
  "function pendingReward(address user) view returns(uint256)"
];
const tokenABI = [
  "function approve(address spender, uint256 amount) public returns(bool)"
];

// Status update helper
function updateStatus(msg){
  document.getElementById("status").innerHTML = msg;
}

// Check if wallet is connected
function checkConnection(){
  if(!connected){
    alert("Connect Wallet First");
    return false;
  }
  return true;
}

// Connect wallet
async function connectWallet(){
  try {
    if(!window.ethereum){
      alert("Install MetaMask or a Web3 Wallet");
      return;
    }

    // Request accounts
    await ethereum.request({ method: 'eth_requestAccounts' });

    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();
    const address = await signer.getAddress();

    document.getElementById("wallet").innerText = "Connected: " + address;

    // Initialize contracts
    referralContract = new ethers.Contract(referralAddress, referralABI, signer);
    tokenContract = new ethers.Contract(tokenAddress, tokenABI, signer);

    connected = true;
    updateStatus("Wallet Connected ✅");
  } catch (err) {
    console.error(err);
    alert("Connection Failed: " + err.message);
  }
}

// Handle transactions
async function handleTransaction(txPromise){
  try {
    const tx = await txPromise;

    updateStatus(`
      Transaction Sent ✅<br>
      Hash: <a target="_blank" href="https://polygonscan.com/tx/${tx.hash}">${tx.hash}</a><br>
      Waiting for confirmation...
    `);

    await tx.wait();

    updateStatus(`
      Transaction Confirmed ✅<br>
      <a target="_blank" href="https://polygonscan.com/tx/${tx.hash}">View on PolygonScan</a>
    `);

  } catch(error){
    console.error(error);
    updateStatus("Error ❌ " + error.message);
  }
}

// Example: Register user with referral
async function registerUser(){
  if(!checkConnection()) return;

  const ref = document.getElementById("refAddress").value;

  if(!ethers.utils.isAddress(ref)){
    alert("Invalid Address");
    return;
  }

  await handleTransaction(referralContract.register(ref));
}

// Example: Approve TRC token for staking
async function approveTRC(){
  if(!checkConnection()) return;

  const amount = document.getElementById("approveAmount").value;
  const value = ethers.utils.parseUnits(amount, 18);

  await handleTransaction(tokenContract.approve(referralAddress, value));
}

// Example: Claim reward
async function claimReward(){
  if(!checkConnection()) return;
  await handleTransaction(referralContract.claimReward());
}
