let provider; 
let signer;
let stakingContract;
let trcContract;

const stakingAddress="0xDF499393474984A4EB94B868fC72c7a5D66d6d59";
const trcAddress="0xc08983be707bf4b763e7A0f3cCAD3fd00af6620d";

const stakingABI=[
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

const trcABI=[
"function approve(address,uint256)",
"function balanceOf(address) view returns(uint256)"
];

let claimHistory=[];

function status(msg){
document.getElementById("status").innerHTML=msg;
}

async function connectWallet(){

if(!window.ethereum){
alert("Install MetaMask");
return;
}

await ethereum.request({method:"eth_requestAccounts"});

provider=new ethers.providers.Web3Provider(window.ethereum);
signer=provider.getSigner();

const address=await signer.getAddress();

document.getElementById("wallet").innerText=
"Connected: "+address;

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

loadBalance();
loadStakes();

status("Wallet Connected");

}

async function loadBalance(){

const user=await signer.getAddress();

const bal=await trcContract.balanceOf(user);

document.getElementById("balance").innerText=
parseFloat(ethers.utils.formatUnits(bal,18)).toFixed(4);

}

async function approveTRC(){

const amount=document.getElementById("stakeAmount").value;

const value=ethers.utils.parseUnits(amount,18);

const tx=await trcContract.approve(stakingAddress,value);

status("Approve sent");

await tx.wait();

status("Approve success");

}

async function stake(method){

const amount=document.getElementById("stakeAmount").value;

const value=ethers.utils.parseUnits(amount,18);

const tx=await stakingContract[method](value);

status("Stake sent");

await tx.wait();

status("Stake success");

loadStakes();

}

async function claimRewards(){

const tx=await stakingContract.claimAll();

status("Claim sent");

await tx.wait();

status("Rewards claimed");

claimHistory.unshift(new Date().toLocaleString());

if(claimHistory.length>5){
claimHistory.pop();
}

renderHistory();

loadStakes();

}

function renderHistory(){

let html="";

claimHistory.forEach(h=>{
html+="<li>"+h+"</li>";
});

document.getElementById("claimHistory").innerHTML=html;

}

async function loadStakes(){

const user=await signer.getAddress();

const count=await stakingContract.getUserStakeCount(user);

let html="";
let totalReward=0;

for(let i=0;i<count;i++){

const stake=await stakingContract.getStakeInfo(user,i);

const reward=await stakingContract.pendingReward(user,i);

const amount=ethers.utils.formatUnits(stake[0],18);

const rewardHuman=ethers.utils.formatUnits(reward,18);

totalReward+=parseFloat(rewardHuman);

const lastClaim=Number(stake[4]);
const nextClaim=lastClaim+(30*24*60*60);

html+=`

<div class="stakeBox">

Stake #${i}<br>

Amount: ${parseFloat(amount).toFixed(4)} TRC<br>

Reward: ${parseFloat(rewardHuman).toFixed(4)} TRC<br>

Last Claim: ${new Date(lastClaim*1000).toLocaleString()}<br>

Next Claim: ${new Date(nextClaim*1000).toLocaleString()}

</div>

`;

}

document.getElementById("stakeList").innerHTML=html;

document.getElementById("pendingReward").innerText=
totalReward.toFixed(4);

}

document.getElementById("connectBtn").onclick=connectWallet;
document.getElementById("approveBtn").onclick=approveTRC;
document.getElementById("claimBtn").onclick=claimRewards;
