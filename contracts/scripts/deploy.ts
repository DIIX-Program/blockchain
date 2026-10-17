import { ethers } from "hardhat";

async function main() {
  console.log("Deploying ColdChainTracker contract...");

  const ColdChainTracker = await ethers.getContractFactory("ColdChainTracker");
  const tracker = await ColdChainTracker.deploy();
  await tracker.waitForDeployment();

  const address = await tracker.getAddress();
  console.log(`✅ ColdChainTracker deployed successfully to: ${address}`);
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
