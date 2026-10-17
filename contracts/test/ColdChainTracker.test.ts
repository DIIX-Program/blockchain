import { expect } from "chai";
import { ethers } from "hardhat";
import { ColdChainTracker } from "../typechain-types";

describe("ColdChainTracker", function () {
  let tracker: ColdChainTracker;
  let owner: any;
  let worker: any;
  let unauthorized: any;

  beforeEach(async function () {
    [owner, worker, unauthorized] = await ethers.getSigners();

    const ColdChainTrackerFactory = await ethers.getContractFactory("ColdChainTracker");
    tracker = (await ColdChainTrackerFactory.deploy()) as ColdChainTracker;
    await tracker.waitForDeployment();

    // Authorize worker
    await tracker.setWorkerAuthorization(worker.address, true);
  });

  it("should initialize owner properly", async function () {
    expect(await tracker.owner()).to.equal(owner.address);
  });

  it("should allow authorized worker to anchor batch data hash", async function () {
    const batchId = ethers.encodeBytes32String("BATCH-2026-001");
    const testHash = ethers.keccak256(ethers.toUtf8Bytes("canonical-sensor-data"));

    await expect(tracker.connect(worker).anchorBatchData(batchId, testHash, 10, "1.0.0"))
      .to.emit(tracker, "BatchDataAnchored");

    const record = await tracker.getBatchAnchor(batchId);
    expect(record.exists).to.be.true;
    expect(record.dataHash).to.equal(testHash);
    expect(record.submitter).to.equal(worker.address);
    expect(record.readingCount).to.equal(10);
  });

  it("should reject unauthorized anchor attempts", async function () {
    const batchId = ethers.encodeBytes32String("BATCH-2026-002");
    const testHash = ethers.keccak256(ethers.toUtf8Bytes("unauthorized-data"));

    await expect(
      tracker.connect(unauthorized).anchorBatchData(batchId, testHash, 5, "1.0.0")
    ).to.be.revertedWith("ColdChainTracker: caller is not authorized");
  });
});
