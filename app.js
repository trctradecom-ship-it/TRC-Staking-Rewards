let provider;
let signer;
let stakingContract;
let tokenContract;

const stakingAddress = "0xDF499393474984A4EB94B868fC72c7a5D66d6d59";
const tokenAddress = "0xc08983be707bf4b763e7A0f3cCAD3fd00af6620d";

const REQUIRED_CHAIN = "0x89"; // Polygon

const stakingABI = [
"function stake30(uint256)",
"function stake60(uint256)",
"function stake90(uint256)",
"function stake150(uint256)",
"function stake365(uint256)",
"function claimAll()",
"function pendingReward(address,uint256) view returns(uint256)",
"function getUserStakeCount(address) view returns(uint256)",
"function getStakeInfo(address,uint256) view returns(uint256,uint256,uint256,uint256,uint256,bool)"
];

const tokenABI = [
"function approve(address,uint256)",
"function balanceOf(address) view returns(uint256)"
];

let claimHistory = [];
let connected = false;

// ================= STATUS =================
function status(msg){
document.getElementById("status").innerText = msg;
}

function checkConnection(){
if(!connected){
alert("Connect Wallet First");
return false;
}
return true;
}

// ================= CONNECT =================
async function connectWallet(){
try{

status("Connecting wallet...");

// wallet check
if(typeof window.ethereum === "undefined"){
alert("Open in MetaMask / Trust Wallet / TokenPocket");
return;
}

// request account
const accounts = await window.ethereum.request({
method: "eth_requestAccounts"
});

// switch network FIRST
try{
await window.ethereum.request({
method: "wallet_switchEthereumChain",
params: [{ chainId: REQUIRED_CHAIN }]
});
}catch(err){
if(err.code === 4902){
await window.ethereum.request({
method: "wallet_addEthereumChain",
params: [{
chainId: REQUIRED_CHAIN,
chainName: "Polygon Mainnet",
nativeCurrency:{name:"MATIC",symbol:"MATIC",decimals:18},
rpcUrls:["https://polygon-rpc.com"],
blockExplorerUrls:["https://polygonscan.com"]
}]
});
}else{
throw err;
}
}

// provider AFTER switch
provider = new ethers.providers.Web3Provider(window.ethereum);
signer = provider.getSigner();

// address
const address = accounts[0];
document.getElementById("wallet").innerText = address;

// contracts
stakingContract = new ethers.Contract(stakingAddress, stakingABI, signer);
tokenContract = new ethers.Contract(tokenAddress, tokenABI, signer);

connected = true;

status("Wallet Connected ✅");

// load data
await loadBalance();
await loadStakes();

}catch(err){
console.error(err);
status("Error ❌ " + err.message);
}
}

// ================= BALANCE =================
async function loadBalance(){
const user = await signer.getAddress();
const bal = await tokenContract.balanceOf(user);

document.getElementById("balance").innerText =
parseFloat(ethers.utils.formatUnits(bal,18)).toFixed(4);
}

// ================= APPROVE =================
async function approveTRC(){
if(!checkConnection()) return;

const amount = document.getElementById("stakeAmount").value;
if(!amount) return alert("Enter amount");

const tx = await tokenContract.approve(
stakingAddress,
ethers.utils.parseUnits(amount,18)
);

status("Approving...");
await tx.wait();

status("Approved ✅");
}

// ================= STAKE =================
async function stake(method){
if(!checkConnection()) return;

const amount = document.getElementById("stakeAmount").value;
if(!amount) return alert("Enter amount");

const tx = await stakingContract[method](
ethers.utils.parseUnits(amount,18)
);

status("Staking...");
await tx.wait();

status("Staked ✅");

loadStakes();
}

// ================= CLAIM =================
async function claimRewards(){
if(!checkConnection()) return;

const tx = await stakingContract.claimAll();

status("Claiming...");
await tx.wait();

status("Claimed ✅");

claimHistory.unshift(new Date().toLocaleString());
if(claimHistory.length > 5) claimHistory.pop();

renderHistory();
loadStakes();
}

// ================= HISTORY =================
function renderHistory(){
let html="";
claimHistory.forEach(h=> html+=`<li>${h}</li>`);
document.getElementById("claimHistory").innerHTML = html;
}

// ================= STAKES =================
async function loadStakes(){
try{

const user = await signer.getAddress();
const count = await stakingContract.getUserStakeCount(user);

let html="";
let total=0;

for(let i=0;i<count;i++){

const s = await stakingContract.getStakeInfo(user,i);
const r = await stakingContract.pendingReward(user,i);

const amount = ethers.utils.formatUnits(s[0],18);
const reward = ethers.utils.formatUnits(r,18);

total += parseFloat(reward);

const last = Number(s[4]);
const next = last + 86400;

html += `
<div class="stakeBox">
<b>Stake #${i}</b><br>
Amount: ${parseFloat(amount).toFixed(4)}<br>
Reward: ${parseFloat(reward).toFixed(4)}<br>
Last Claim: ${new Date(last*1000).toLocaleString()}<br>
Next Claim: ${new Date(next*1000).toLocaleString()}
</div>`;
}

document.getElementById("stakeList").innerHTML = html;
document.getElementById("pendingReward").innerText = total.toFixed(4);

}catch(e){
console.log(e);
}
}

// ================= INIT =================
window.addEventListener("load", async ()=>{

document.getElementById("connectBtn").onclick = connectWallet;
document.getElementById("approveBtn").onclick = approveTRC;
document.getElementById("claimBtn").onclick = claimRewards;

// auto reconnect
if(window.ethereum){
const accounts = await window.ethereum.request({method:"eth_accounts"});
if(accounts.length > 0){
connectWallet();
}
}

});

// ================= LISTEN =================
if(window.ethereum){
window.ethereum.on("accountsChanged", connectWallet);
window.ethereum.on("chainChanged", ()=>location.reload());
}
