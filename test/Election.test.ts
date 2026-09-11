import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("Election and EVotingToken Integration", function () {
  let evotingToken: any;
  let election: any;
  let admin: any;
  let voter1: any;
  let voter2: any;
  let candidate1: any;
  let nonAdmin: any;

  beforeEach(async function () {
    [admin, voter1, voter2, candidate1, nonAdmin] = await ethers.getSigners();

    // Deploy EVotingToken
    const EVotingToken = await ethers.getContractFactory("EVotingToken");
    evotingToken = await upgrades.deployProxy(EVotingToken, [admin.address], { kind: 'uups' });

    // Deploy Election
    const Election = await ethers.getContractFactory("Election");
    election = await upgrades.deployProxy(Election, [admin.address, await evotingToken.getAddress()], { kind: 'uups' });

    // Setup candidate and tokens
    await election.connect(admin).registerCandidate(1, 100);
    await evotingToken.connect(admin).safeMint(voter1.address);
  });

  it("Transfer Attack: Voter attempts to transfer their E-Voting Token to another wallet (must revert)", async function () {
    const tokenId = 0; // First minted token
    await expect(
      evotingToken.connect(voter1).transferFrom(voter1.address, voter2.address, tokenId)
    ).to.be.revertedWith("EVotingToken: Non-transferable");
  });

  it("Time-Manipulation Attack: Attempt to vote before startTime or after endTime (must revert)", async function () {
    await election.connect(admin).startElection(1, 10); // 10 minutes duration

    // Increase time to exactly endTime
    await time.increase(10 * 60);

    await expect(
      election.connect(voter1).castVote(1, 100)
    ).to.be.revertedWith("Not in voting period");
  });

  it("Duplicate Vote Attack: Voter successfully casts a vote, then attempts a second vote (must revert)", async function () {
    await election.connect(admin).startElection(1, 10);

    // Vote 1 - success
    await election.connect(voter1).castVote(1, 100);

    // Vote 2 - fail
    await expect(
      election.connect(voter1).castVote(1, 100)
    ).to.be.revertedWith("Voter has already voted");
  });

  it("Draw State: Two candidates receive exact same votes; verify finalizeElection accurately emits ElectionDraw", async function () {
    await election.connect(admin).registerCandidate(2, 100);
    await election.connect(admin).registerCandidate(2, 200);

    await evotingToken.connect(admin).safeMint(voter2.address);

    await election.connect(admin).startElection(2, 10);

    await election.connect(voter1).castVote(2, 100);
    await election.connect(voter2).castVote(2, 200);

    await time.increase(11 * 60); // past end time

    await expect(election.connect(admin).finalizeElection(2, [100, 200]))
      .to.emit(election, "ElectionDraw")
      .withArgs(2);
  });

  it("Unauthorized Upgrade: A non-admin attempts to upgrade the UUPS proxy (must revert)", async function () {
    const ElectionV2 = await ethers.getContractFactory("Election", nonAdmin);
    
    await expect(
      upgrades.upgradeProxy(await election.getAddress(), ElectionV2)
    ).to.be.revertedWithCustomError(election, "AccessControlUnauthorizedAccount");
  });
});
