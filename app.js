let provider; 
let signer;
let stakingContract;
let tokenContract;
let userAddress;
let connected = false;

// CONTRACT ADDRESSES
const stakingAddress = "0xDF499393474984A4EB94B868fC72c7a5D66d6d59";
const trcAddress = "0xc08983be707bf4b763e7A0f3cCAD3fd00af6620d";

// STAKING CONTRACT ABI (use the ABI you provided)
const stakingABI = [ /* paste your ABI here */ ];
const tokenABI = ["function approve(address,uint256) returns(bool)"];

// -----------------------
// UTILITY FUNCTIONS
// -----------------------
function updateStatus(msg) {
    document.getElementById("status").innerHTML = msg;
}

function formatTRC(amount) {
    return Number(ethers.utils.formatUnits(amount, 18)).toFixed(4);
}

function truncateAddress(addr) {
    return addr.slice(0,6) + "..." + addr.slice(-4);
}

// -----------------------
// CONNECT WALLET
// -----------------------
async function connectWallet() {
    if (!window.ethereum) {
        alert("Please install a Web3 wallet like MetaMask!");
        return;
    }
    provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = provider.getSigner();
    userAddress = await signer.getAddress();

    // update UI inside wallet card
    document.getElementById("wallet").innerText = "Connected: " + truncateAddress(userAddress);

    stakingContract = new ethers.Contract(stakingAddress, stakingABI, signer);
    tokenContract = new ethers.Contract(trcAddress, tokenABI, signer);

    connected = true;
    updateStatus("Wallet Connected ✅");

    loadUserData();
    loadStakeHistory();
}

// -----------------------
// CHECK CONNECTION
// -----------------------
function checkConnection() {
    if (!connected) {
        alert("Connect Wallet First");
        return false;
    }
    return true;
}

// -----------------------
// APPROVE TRC
// -----------------------
async function approveTRC() {
    if (!checkConnection()) return;
    const amount = document.getElementById("approveAmount").value;
    if (!amount) { alert("Enter amount to approve"); return; }
    const value = ethers.utils.parseUnits(amount, 18);

    try {
        const tx = await tokenContract.approve(stakingAddress, value);
        updateStatus(`Approval sent: <a href="https://polygonscan.com/tx/${tx.hash}" target="_blank">${tx.hash}</a>`);
        await tx.wait();
        updateStatus("✅ Approved successfully!");
    } catch (e) {
        updateStatus("❌ Approval failed: " + e.message);
    }
}

// -----------------------
// STAKE FUNCTION
// -----------------------
async function stake(amountInputId, plan) {
    if (!checkConnection()) return;
    const amountTRC = document.getElementById(amountInputId).value;
    if (!amountTRC || Number(amountTRC) <= 0) { alert("Enter valid TRC amount"); return; }
    const value = ethers.utils.parseUnits(amountTRC, 18);

    try {
        let tx;
        switch(plan) {
            case 30: tx = await stakingContract.stake30(value); break;
            case 60: tx = await stakingContract.stake60(value); break;
            case 90: tx = await stakingContract.stake90(value); break;
            case 150: tx = await stakingContract.stake150(value); break;
            case 365: tx = await stakingContract.stake365(value); break;
            default: alert("Invalid plan"); return;
        }
        updateStatus(`Staking sent: <a href="https://polygonscan.com/tx/${tx.hash}" target="_blank">${tx.hash}</a>`);
        await tx.wait();
        updateStatus(`✅ Staked ${amountTRC} TRC for ${plan} days!`);
        loadUserData();
        loadStakeHistory();
    } catch (e) {
        updateStatus("❌ Stake failed: " + e.message);
    }
}

// -----------------------
// CLAIM REWARDS
// -----------------------
async function claimRewards() {
    if (!checkConnection()) return;
    try {
        const tx = await stakingContract.claimAll();
        updateStatus(`Claim sent: <a href="https://polygonscan.com/tx/${tx.hash}" target="_blank">${tx.hash}</a>`);
        await tx.wait();
        updateStatus("✅ Rewards claimed!");
        loadUserData();
    } catch (e) {
        updateStatus("❌ Claim failed: " + e.message);
    }
}

// -----------------------
// LOAD USER DATA
// -----------------------
async function loadUserData() {
    if (!connected) return;

    const totalWeight = await stakingContract.totalWeight();
    const pool = await stakingContract.rewardPool();

    document.getElementById("totalWeight").innerText = formatTRC(totalWeight);
    document.getElementById("rewardPool").innerText = formatTRC(pool);

    // example: compute pending rewards for first stake
    const stakeCount = await stakingContract.getUserStakeCount(userAddress);
    if (stakeCount > 0) {
        const reward = await stakingContract.pendingReward(userAddress, 0);
        document.getElementById("pendingReward").innerText = formatTRC(reward);
        const stakeInfo = await stakingContract.getStakeInfo(userAddress, 0);
        document.getElementById("lastClaim").innerText = new Date(stakeInfo.lastClaimTime*1000).toLocaleString();
        document.getElementById("nextClaim").innerText = new Date((stakeInfo.lastClaimTime + 7*24*60*60)*1000).toLocaleString(); // example next claim weekly
    }
}

// -----------------------
// LOAD STAKE HISTORY
// -----------------------
async function loadStakeHistory() {
    if (!connected) return;

    const stakeCount = await stakingContract.getUserStakeCount(userAddress);
    const historyContainer = document.getElementById("stakeHistory");
    historyContainer.innerHTML = "";

    for (let i = 0; i < stakeCount; i++) {
        const stakeInfo = await stakingContract.getStakeInfo(userAddress, i);
        const div = document.createElement("div");
        div.classList.add("stakeEntry");
        div.innerHTML = `
            <p>Amount: ${formatTRC(stakeInfo.amount)} TRC</p>
            <p>Weight: ${formatTRC(stakeInfo.weight)}</p>
            <p>Unlock: ${new Date(stakeInfo.unlockTime*1000).toLocaleString()}</p>
            <p>Last Claim: ${new Date(stakeInfo.lastClaimTime*1000).toLocaleString()}</p>
            <p>Status: ${stakeInfo.active ? "Active ✅" : "Closed ❌"}</p>
        `;
        historyContainer.appendChild(div);
    }
}

// -----------------------
// AUTO REFRESH DATA
// -----------------------
setInterval(() => {
    if (connected) {
        loadUserData();
        loadStakeHistory();
    }
}, 15000);
