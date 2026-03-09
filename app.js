// ---------------------- CONFIG ----------------------
const stakingAddress = "0xDF499393474984A4EB94B868fC72c7a5D66d6d59";
const trcAddress = "0xc08983be707bf4b763e7A0f3cCAD3fd00af6620d";

// Replace this with your actual staking ABI
const stakingAbi = [ /* full staking ABI here */ ];

// Minimal TRC ERC20 ABI for approve/balance
const trcAbi = [
    "function approve(address spender,uint256 amount) external returns(bool)",
    "function allowance(address owner,address spender) view returns(uint256)",
    "function balanceOf(address account) view returns(uint256)"
];

// ---------------------- GLOBALS ----------------------
let provider, signer, userAddress;
let stakingContract, trcContract;

// ---------------------- CONNECT WALLET ----------------------
async function connectWalletPolygon() {
    if (!window.ethereum) {
        alert("MetaMask not installed!");
        return;
    }

    const polygonParams = {
        chainId: '0x89', // Polygon Mainnet
        chainName: 'Polygon Mainnet',
        nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
        rpcUrls: ['https://polygon-rpc.com/'],
        blockExplorerUrls: ['https://polygonscan.com/']
    };

    try {
        // Request wallet access
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        userAddress = accounts[0];

        // Switch/add Polygon network
        await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [polygonParams]
        });

        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();

        stakingContract = new ethers.Contract(stakingAddress, stakingAbi, signer);
        trcContract = new ethers.Contract(trcAddress, trcAbi, signer);

        document.getElementById("connectWallet").innerText =
            `${userAddress.slice(0,6)}...${userAddress.slice(-4)}`;

        loadRewards();
        loadStakes();

        console.log("Wallet connected:", userAddress);

    } catch (err) {
        console.error(err);
        alert("Wallet connection failed!");
    }
}

// ---------------------- APPROVE TRC ----------------------
async function approveTRC() {
    try {
        const amount = ethers.parseUnits(
            document.getElementById("approveAmount").value || "0", 18
        );
        const tx = await trcContract.approve(stakingAddress, amount);
        await tx.wait();
        alert("TRC Approved!");
    } catch (err) {
        console.error(err);
        alert("Approve failed!");
    }
}

// ---------------------- STAKE ----------------------
async function stakeTRC(days) {
    try {
        const amountInput = prompt("Enter amount to stake:");
        if (!amountInput || isNaN(amountInput)) return;

        const amount = ethers.parseUnits(amountInput, 18);
        const tx = await stakingContract[`stake${days}`](amount);
        await tx.wait();
        alert(`Staked ${amountInput} TRC for ${days} days`);
        loadStakes();
        loadRewards();
    } catch (err) {
        console.error(err);
        alert("Stake failed!");
    }
}

// ---------------------- LOAD REWARDS ----------------------
async function loadRewards() {
    try {
        const pool = await stakingContract.rewardPool();
        document.getElementById("rewardPool").innerText = ethers.formatUnits(pool,18);

        const count = await stakingContract.getUserStakeCount(userAddress);
        let totalPending = 0n;
        for (let i = 0; i < count; i++) {
            const pending = await stakingContract.pendingReward(userAddress,i);
            totalPending += pending;
        }
        document.getElementById("pendingReward").innerText = ethers.formatUnits(totalPending,18);
    } catch (err) {
        console.error(err);
    }
}

// ---------------------- CLAIM ALL ----------------------
async function claimAllRewards() {
    try {
        const tx = await stakingContract.claimAll();
        await tx.wait();
        alert("All rewards claimed!");
        loadRewards();
        loadStakes();
    } catch (err) {
        console.error(err);
        alert("Claim failed!");
    }
}

// ---------------------- LOAD STAKES ----------------------
async function loadStakes() {
    try {
        const count = await stakingContract.getUserStakeCount(userAddress);
        const tbody = document.getElementById("stakeHistory");
        tbody.innerHTML = "";

        for (let i = 0; i < count; i++) {
            const s = await stakingContract.getStakeInfo(userAddress, i);
            const canClaim = await stakingContract.canClaimReward(userAddress, i);
            const canClose = await stakingContract.canCloseStake(userAddress, i);

            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${i}</td>
                <td>${ethers.formatUnits(s.amount,18)}</td>
                <td>${s.weight}</td>
                <td>${new Date(s.unlockTime*1000).toLocaleString()}</td>
                <td>${s.active ? "Active" : "Closed"}</td>
                <td><button class="btn" ${canClaim ? "" : "disabled"} onclick="claimStake(${i})">Claim</button></td>
                <td><button class="btn" ${canClose ? "" : "disabled"} onclick="closeStake(${i})">Close</button></td>
            `;
            tbody.appendChild(row);
        }

    } catch (err) {
        console.error(err);
    }
}

// ---------------------- CLAIM SINGLE STAKE ----------------------
async function claimStake(index) {
    try {
        const tx = await stakingContract.claim(index);
        await tx.wait();
        loadRewards();
        loadStakes();
    } catch (err) {
        console.error(err);
        alert("Claim failed!");
    }
}

// ---------------------- CLOSE SINGLE STAKE ----------------------
async function closeStake(index) {
    try {
        const tx = await stakingContract.closeStake(index);
        await tx.wait();
        loadStakes();
        loadRewards();
    } catch (err) {
        console.error(err);
        alert("Close failed!");
    }
}

// ---------------------- EVENT LISTENERS ----------------------
document.getElementById("connectWallet").onclick = connectWalletPolygon;
document.getElementById("approveBtn").onclick = approveTRC;
document.getElementById("claimAllBtn").onclick = claimAllRewards;

document.querySelectorAll(".stakeBtn").forEach(btn => {
    btn.onclick = () => stakeTRC(btn.dataset.days);
});
