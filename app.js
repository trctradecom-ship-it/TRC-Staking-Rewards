// === CONFIG ===
const stakingAddress = "0xDF499393474984A4EB94B868fC72c7a5D66d6d59";
const trcAddress = "0xc08983be707bf4b763e7A0f3cCAD3fd00af6620d";

const stakingABI = [ /* Put your staking contract ABI here */ ];
const trcABI = [ "function approve(address,uint256) returns(bool)" ];

let provider, signer, user, stakingContract, trcContract, web3Modal;

// === INIT Web3Modal ===
function initWeb3Modal() {
    web3Modal = new Web3Modal.default({
        cacheProvider: true,
        providerOptions: {
            walletconnect: {
                package: WalletConnectProvider.default,
                options: {
                    rpc: { 137: "https://polygon-rpc.com" },
                    chainId: 137
                }
            }
        }
    });
}

// === CONNECT WALLET ===
async function connectWallet() {
    try {
        const instance = await web3Modal.connect();
        provider = new ethers.providers.Web3Provider(instance);
        signer = provider.getSigner();
        user = await signer.getAddress();

        const network = await provider.getNetwork();
        if(network.chainId !== 137){
            alert("⚠ Switch wallet to Polygon network");
            return;
        }

        document.getElementById("wallet").innerText = user.slice(0,6) + "..." + user.slice(-4);

        stakingContract = new ethers.Contract(stakingAddress, stakingABI, signer);
        trcContract = new ethers.Contract(trcAddress, trcABI, signer);

        // Load user data
        loadData();

    } catch(e){
        console.error("Wallet connection failed", e);
        alert("❌ Wallet connection failed. Use MetaMask or WalletConnect-compatible wallet.");
    }
}

// === LOAD DASHBOARD DATA ===
async function loadData() {
    if(!stakingContract || !user) return;

    try {
        const pending = await stakingContract.pendingReward(user);
        document.getElementById("pending").innerText = ethers.utils.formatUnits(pending,18);

        const totalWeight = await stakingContract.totalWeight();
        document.getElementById("totalWeight").innerText = totalWeight.toString();

        const rewardPool = await stakingContract.rewardPool();
        document.getElementById("rewardPool").innerText = ethers.utils.formatUnits(rewardPool,18);

    } catch(e) {
        console.error("Error loading data", e);
    }
}

// === APPROVE TRC ===
async function approveTRC(amount) {
    if(!trcContract) return;
    try{
        const tx = await trcContract.approve(stakingAddress, ethers.utils.parseUnits(amount,18));
        alert("✅ Approval sent. Wait for confirmation...");
        await tx.wait();
        alert("✅ TRC approved successfully!");
    } catch(e){
        console.error("Approval failed", e);
        alert("❌ Approval failed");
    }
}

// === STAKE FUNCTIONS ===
async function stake(amount, type) {
    if(!stakingContract) return;
    try{
        let tx;
        switch(type){
            case "30": tx = await stakingContract.stake30(ethers.utils.parseUnits(amount,18)); break;
            case "60": tx = await stakingContract.stake60(ethers.utils.parseUnits(amount,18)); break;
            case "90": tx = await stakingContract.stake90(ethers.utils.parseUnits(amount,18)); break;
            case "150": tx = await stakingContract.stake150(ethers.utils.parseUnits(amount,18)); break;
            case "365": tx = await stakingContract.stake365(ethers.utils.parseUnits(amount,18)); break;
        }
        alert("⏳ Transaction sent...");
        await tx.wait();
        alert("✅ Stake successful!");
        loadData();
    } catch(e){
        console.error("Stake failed", e);
        alert("❌ Stake failed");
    }
}

// === CLAIM REWARD ===
async function claimReward() {
    if(!stakingContract) return;
    try{
        const tx = await stakingContract.claimReward();
        alert("⏳ Claim sent...");
        await tx.wait();
        alert("✅ Reward claimed!");
        loadData();
    } catch(e){
        console.error("Claim failed", e);
        alert("❌ Claim failed");
    }
}

// === CONNECT BUTTON EVENT ===
document.getElementById("connectWallet").onclick = connectWallet;

// INIT ON PAGE LOAD
window.addEventListener("load", initWeb3Modal);
