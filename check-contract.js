const { ethers } = require("ethers");
require("dotenv").config();

const CONTRACT_ADDRESS = "0x8c87A403512F55Df8A02aD21a01A5203705b2586";
const ABI = [
  "function backendVerifier() view returns (address)",
  "function electionId() view returns (uint256)",
  "function owner() view returns (address)",
  "function candidateCount() view returns (uint32)"
];

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
  const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
  
  console.log("Deployer/Signer address:", wallet.address);
  
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
  
  try {
    const backendVerifier = await contract.backendVerifier();
    const electionId = await contract.electionId();
    const owner = await contract.owner();
    const candidateCount = await contract.candidateCount();
    
    console.log("--- On-chain Contract State ---");
    console.log("backendVerifier:", backendVerifier);
    console.log("electionId:", electionId.toString());
    console.log("owner:", owner);
    console.log("candidateCount:", candidateCount.toString());
    
    console.log("\n--- Signature Check ---");
    console.log("Backend signs with wallet:", wallet.address);
    console.log("Match?", backendVerifier.toLowerCase() === wallet.address.toLowerCase());
    
    // Test signature generation
    const testAddress = wallet.address;
    const messageHash = ethers.solidityPackedKeccak256(
      ['address', 'uint256', 'string'],
      [testAddress, electionId, "CANDIDATE"]
    );
    const signature = await wallet.signMessage(ethers.getBytes(messageHash));
    
    // Verify recovery
    const recovered = ethers.verifyMessage(ethers.getBytes(messageHash), signature);
    console.log("\n--- Test Signature Recovery ---");
    console.log("Signed by:", wallet.address);
    console.log("Recovered:", recovered);
    console.log("Match:", recovered.toLowerCase() === wallet.address.toLowerCase());
    
  } catch (e) {
    console.error("Contract call failed:", e.message);
    console.log("Contract may not be deployed or may be at wrong address");
  }
}

main().catch(console.error);
