const { ethers } = require("ethers");
require("dotenv").config({ path: ".env" }); // backend env

const CONTRACT_ADDRESS = "0x8c87A403512F55Df8A02aD21a01A5203705b2586";
const ABI = [
  "function getAllCandidates() view returns (tuple(uint32 id, uint32 voteCount, bool isApproved, string name, string partyName, string proposal)[])"
];

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
  
  try {
    const candidates = await contract.getAllCandidates();
    console.log("SUCCESS! Candidates:");
    console.log(candidates);
  } catch (e) {
    console.error("Contract call failed:", e);
  }
}

main().catch(console.error);
