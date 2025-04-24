import { deployIgnition } from "@nomicfoundation/hardhat-ignition/deployment";
import { ethers } from "hardhat";
import dotenv from "dotenv";
import { execSync } from "child_process";

dotenv.config();

async function main() {
  // Get deployment environment
  const network = process.env.HARDHAT_NETWORK || "localhost";
  console.log(`Deploying to ${network}...`);

  // Validate environment variables
  validateEnvironmentVariables();

  try {
    // Deploy contracts using Ignition
    console.log("\nDeploying contracts...");
    const deployment = await deployIgnition("RentalCore");
    
    // Log deployed contract addresses
    console.log("\nDeployed contract addresses:");
    console.log("AccessControlManager:", deployment.getAddress("AccessControlManager"));
    console.log("ComplianceVerifier:", deployment.getAddress("ComplianceVerifier"));
    console.log("PaymentManager:", deployment.getAddress("PaymentManager"));
    console.log("RentalCore:", deployment.getAddress("RentalCore"));

    // For non-local networks, wait before verification
    if (network !== "localhost" && network !== "hardhat") {
      const verificationDelay = parseInt(process.env.VERIFICATION_DELAY || "60");
      console.log(`\nWaiting ${verificationDelay} seconds before verification...`);
      await new Promise(resolve => setTimeout(resolve, verificationDelay * 1000));
    }

    // Run verification script
    if (network !== "localhost" && network !== "hardhat") {
      console.log("\nRunning contract verification...");
      execSync("npx hardhat run scripts/verify-deployment.ts --network " + network, { 
        stdio: "inherit" 
      });
    }

    console.log("\nDeployment completed successfully!");
    
    // Return deployment info for testing purposes
    return {
      accessControlManager: deployment.getAddress("AccessControlManager"),
      complianceVerifier: deployment.getAddress("ComplianceVerifier"),
      paymentManager: deployment.getAddress("PaymentManager"),
      rentalCore: deployment.getAddress("RentalCore")
    };

  } catch (error) {
    console.error("\nDeployment failed:", error);
    process.exit(1);
  }
}

function validateEnvironmentVariables() {
  const requiredVars = [
    "RENTAL_ADMIN_ADDRESS",
    "COMPLIANCE_ADMIN_ADDRESS",
    "PAYMENT_ADMIN_ADDRESS"
  ];

  // Add network-specific required variables
  const network = process.env.HARDHAT_NETWORK;
  if (network && network !== "localhost" && network !== "hardhat") {
    requiredVars.push(
      `${network.toUpperCase()}_PRIVATE_KEY`,
      `${network.toUpperCase()}_RPC_URL`,
      "ETHERSCAN_API_KEY"
    );
  }

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error("\nMissing required environment variables:");
    missingVars.forEach(varName => console.error(`- ${varName}`));
    process.exit(1);
  }
}

// Execute deployment
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default main;