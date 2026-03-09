const stakingAddress = "0xDF499393474984A4EB94B868fC72c7a5D66d6d59";
const trcAddress = "0xc08983be707bf4b763e7A0f3cCAD3fd00af6620d";

// ABIs
const stakingAbi = [/* Use the ABI you pasted */];
const trcAbi = [
    "function approve(address spender, uint256 amount) external returns(bool)",
    "function allowance(address owner, address spender) external view returns(uint256)",
    "function balanceOf(address account) external view returns(uint256)"
];

let provider, signer, stakingContract, trcContract, userAddress;

async function connectWallet() {
    if (!window.ethereum) return alert("Install MetaMask!");
    provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = await provider.getSigner();
    userAddress = await signer.getAddress();
    stakingContract = new ethers.Contract(stakingAddress, stakingAbi, signer);
    trcContract = new ethers.Contract(trcAddress, trcAbi, signer);
    document.getElementById("connectWallet").innerText = "Wallet Connected";
    loadRewards();
    loadStakes();
}

async function approveTRC() {
    const amount = ethers.parseUnits(document.getElementById("approveAmount").value || "0", 18);
    const tx = await trcContract.approve(stakingAddress, amount);
    await tx.wait();
    alert("TRC Approved!");
}

async function stake(amount, days) {
    let funcName = `stake${days}`;
    const tx = await stakingContract[funcName](amount);
    await tx.wait();
    alert(`Staked ${ethers.formatUnits(amount,18)} TRC for ${days} days`);
    loadStakes();
}

async function loadRewards() {
    const pool = await stakingContract.rewardPool();
    document.getElementById("rewardPool").innerText = ethers.formatUnits(pool,18);

    // Pending reward for first stake as example
    const count = await stakingContract.getUserStakeCount(userAddress);
    let totalPending = 0n;
    for (let i = 0; i < count; i++) {
        const pending = await stakingContract.pendingReward(userAddress, i);
        totalPending += pending;
    }
    document.getElementById("pendingReward").innerText = ethers.formatUnits(totalPending,18);
}

async function claimAll() {
    const tx = await stakingContract.claimAll();
    await tx.wait();
    alert("All rewards claimed!");
    loadRewards();
}

async function loadStakes() {
    const count = await stakingContract.getUserStakeCount(userAddress);
    const tbody = document.getElementById("stakeHistory");
    tbody.innerHTML = "";
    for (let i = 0; i < count; i++) {
        const stake = await stakingContract.getStakeInfo(userAddress, i);
        const canClaim = await stakingContract.canClaimReward(userAddress, i);
        const canClose = await stakingContract.canCloseStake(userAddress, i);
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${i}</td>
            <td>${ethers.formatUnits(stake.amount,18)}</td>
            <td>${stake.weight}</td>
            <td>${new Date(stake.unlockTime*1000).toLocaleString()}</td>
            <td>${stake.active ? "Active" : "Closed"}</td>
            <td><button class="btn" ${canClaim ? "" : "disabled"} onclick="claimStake(${i})">Claim</button></td>
            <td><button class="btn" ${canClose ? "" : "disabled"} onclick="closeStake(${i})">Close</button></td>
        `;
        tbody.appendChild(row);
    }
}

async function claimStake(index) {
    const tx = await stakingContract.claim(index);
    await tx.wait();
    loadRewards();
    loadStakes();
}

async function closeStake(index) {
    const tx = await stakingContract.closeStake(index);
    await tx.wait();
    loadStakes();
}

// Event listeners
document.getElementById("connectWallet").onclick = connectWallet;
document.getElementById("approveBtn").onclick = approveTRC;
document.querySelectorAll(".stakeBtn").forEach(btn => {
    btn.onclick = async () => {
        const amount = ethers.parseUnits(prompt("Enter amount to stake:"), 18);
        const days = btn.dataset.days;
        await stake(amount, days);
    };
});
document.getElementById("claimAllBtn").onclick = claimAll;
