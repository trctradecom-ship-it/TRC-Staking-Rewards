let provider;
let signer;
let stakingContract;
let trcContract;
let connected = false;

const stakingAddress = "0xDF499393474984A4EB94B868fC72c7a5D66d6d59";
const trcAddress     = "0xc08983be707bf4b763e7A0f3cCAD3fd00af6620d";

// Minimal ABI for staking contract (include only used functions for now)
const stakingABI = [
    "function stake30(uint256 amount) nonpayable",
    "function stake60(uint256 amount) nonpayable",
    "function stake90(uint256 amount) nonpayable",
    "function stake150(uint256 amount) nonpayable",
    "function stake365(uint256 amount) nonpayable",
    "function claimAll() nonpayable",
    "function pendingReward(address user) view returns(uint256)",
    "function getUserStakeCount(address user) view returns(uint256)",
    "function getStakeInfo(address user,uint256 index) view returns(uint256 amount,uint256 weight,uint256 unlockTime,uint256 rewardDebt,uint256 lastClaimTime,bool active)"
];

// Minimal ERC20 ABI (approve)
const trcABI = [
    "function approve(address spender,uint256 amount) returns(bool)"
];

// Update status messages
function updateStatus(msg){
    document.getElementById("status").innerHTML = msg;
}

// Check connection
function checkConnection(){
    if(!connected){
        alert("Connect Wallet First");
        return false;
    }
    return true;
}

// Connect wallet function
async function connectWallet(){
    try {
        if(!window.ethereum){
            alert("Install a Web3 Wallet (MetaMask, TrustWallet, Coinbase Wallet)");
            return;
        }

        // Request account access
        await window.ethereum.request({ method: 'eth_requestAccounts' });

        // Setup provider and signer
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();

        const address = await signer.getAddress();

        // Display wallet inside card box
        const walletEl = document.getElementById("wallet");
        walletEl.innerText = "Connected: " + address;
        walletEl.style.fontSize = "14px";
        walletEl.style.padding = "6px";
        walletEl.style.borderRadius = "8px";
        walletEl.style.background = "#333";

        // Setup contracts
        stakingContract = new ethers.Contract(stakingAddress, stakingABI, signer);
        trcContract     = new ethers.Contract(trcAddress, trcABI, signer);

        connected = true;
        updateStatus("Wallet Connected ✅");
        
        // Optionally load staking info here
        loadStakingData();

    } catch (err) {
        console.error(err);
        updateStatus("Error connecting wallet ❌: " + err.message);
    }
}

// Example: approve TRC tokens
async function approveTRC(amount){
    if(!checkConnection()) return;
    try{
        const tx = await trcContract.approve(stakingAddress, ethers.utils.parseEther(amount));
        updateStatus(`Approve Transaction Sent ✅<br>Hash: <a href="https://polygonscan.com/tx/${tx.hash}" target="_blank">${tx.hash}</a>`);
        await tx.wait();
        updateStatus(`Approve Confirmed ✅<br><a href="https://polygonscan.com/tx/${tx.hash}" target="_blank">View on PolygonScan</a>`);
    } catch(err){
        updateStatus("Approve Failed ❌: " + err.message);
    }
}

// Example: stake TRC
async function stake(amount, duration){
    if(!checkConnection()) return;
    if(duration !== 30 && duration !== 60 && duration !== 90 && duration !== 150 && duration !== 365){
        alert("Invalid staking duration");
        return;
    }
    try{
        const tx = await stakingContract[`stake${duration}`](ethers.utils.parseEther(amount));
        updateStatus(`Stake ${duration} Days Sent ✅<br>Hash: <a href="https://polygonscan.com/tx/${tx.hash}" target="_blank">${tx.hash}</a>`);
        await tx.wait();
        updateStatus(`Stake Confirmed ✅<br><a href="https://polygonscan.com/tx/${tx.hash}" target="_blank">View on PolygonScan</a>`);
        loadStakingData();
    } catch(err){
        updateStatus("Stake Failed ❌: " + err.message);
    }
}

// Load staking data for user
async function loadStakingData(){
    if(!connected) return;
    try{
        const userAddress = await signer.getAddress();
        const stakeCount = await stakingContract.getUserStakeCount(userAddress);

        const historyList = document.getElementById("historyList");
        historyList.innerHTML = "";

        for(let i=0;i<stakeCount;i++){
            const info = await stakingContract.getStakeInfo(userAddress, i);
            const amount = ethers.utils.formatEther(info.amount);
            const unlock = new Date(info.unlockTime * 1000).toLocaleString();
            const claimed = new Date(info.lastClaimTime * 1000).toLocaleString();
            const active = info.active ? "Active" : "Closed";

            const li = document.createElement("li");
            li.innerHTML = `Stake #${i+1}: ${amount} TRC | ${active} | Unlock: ${unlock} | Last Claim: ${claimed}`;
            historyList.appendChild(li);
        }

        // Pending reward
        const pending = await stakingContract.pendingReward(userAddress);
        document.getElementById("pendingReward").innerText = ethers.utils.formatEther(pending) + " TRC";

    } catch(err){
        console.error(err);
        updateStatus("Load Data Failed ❌: " + err.message);
    }
}
