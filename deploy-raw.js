const { ethers } = require("ethers");
const fs = require("fs");
require("dotenv").config();

async function main() {
  console.log("Connecting to RPC...");
  const provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
  
  console.log("Loading wallet...");
  const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
  console.log("Deployer address:", wallet.address);

  const balance = await provider.getBalance(wallet.address);
  console.log("Deployer balance:", ethers.formatEther(balance), "ETH");

  if (balance === 0n) {
    throw new Error("Insufficient funds to deploy!");
  }

  console.log("Reading artifact...");
  const artifactPath = "./artifacts/contracts/Election.sol/Election.json";
  if (!fs.existsSync(artifactPath)) {
    throw new Error("Artifact not found! Compile contracts first.");
  }
  
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  
  console.log("Creating ContractFactory...");
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);

  console.log("Fetching fee data...");
  const feeData = await provider.getFeeData();
  console.log("Fee data:", { gasPrice: feeData.gasPrice, maxFeePerGas: feeData.maxFeePerGas });
  
  const nonce = await provider.getTransactionCount(wallet.address, "pending");
  console.log("Using nonce:", nonce);

  console.log("Deploying contract with higher gas to replace stuck tx...");
  const txRequest = await factory.getDeployTransaction();
  txRequest.nonce = nonce;
  txRequest.gasLimit = 6000000;
  txRequest.maxFeePerGas = 3500000000n; // 3.5 gwei
  txRequest.maxPriorityFeePerGas = 1500000000n; // 1.5 gwei
  
  const txRes = await wallet.sendTransaction(txRequest);
  console.log("Tx hash:", txRes.hash);
  
  console.log("Waiting for deployment transaction...");
  const receipt = await txRes.wait();
  
  const address = receipt.contractAddress;
  console.log("Contract successfully deployed to:", address);

  const ADMIN_ADDRESS = "0x449F48A20CF8c3E9B738D9c88942a3E6bCe1aA95";
  console.log("Initializing...");
  
  const contract = new ethers.Contract(address, artifact.abi, wallet);
  const tx = await contract.initialize(1, ADMIN_ADDRESS, wallet.address, {
    gasLimit: 300000,
    maxFeePerGas: 1000000000n,
    maxPriorityFeePerGas: 500000000n
  });
  await tx.wait();
  console.log("Initialized!");
  
  console.log(`\n\n--- SUCCESS ---`);
  console.log(`NEW_ADDRESS=${address}`);
}

main().catch(console.error);
