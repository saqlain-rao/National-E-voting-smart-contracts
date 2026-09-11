const { ethers } = require("ethers");
require("dotenv").config({ path: ".env" }); // backend env

const CONTRACT_ADDRESS = "0x8c87A403512F55Df8A02aD21a01A5203705b2586";

// Try decoding with the OLD struct layout
const ABI_OLD = [
  "function getAllCandidates() view returns (tuple(uint256 id, string name, string partyName, string proposal, uint256 voteCount)[])"
];

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI_OLD, provider);
  
  try {
    const candidates = await contract.getAllCandidates();
    console.log("SUCCESS OLD ABI! Candidates:");
    console.log(candidates);
  } catch (e) {
    console.error("Old ABI failed:", e.message);
  }
}

main().catch(console.error);
