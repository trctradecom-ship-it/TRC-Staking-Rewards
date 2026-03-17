let provider;
let signer;
let userAddress;

let stakingContract;
let tokenContract;

const stakingAddress="0xDF499393474984A4EB94B868fC72c7a5D66d6d59";
const tokenAddress="0xc08983be707bf4b763e7A0f3cCAD3fd00af6620d";

const stakingABI=[

"function stake30(uint256)",
"function stake60(uint256)",
"function stake90(uint256)",
"function stake150(uint256)",
"function stake365(uint256)",

"function claimAll()",

"function getUserStakeCount(address)view returns(uint256)",

"function getStakeInfo(address,uint256)view returns(uint256,uint256,uint256,uint256,uint256,bool)",

"function pendingReward(address,uint256)view returns(uint256)"

];

const tokenABI=[

"function approve(address,uint256)"

];

function updateStatus(msg){

document.getElementById("status").innerText=msg;

}

async function connectWallet(){

if(!window.ethereum){

alert("Install MetaMask");
return;

}

provider=new ethers.providers.Web3Provider(window.ethereum);

await provider.send("eth_requestAccounts",[]);

signer=provider.getSigner();

userAddress=await signer.getAddress();

document.getElementById("wallet").innerText=
userAddress.slice(0,6)+"..."+userAddress.slice(-4);

stakingContract=new ethers.Contract(stakingAddress,stakingABI,signer);

tokenContract=new ethers.Contract(tokenAddress,tokenABI,signer);

loadStakeHistory();

}

async function approveTRC(){

try{

let amount=document.getElementById("approveAmount").value;

const tx=await tokenContract.approve(
stakingAddress,
ethers.utils.parseUnits(amount,18)
);

updateStatus("Approval pending...");

await tx.wait();

updateStatus("✅ Approved");

}catch{

updateStatus("❌ Failed");

}

}

async function stake30(){stake("stake30")}
async function stake60(){stake("stake60")}
async function stake90(){stake("stake90")}
async function stake150(){stake("stake150")}
async function stake365(){stake("stake365")}

async function stake(method){

try{

let amount=document.getElementById("stakeAmount").value;

const tx=await stakingContract[method](
ethers.utils.parseUnits(amount,18)
);

updateStatus("Transaction pending...");

await tx.wait();

updateStatus("✅ Stake success");

loadStakeHistory();

}catch{

updateStatus("❌ Transaction failed");

}

}

async function claimRewards(){

try{

const tx=await stakingContract.claimAll();

updateStatus("Claim pending...");

await tx.wait();

updateStatus("✅ Rewards claimed");

loadStakeHistory();

}catch{

updateStatus("❌ Claim failed");

}

}

async function loadStakeHistory(){

const count=await stakingContract.getUserStakeCount(userAddress);

let html="";

for(let i=0;i<count;i++){

let stake=await stakingContract.getStakeInfo(userAddress,i);

let reward=await stakingContract.pendingReward(userAddress,i);

let lastClaim=Number(stake[4]);

let nextClaim=lastClaim+(30*24*60*60);

let now=Math.floor(Date.now()/1000);

let status=now>=nextClaim?"✅ Claim Available":"⏳ Wait";

html+=`

<div class="stakebox">

Amount: ${ethers.utils.formatUnits(stake[0],18)} TRC <br>

Reward: ${ethers.utils.formatUnits(reward,18)} TRC <br>

Last Claim: ${new Date(lastClaim*1000).toLocaleString()} <br>

Next Claim: ${new Date(nextClaim*1000).toLocaleString()} <br>

Status: ${status}

</div>

`;

}

document.getElementById("stakeHistory").innerHTML=html;

}
