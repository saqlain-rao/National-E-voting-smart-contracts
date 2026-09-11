import hre from "hardhat";
const { ethers } = hre;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const ADMIN_ADDRESS = "0x449F48A20CF8c3E9B738D9c88942a3E6bCe1aA95";
  const BACKEND_VERIFIER = deployer.address;
  
  // 1. Deploy Election Implementation
  console.log("Deploying Election Implementation...");
  const Election = await ethers.getContractFactory("Election");
  const electionImpl = await Election.deploy();
  await electionImpl.waitForDeployment();
  const electionImplAddress = await electionImpl.getAddress();
  console.log("Election Implementation deployed to:", electionImplAddress);

  // 2. Deploy ElectionFactory
  console.log("Deploying ElectionFactory...");
  const ElectionFactory = await ethers.getContractFactory("ElectionFactory");
  const factory = await hre.upgrades.deployProxy(ElectionFactory, [electionImplAddress], { kind: 'uups' });
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("ElectionFactory deployed to:", factoryAddress);


  // 4. Create first Election
  console.log("Creating first Election (ID: 1)...");
  let tx = await factory.createElection(1, BACKEND_VERIFIER);
  const receipt = await tx.wait();
  
  // Find the ElectionCreated event to get the proxy address
  const event = receipt?.logs.find((log: any) => {
    try {
      const parsed = factory.interface.parseLog(log);
      return parsed?.name === 'ElectionCreated';
    } catch {
      return false;
    }
  });

  const parsedEvent = factory.interface.parseLog(event as any);
  const electionAddress = parsedEvent?.args[1];

  console.log("--- Deployment Complete ---");
  console.log(`ELECTION_FACTORY=${factoryAddress}`);
  console.log(`ELECTION_PROXY=${electionAddress}`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exitCode = 1;
});
