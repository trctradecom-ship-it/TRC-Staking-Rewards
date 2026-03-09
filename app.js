let provider;
let signer;
let contract;
let token;
let user;
let chart;

const stakingAddress = "0xDF499393474984A4EB94B868fC72c7a5D66d6d59";
const trcAddress = "0xc08983be707bf4b763e7A0f3cCAD3fd00af6620d";

const stakingABI = [
  "function accRewardPerWeight() view returns(uint256)",
  "function rewardPool() view returns(uint256)",
  "function totalWeight() view returns(uint256)",
  "function pendingReward(address) view returns(uint256)",
  "function stakes(address,uint256) view returns(uint256 amount,uint256 weight,uint256 unlockTime,uint256 rewardDebt,uint256 lastClaimTime,bool active)",
  "function stake30(uint256 amount)",
  "function stake60(uint256 amount)",
  "function stake90(uint256 amount)",
  "function stake150(uint256 amount)",
  "function stake365(uint256 amount)",
  "function claimAll()"
];

const tokenABI = [
  "function approve(address,uint256) returns(bool)"
];

// Web3Modal for multi-wallet connection
let web3Modal;

window.addEventListener('load', async () => {
  initChart();
  const providerOptions = {
    walletconnect: {
      package: window.WalletConnectProvider.default,
      options: {
        rpc: {
          137: "https://polygon-rpc.com/"
        },
        network: "matic"
      }
    }
  };
  web3Modal = new window.Web3Modal.default({
    cacheProvider: false,
    providerOptions
  });

  document.getElementById("connectWallet").addEventListener("click", connectWallet);
});

async function connectWallet() {
  try {
    const instance = await web3Modal.connect();
    provider = new ethers.providers.Web3Provider(instance);
    signer = provider.getSigner();
    user = await signer.getAddress();
    document.getElementById("walletDisplay").innerText = user;
    contract = new ethers.Contract(stakingAddress, stakingABI, signer);
    token = new ethers.Contract(trcAddress, tokenABI, signer);
    updateStatus("Wallet connected: " + user);
    loadData();
    setInterval(loadData, 10000); // Refresh every 10s
  } catch (e) {
    updateStatus("❌ Wallet connection failed");
    console.error(e);
  }
}

function updateStatus(msg) {
  document.getElementById("status").innerHTML = msg;
}

// Human readable TRC
function human(v) {
  return Number(ethers.utils.formatUnits(v,18)).toFixed(4);
}

// Chart.js
function initChart() {
  const ctx = document.getElementById("priceChart").getContext("2d");
  chart = new Chart(ctx,{
    type:"line",
    data:{
      labels:["Start"],
      datasets:[{
        label:"TRC Price USD",
        data:[0],
        fill:true,
        backgroundColor:"rgba(255, 215, 0,0.3)",
        borderColor:"#ffd700",
        tension:0.4
      }]
    },
    options:{responsive:true,plugins:{legend:{display:true}}}
  });
}

// Load Dashboard Data
async function loadData() {
  if(!contract) return;
  try {
    const pool = await contract.rewardPool();
    document.getElementById("rewardPool").innerText = human(pool);

    const totalWeight = await contract.totalWeight();
    document.getElementById("totalWeight").innerText = human(totalWeight);

    const pending = await contract.pendingReward(user);
    document.getElementById("pending").innerText = human(pending);

    // Optionally update chart with price simulation
    const price = Math.random() * 2 + 1; // Replace with real price if available
    chart.data.labels.push(new Date().toLocaleTimeString());
    chart.data.datasets[0].data.push(price);
    if(chart.data.labels.length>20){chart.data.labels.shift();chart.data.datasets[0].data.shift();}
    chart.update();
  } catch(e) {
    console.error(e);
  }
}

// Handle transaction
async function handleTx(txPromise) {
  try {
    updateStatus("⏳ Transaction sent...");
    const tx = await txPromise;
    updateStatus(`Transaction sent. <a href="https://polygonscan.com/tx/${tx.hash}" target="_blank">View on PolygonScan</a>`);
    await tx.wait();
    updateStatus(`✅ Transaction Confirmed. <a href="https://polygonscan.com/tx/${tx.hash}" target="_blank">Open PolygonScan</a>`);
    loadData();
  } catch(e) {
    console.error(e);
    updateStatus("❌ Transaction failed or rejected");
  }
}

// Approve TRC
async function approveTRC(amount) {
  if(!token) return updateStatus("Wallet not connected");
  const value = ethers.utils.parseUnits(amount,18);
  handleTx(token.approve(stakingAddress,value));
}

// Stake
async function stake(amount,days) {
  if(!contract) return updateStatus("Wallet not connected");
  const value = ethers.utils.parseUnits(amount,18);
  if(days=="30") handleTx(contract.stake30(value));
  if(days=="60") handleTx(contract.stake60(value));
  if(days=="90") handleTx(contract.stake90(value));
  if(days=="150") handleTx(contract.stake150(value));
  if(days=="365") handleTx(contract.stake365(value));
}

// Claim Rewards
async function claimReward() {
  if(!contract) return updateStatus("Wallet not connected");
  handleTx(contract.claimAll());
}
