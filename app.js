let provider;
let signer;
let stakingContract;
let tokenContract;
let userAddress;
let connected = false;

const stakingAddress = "0xDF499393474984A4EB94B868fC72c7a5D66d6d59";
const trcAddress = "0xc08983be707bf4b763e7A0f3cCAD3fd00af6620d";

// Replace with your staking ABI
const stakingABI = [ /* paste your ABI here */ ];
const tokenABI = [
  "function approve(address,uint256) returns(bool)"
];

// Utility
function updateStatus(msg){ document.getElementById("status").innerHTML = msg; }
function checkConnection(){ 
  if(!connected){ alert("Connect Wallet First"); return false; } 
  return true; 
}

// Connect Wallet
document.getElementById("connectBtn").onclick = async () => {
  if(!window.ethereum){ alert("Install MetaMask or Web3 Wallet"); return; }
  await ethereum.request({method:'eth_requestAccounts'});
  provider = new ethers.providers.Web3Provider(window.ethereum);
  signer = provider.getSigner();
  userAddress = await signer.getAddress();
  document.getElementById("wallet").innerText = "Connected: " + userAddress;
  stakingContract = new ethers.Contract(stakingAddress, stakingABI, signer);
  tokenContract = new ethers.Contract(trcAddress, tokenABI, signer);
  connected = true;
  updateStatus("Wallet Connected ✅");
  loadData();
}

// Approve TRC
document.getElementById("approveBtn").onclick = async () => {
  if(!checkConnection()) return;
  const amount = document.getElementById("approveAmount").value;
  if(!amount){ alert("Enter TRC amount"); return; }
  const value = ethers.utils.parseUnits(amount, 18);
  handleTx(tokenContract.approve(stakingAddress, value));
}

// Stake Function
async function stake(days){
  if(!checkConnection()) return;
  const amount = document.getElementById("stakeAmount").value;
  if(!amount){ alert("Enter TRC amount"); return; }
  const value = ethers.utils.parseUnits(amount, 18);
  let tx;
  if(days=='30') tx = stakingContract.stake30(value);
  else if(days=='60') tx = stakingContract.stake60(value);
  else if(days=='90') tx = stakingContract.stake90(value);
  else if(days=='150') tx = stakingContract.stake150(value);
  else if(days=='365') tx = stakingContract.stake365(value);
  handleTx(tx);
}

// Claim Reward
document.getElementById("claimBtn").onclick = async () => {
  if(!checkConnection()) return;
  handleTx(stakingContract.claimAll());
}

// Generic transaction handler
async function handleTx(txPromise){
  try{
    const tx = await txPromise;
    updateStatus(`Transaction Sent ✅ <br> Hash: <a href="https://polygonscan.com/tx/${tx.hash}" target="_blank">${tx.hash}</a>`);
    await tx.wait();
    updateStatus(`Transaction Confirmed ✅ <br> <a href="https://polygonscan.com/tx/${tx.hash}" target="_blank">View on PolygonScan</a>`);
    loadData();
  }catch(e){
    updateStatus("Transaction Failed ❌ " + e.message);
  }
}

// Load staking info
async function loadData(){
  if(!connected) return;
  try{
    const pending = await stakingContract.rewardPool(); // or use pendingReward per user
    document.getElementById("pendingReward").innerText = ethers.utils.formatUnits(pending,18);
    // TODO: fetch previous claimed history and next claim date
  }catch(e){ console.log(e); }
}
