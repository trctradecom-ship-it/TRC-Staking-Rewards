let provider;
let signer;
let stakingContract;
let trcContract;

const stakingAddress = "0xDF499393474984A4EB94B868fC72c7a5D66d6d59";
const trcAddress = "0xc08983be707bf4b763e7A0f3cCAD3fd00af6620d";

// 👉 CHANGE THIS if using BSC etc
const REQUIRED_CHAIN = 137; // Polygon

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

const trcABI = [
"function approve(address,uint256)",
"function balanceOf(address) view returns(uint256)"
];

let claimHistory = [];

function status(msg){
document.getElementById("status").innerText = msg;
}

async function connectWallet(){
try{

if(!window.ethereum){
alert("Open this site inside MetaMask browser");
return;
}

// Request wallet
await window.ethereum.request({ method: "eth_requestAccounts" });

provider = new ethers.providers.Web3Provider(window.ethereum);
signer = provider.getSigner();

// Network check
const network = await provider.getNetwork();
console.log("Connected network:", network.chainId);

if(network.chainId !== REQUIRED_CHAIN){
status("Wrong network! Please switch.");
alert("Switch to correct network (Polygon/BSC)");
return;
}

// Address
const address = await signer.getAddress();
document.getElementById("wallet").innerText = "Connected: " + address;

// Contracts
stakingContract = new ethers.Contract(stakingAddress, stakingABI, signer);
trcContract = new ethers.Contract(trcAddress, trcABI, signer);

// Load data
await loadBalance();
await loadStakes();

status("Wallet Connected ✅");

}catch(err){
console.error(err);
status("Error: " + err.message);
}
}

async function loadBalance(){
try{
const user = await signer.getAddress();
const bal = await trcContract.balanceOf(user);

document.getElementById("balance").innerText =
parseFloat(ethers.utils.formatUnits(bal,18)).toFixed(4);

}catch(err){
console.log(err);
}
}

async function approveTRC(){
try{

const amount = document.getElementById("stakeAmount").value;
if(!amount || amount <= 0){
alert("Enter valid amount");
return;
}

const value = ethers.utils.parseUnits(amount,18);

const tx = await trcContract.approve(stakingAddress,value);
status("Approving...");
await tx.wait();

status("Approve Success ✅");

}catch(err){
status("Error: " + err.message);
}
}

async function stake(method){
try{

const amount = document.getElementById("stakeAmount").value;
if(!amount || amount <= 0){
alert("Enter valid amount");
return;
}

const value = ethers.utils.parseUnits(amount,18);

const tx = await stakingContract[method](value);
status("Staking...");
await tx.wait();

status("Stake Success ✅");

loadStakes();

}catch(err){
status("Error: " + err.message);
}
}

async function claimRewards(){
try{

const tx = await stakingContract.claimAll();
status("Claiming...");
await tx.wait();

status("Rewards Claimed ✅");

claimHistory.unshift(new Date().toLocaleString());
if(claimHistory.length > 5) claimHistory.pop();

renderHistory();
loadStakes();

}catch(err){
status("Error: " + err.message);
}
}

function renderHistory(){
let html = "";
claimHistory.forEach(h=>{
html += `<li>${h}</li>`;
});
document.getElementById("claimHistory").innerHTML = html;
}

async function loadStakes(){
try{

const user = await signer.getAddress();
const count = await stakingContract.getUserStakeCount(user);

let html = "";
let totalReward = 0;

for(let i=0;i<count;i++){

const stake = await stakingContract.getStakeInfo(user,i);
const reward = await stakingContract.pendingReward(user,i);

const amount = ethers.utils.formatUnits(stake[0],18);
const rewardHuman = ethers.utils.formatUnits(reward,18);

totalReward += parseFloat(rewardHuman);

const lastClaim = Number(stake[4]);
const nextClaim = lastClaim + (24*60*60);

html += `
<div class="stakeBox">
<b>Stake #${i}</b><br>
Amount: ${parseFloat(amount).toFixed(4)} TRC<br>
Reward: ${parseFloat(rewardHuman).toFixed(4)} TRC<br>
Last Claim: ${new Date(lastClaim*1000).toLocaleString()}<br>
Next Claim: ${new Date(nextClaim*1000).toLocaleString()}
</div>
`;
}

document.getElementById("stakeList").innerHTML = html;
document.getElementById("pendingReward").innerText = totalReward.toFixed(4);

}catch(err){
console.log(err);
}
}

// Button bindings
window.onload = function(){
document.getElementById("connectBtn").onclick = connectWallet;
document.getElementById("approveBtn").onclick = approveTRC;
document.getElementById("claimBtn").onclick = claimRewards;
};
