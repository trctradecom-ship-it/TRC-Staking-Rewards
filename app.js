let provider;
let signer;
let stakingContract;
let tokenContract;
let connected = false;
 
// Contracts
const stakingAddress = "0xDF499393474984A4EB94B868fC72c7a5D66d6d59";
const trcAddress = "0xc08983be707bf4b763e7A0f3cCAD3fd00af6620d";

const stakingABI = [ /* your full ABI JSON pasted here */ ];

const tokenABI = [
  "function approve(address spender, uint256 amount) public returns(bool)"
];

// Update Status
function updateStatus(msg){
  document.getElementById("status").innerHTML = msg;
}

// Check Wallet
function checkConnection(){
  if(!connected){
    alert("Connect Wallet First");
    return false;
  }
  return true;
}

// Connect Wallet
async function connectWallet(){
  try{
    if(!window.ethereum){
      alert("Install MetaMask or compatible wallet");
      return;
    }

    await ethereum.request({method:'eth_requestAccounts'});
    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();
    const address = await signer.getAddress();
    document.getElementById("wallet").innerText = "Connected: " + address;

    stakingContract = new ethers.Contract(stakingAddress, stakingABI, signer);
    tokenContract = new ethers.Contract(trcAddress, tokenABI, signer);

    connected = true;
    updateStatus("Wallet Connected ✅");

    startClaimTimer();
  } catch(e){
    console.error(e);
    alert("Connection Failed: " + e.message);
  }
}

// Approve TRC
async function approveTRC(){
  if(!checkConnection()) return;
  const amount = document.getElementById("approveAmount").value;
  if(!amount) return alert("Enter amount to approve");
  const value = ethers.utils.parseUnits(amount,18);
  await handleTransaction(tokenContract.approve(stakingAddress, value));
}

// Stake
async function stake(days){
  if(!checkConnection()) return;
  const amount = prompt(`Enter TRC amount to stake for ${days} days`);
  if(!amount) return;
  const value = ethers.utils.parseUnits(amount,18);
  let tx;
  if(days === '30') tx = stakingContract.stake30(value);
  else if(days === '60') tx = stakingContract.stake60(value);
  else if(days === '90') tx = stakingContract.stake90(value);
  else if(days === '150') tx = stakingContract.stake150(value);
  else if(days === '365') tx = stakingContract.stake365(value);
  await handleTransaction(tx);
}

// Claim All Rewards
async function claimAll(){
  if(!checkConnection()) return;
  await handleTransaction(stakingContract.claimAll());
}

// Generic Transaction Handler
async function handleTransaction(txPromise){
  try{
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
  } catch(e){
    console.error(e);
    updateStatus("Error ❌ " + e.message);
  }
}

// Claim Countdown Timer
function startClaimTimer(){
  setInterval(async ()=>{
    if(!connected) return;
    try{
      const stakeCount = await stakingContract.getUserStakeCount(await signer.getAddress());
      if(stakeCount > 0){
        const stakeInfo = await stakingContract.getStakeInfo(await signer.getAddress(),0);
        const nextClaim = stakeInfo.lastClaimTime + 7*24*60*60; // example 7 days
        const remaining = nextClaim - Math.floor(Date.now()/1000);
        if(remaining>0){
          const d = Math.floor(remaining/86400);
          const h = Math.floor((remaining%86400)/3600);
          const m = Math.floor((remaining%3600)/60);
          const s = remaining%60;
          document.getElementById("nextClaim").innerText =
            `Next Claim: ${d}d ${h}h ${m}m ${s}s`;
        } else {
          document.getElementById("nextClaim").innerText = `Next Claim: Available ✅`;
        }
      }
    } catch(e){ console.error(e); }
  },1000);
}

// Event listeners
document.getElementById("connectWalletBtn").addEventListener("click", connectWallet);
document.getElementById("approveBtn").addEventListener("click", approveTRC);
document.getElementById("claimBtn").addEventListener("click", claimAll);
