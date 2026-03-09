let provider, signer, user, stakingContract, trcContract, chart;

const stakingAddress = "0xDF499393474984A4EB94B868fC72c7a5D66d6d59";
const trcAddress = "0xc08983be707bf4b763e7A0f3cCAD3fd00af6620d";

const stakingAbi = [ /* your staking ABI here */ ];
const trcAbi = [
  "function approve(address,uint256) external returns(bool)",
  "function allowance(address owner,address spender) view returns(uint256)",
  "function balanceOf(address account) view returns(uint256)"
];

let web3Modal;

// ------------------ INIT ------------------
function initWeb3Modal() {
  web3Modal = new window.Web3Modal.default({
    cacheProvider: true,
    providerOptions: {
      walletconnect: {
        package: window.WalletConnectProvider.default,
        options: { rpc: { 137: "https://polygon-rpc.com" }, chainId: 137 }
      }
    }
  });
}

// ------------------ CONNECT WALLET ------------------
async function connectWallet() {
  try {
    const instance = await web3Modal.connect();
    provider = new ethers.providers.Web3Provider(instance);
    signer = provider.getSigner();
    user = await signer.getAddress();

    const network = await provider.getNetwork();
    if (network.chainId !== 137) alert("Switch to Polygon Mainnet");

    stakingContract = new ethers.Contract(stakingAddress, stakingAbi, signer);
    trcContract = new ethers.Contract(trcAddress, trcAbi, signer);

    document.getElementById("wallet").innerText = user.slice(0,6) + "..." + user.slice(-4);

    loadRewards();
    loadStakes();
    initChartData();
  } catch(e){console.error(e); alert("Wallet connection failed");}
}

// ------------------ APPROVE ------------------
async function approveTRC(){
  const amount = document.getElementById("approveAmount").value;
  if(!amount) return alert("Enter amount");
  const tx = await trcContract.approve(stakingAddress, ethers.parseUnits(amount,18));
  handleTx(tx);
}

// ------------------ STAKE ------------------
async function stakeTRC(days){
  const amount = prompt("Enter amount to stake:");
  if(!amount) return;
  const tx = await stakingContract[`stake${days}`](ethers.parseUnits(amount,18));
  handleTx(tx);
}

// ------------------ CLAIM ALL ------------------
async function claimAllRewards(){
  const tx = await stakingContract.claimAll();
  handleTx(tx);
}

// ------------------ HANDLE TX ------------------
async function handleTx(tx){
  try{
    const sent = await tx;
    document.getElementById("status").innerHTML = `⏳ Transaction sent: <a href="https://polygonscan.com/tx/${sent.hash}" target="_blank">View</a>`;
    await sent.wait();
    document.getElementById("status").innerHTML = `✅ Transaction Confirmed: <a href="https://polygonscan.com/tx/${sent.hash}" target="_blank">Open</a>`;
    loadRewards();
    loadStakes();
  }catch(e){console.error(e); document.getElementById("status").innerText="❌ Transaction failed";}
}

// ------------------ LOAD REWARDS ------------------
async function loadRewards(){
  if(!user) return;
  try{
    const pool = await stakingContract.rewardPool();
    const pending = await stakingContract.pendingReward(user);
    document.getElementById("rewardPool").innerText = ethers.formatUnits(pool,18);
    document.getElementById("pending").innerText = ethers.formatUnits(pending,18);
  }catch(e){console.log(e);}
}

// ------------------ LOAD STAKES ------------------
async function loadStakes(){
  if(!user) return;
  try{
    const count = await stakingContract.getUserStakeCount(user);
    const tbody = document.getElementById("stakeHistory"); tbody.innerHTML="";
    for(let i=0;i<count;i++){
      const s = await stakingContract.getStakeInfo(user,i);
      const canClaim = await stakingContract.canClaimReward(user,i);
      const canClose = await stakingContract.canCloseStake(user,i);
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${i}</td>
        <td>${ethers.formatUnits(s.amount,18)}</td>
        <td>${s.weight}</td>
        <td>${new Date(s.unlockTime*1000).toLocaleString()}</td>
        <td>${s.active?"Active":"Closed"}</td>
        <td><button class="btn" ${canClaim?"":"disabled"} onclick="claimStake(${i})">Claim</button></td>
        <td><button class="btn" ${canClose?"":"disabled"} onclick="closeStake(${i})">Close</button></td>
      `;
      tbody.appendChild(row);
    }
  }catch(e){console.log(e);}
}

async function claimStake(index){ handleTx(stakingContract.claim(index)); }
async function closeStake(index){ handleTx(stakingContract.closeStake(index)); }

// ------------------ CHART ------------------
function initChartData(){
  const ctx = document.getElementById("priceChart").getContext("2d");
  chart = new Chart(ctx,{
    type:"line",
    data:{ labels:["Start"], datasets:[{label:"TRC Price USD", data:[0], fill:true, tension:0.4}] },
    options:{ responsive:true, plugins:{ legend:{display:true} } }
  });
  setInterval(updateChart,10000);
}

async function updateChart(){
  if(!user) return;
  try{
    const price = await stakingContract.getTRCPriceUSD();
    const usdPrice = Number(ethers.formatUnits(price,18)).toFixed(4);
    chart.data.labels.push(new Date().toLocaleTimeString());
    chart.data.datasets[0].data.push(usdPrice);
    if(chart.data.labels.length>20){ chart.data.labels.shift(); chart.data.datasets[0].data.shift(); }
    chart.update();
  }catch(e){console.log(e);}
}

// ------------------ INTERVAL UPDATES ------------------
setInterval(()=>{ loadRewards(); loadStakes(); },10000);

// ------------------ EVENT LISTENERS ------------------
document.getElementById("connectWallet").onclick = connectWallet;
document.getElementById("approveBtn").onclick = approveTRC;
document.getElementById("claimAllBtn").onclick = claimAllRewards;
document.querySelectorAll(".stakeBtn").forEach(btn=>{ btn.onclick=()=>stakeTRC(btn.dataset.days); });

initWeb3Modal();
