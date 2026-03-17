let provider;
let signer;
let stakingContract;
let trcContract;
let connected=false;

const stakingAddress="0xDF499393474984A4EB94B868fC72c7a5D66d6d59";
const trcAddress="0xc08983be707bf4b763e7A0f3cCAD3fd00af6620d";

const stakingABI=[

"function stake30(uint256 amount)",
"function stake60(uint256 amount)",
"function stake90(uint256 amount)",
"function stake150(uint256 amount)",
"function stake365(uint256 amount)",

"function claimAll()",
"function closeStake(uint256 index)",

"function getUserStakeCount(address)view returns(uint256)",

"function getStakeInfo(address,uint256)view returns(uint256 amount,uint256 weight,uint256 unlockTime,uint256 rewardDebt,uint256 lastClaimTime,bool active)",

"function pendingReward(address,uint256)view returns(uint256)"

];

const trcABI=[
"function approve(address spender,uint256 amount) returns(bool)"
];

function updateStatus(msg){
document.getElementById("status").innerHTML=msg;
}

function checkConnection(){
if(!connected){
alert("Connect wallet first");
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

provider=new ethers.providers.Web3Provider(window.ethereum);
signer=provider.getSigner();

const address=await signer.getAddress();

document.getElementById("wallet").innerText="Connected: "+address;

stakingContract=new ethers.Contract(
stakingAddress,
stakingABI,
signer
);

trcContract=new ethers.Contract(
trcAddress,
trcABI,
signer
);

connected=true;

updateStatus("Wallet Connected ✅");

loadStakes();
}

async function approveTRC(){

if(!checkConnection()) return;

const amount=document.getElementById("stakeAmount").value;

try{

const tx=await trcContract.approve(
stakingAddress,
ethers.utils.parseUnits(amount,18)
);

updateStatus("Approve TX Sent");

await tx.wait();

updateStatus("Approve Successful ✅");

}catch(e){

updateStatus("Approve Failed ❌");

}

}

async function stake30(){ stake("stake30"); }
async function stake60(){ stake("stake60"); }
async function stake90(){ stake("stake90"); }
async function stake150(){ stake("stake150"); }
async function stake365(){ stake("stake365"); }

async function stake(method){

if(!checkConnection()) return;

const amount=document.getElementById("stakeAmount").value;

try{

const tx=await stakingContract[method](
ethers.utils.parseUnits(amount,18)
);

updateStatus("Stake TX Sent");

await tx.wait();

updateStatus("Stake Successful ✅");

loadStakes();

}catch(e){

updateStatus("Stake Failed ❌");

}

}

async function claimRewards(){

if(!checkConnection()) return;

try{

const tx=await stakingContract.claimAll();

updateStatus("Claim TX Sent");

await tx.wait();

updateStatus("Rewards Claimed ✅");

loadStakes();

}catch(e){

updateStatus("Claim Failed ❌");

}

}

async function closeStake(index){

if(!checkConnection()) return;

try{

const tx=await stakingContract.closeStake(index);

updateStatus("Close Stake TX Sent");

await tx.wait();

updateStatus("Stake Closed ✅");

loadStakes();

}catch(e){

updateStatus("Close Failed ❌");

}

}

async function loadStakes(){

const user=await signer.getAddress();

const count=await stakingContract.getUserStakeCount(user);

let html="";

for(let i=0;i<count;i++){

const stake=await stakingContract.getStakeInfo(user,i);

const reward=await stakingContract.pendingReward(user,i);

const lastClaim=Number(stake.lastClaimTime);
const nextClaim=lastClaim+(30*24*60*60);

html+=`

<div class="stakeBox">

Index: ${i} <br>

Amount: ${ethers.utils.formatUnits(stake.amount,18)} TRC <br>

Reward: ${ethers.utils.formatUnits(reward,18)} TRC <br>

Last Claim:
${new Date(lastClaim*1000).toLocaleString()} <br>

Next Claim:
${new Date(nextClaim*1000).toLocaleString()} <br>

<button class="closeBtn" onclick="closeStake(${i})">
Close Stake
</button>

</div>

`;

}

document.getElementById("stakeList").innerHTML=html;

}
