let provider;
let signer;
let stakingContract;
let tokenContract;

const stakingAddress = "0xDF499393474984A4EB94B868fC72c7a5D66d6d59";
const tokenAddress = "0xc08983be707bf4b763e7A0f3cCAD3fd00af6620d";

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

// ===== HELPERS =====
function toWei(val){
return ethers.utils.parseUnits(val.toString(),18);
}

function fromWei(val){
return parseFloat(ethers.utils.formatUnits(val,18));
}

function status(msg){
document.getElementById("status").innerText = msg;
}

// ===== WAIT ETHERS FIX =====
async function waitForEthers(){
while(typeof ethers === "undefined"){
await new Promise(r => setTimeout(r,100));
}
}

// ===== CONNECT =====
async function connectWallet(){

try{

await waitForEthers();

if(!window.ethereum){
alert("Open in MetaMask / Trust Wallet browser");
return;
}

status("Connecting...");

const accounts = await window.ethereum.request({
method:"eth_requestAccounts"
});

provider = new ethers.providers.Web3Provider(window.ethereum,"any");
signer = provider.getSigner();

const network = await provider.getNetwork();

// ✅ Polygon check
if(network.chainId !== 137){
alert("Switch to Polygon Network");
return;
}

const address = accounts[0];
document.getElementById("wallet").innerText = address;

stakingContract = new ethers.Contract(stakingAddress, stakingABI, signer);
tokenContract = new ethers.Contract(tokenAddress, tokenABI, signer);

status("Wallet Connected ✅");

loadBalance();
loadStakes();

}catch(err){
status("Error ❌ " + err.message);
}
}

// ===== BALANCE =====
async function loadBalance(){
const user = await signer.getAddress();
const bal = await tokenContract.balanceOf(user);

document.getElementById("balance").innerText =
fromWei(bal).toFixed(4);
}

// ===== APPROVE =====
async function approveTRC(){

const amount = document.getElementById("stakeAmount").value;
if(!amount) return alert("Enter amount");

const tx = await tokenContract.approve(stakingAddress,toWei(amount));

status("Approving...");
await tx.wait();
status("Approved ✅");
}

// ===== STAKE =====
async function stake(method){

const amount = document.getElementById("stakeAmount").value;
if(!amount) return alert("Enter amount");

const tx = await stakingContract[method](toWei(amount));

status("Staking...");
await tx.wait();

status("Staked ✅");
loadStakes();
}

// ===== CLAIM =====
async function claimRewards(){

const tx = await stakingContract.claimAll();

status("Claiming...");
await tx.wait();

status("Claimed ✅");

claimHistory.unshift(new Date().toLocaleString());
if(claimHistory.length > 5) claimHistory.pop();

renderHistory();
loadStakes();
}

// ===== HISTORY =====
function renderHistory(){
let html="";
claimHistory.forEach(h=> html += `<li>${h}</li>`);
document.getElementById("claimHistory").innerHTML = html;
}

// ===== STAKES =====
async function loadStakes(){

const user = await signer.getAddress();
const count = await stakingContract.getUserStakeCount(user);

let html="";
let total=0;

for(let i=0;i<count;i++){

const s = await stakingContract.getStakeInfo(user,i);
const r = await stakingContract.pendingReward(user,i);

const amount = fromWei(s[0]);
const reward = fromWei(r);

total += reward;

const last = Number(s[4]);
const next = last + 86400;

html += `
<div class="stakeBox">
<b>Stake #${i}</b><br>
Amount: ${amount.toFixed(4)}<br>
Reward: ${reward.toFixed(4)}<br>
Last Claim: ${new Date(last*1000).toLocaleString()}<br>
Next Claim: ${new Date(next*1000).toLocaleString()}
</div>`;
}

document.getElementById("stakeList").innerHTML = html;
document.getElementById("pendingReward").innerText = total.toFixed(4);
}

// ===== INIT =====
window.onload = function(){
document.getElementById("connectBtn").onclick = connectWallet;
document.getElementById("approveBtn").onclick = approveTRC;
document.getElementById("claimBtn").onclick = claimRewards;
};
