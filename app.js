let provider;
let signer;
let stakingContract;
let connected = false;

const stakingAddress = "YOUR_STAKING_CONTRACT";

const stakingABI = [

{"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"stake30","outputs":[],"stateMutability":"nonpayable","type":"function"},

{"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"stake60","outputs":[],"stateMutability":"nonpayable","type":"function"},

{"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"stake90","outputs":[],"stateMutability":"nonpayable","type":"function"},

{"inputs":[],"name":"claimAll","outputs":[],"stateMutability":"nonpayable","type":"function"},

{"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"getUserStakeCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},

{"inputs":[{"internalType":"address","name":"user","type":"address"},{"internalType":"uint256","name":"index","type":"uint256"}],"name":"getStakeInfo","outputs":[{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"weight","type":"uint256"},{"internalType":"uint256","name":"unlockTime","type":"uint256"},{"internalType":"uint256","name":"rewardDebt","type":"uint256"},{"internalType":"uint256","name":"lastClaimTime","type":"uint256"},{"internalType":"bool","name":"active","type":"bool"}],"stateMutability":"view","type":"function"},

{"inputs":[{"internalType":"address","name":"user","type":"address"},{"internalType":"uint256","name":"index","type":"uint256"}],"name":"pendingReward","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}

];

function updateStatus(message){
document.getElementById("status").innerHTML = message;
}

function checkConnection(){
if(!connected){
alert("Connect Wallet First");
return false;
}
return true;
}

async function connectWallet(){

if(!window.ethereum){
alert("Install MetaMask");
return;
}

await ethereum.request({method:'eth_requestAccounts'});

provider = new ethers.providers.Web3Provider(window.ethereum);
signer = provider.getSigner();

const address = await signer.getAddress();
document.getElementById("wallet").innerText = "Connected: " + address;

stakingContract = new ethers.Contract(stakingAddress, stakingABI, signer);

connected = true;

updateStatus("Wallet Connected ✅");

loadStakes();
}

async function loadStakes(){

if(!checkConnection()) return;

const count = await stakingContract.getUserStakeCount(await signer.getAddress());

let html = "";

for(let i=0;i<count;i++){

const stake = await stakingContract.getStakeInfo(await signer.getAddress(),i);

const reward = await stakingContract.pendingReward(await signer.getAddress(),i);

const lastClaim = Number(stake.lastClaimTime);
const nextClaim = lastClaim + (30*24*60*60);

html += `
<div class="stakeBox">

Amount: ${ethers.utils.formatUnits(stake.amount,18)} TRC<br>

Reward: ${ethers.utils.formatUnits(reward,18)} TRC<br>

Last Claim:
${new Date(lastClaim*1000).toLocaleString()}<br>

Next Claim:
${new Date(nextClaim*1000).toLocaleString()}<br>

</div>
`;

}

document.getElementById("stakeList").innerHTML = html;

}

async function stake30(){

if(!checkConnection()) return;

const amount = document.getElementById("stakeAmount").value;

try{

const tx = await stakingContract.stake30(
ethers.utils.parseUnits(amount,18)
);

updateStatus("Transaction Sent ✅");

await tx.wait();

updateStatus("Stake Successful ✅");

loadStakes();

}catch(error){

updateStatus("Error ❌ " + error.message);

}

}

async function claimRewards(){

if(!checkConnection()) return;

try{

const tx = await stakingContract.claimAll();

updateStatus("Claim Sent ✅");

await tx.wait();

updateStatus("Rewards Claimed ✅");

loadStakes();

}catch(error){

updateStatus("Error ❌ " + error.message);

}

}
