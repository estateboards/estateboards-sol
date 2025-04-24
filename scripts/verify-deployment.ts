import { ethers } from "hardhat";
import { keccak256, toBytes } from "viem";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("Starting deployment verification...");

  // Get deployed contract addresses from deployment artifacts
  const accessControlManager = await ethers.getContract("AccessControlManager");
  const complianceVerifier = await ethers.getContract("ComplianceVerifier");
  const paymentManager = await ethers.getContract("PaymentManager");
  const rentalCore = await ethers.getContract("RentalCore");

  console.log("\nVerifying contract deployments on block explorer...");
  
  // Verify contracts on block explorer
  try {
    await verifyContract("AccessControlManager", accessControlManager.address, []);
    await verifyContract("ComplianceVerifier", complianceVerifier.address, [
      rentalCore.address,
      accessControlManager.address
    ]);
    await verifyContract("PaymentManager", paymentManager.address, [
      rentalCore.address,
      accessControlManager.address
    ]);
    await verifyContract("RentalCore", rentalCore.address, [
      paymentManager.address,
      complianceVerifier.address,
      accessControlManager.address
    ]);
  } catch (error) {
    console.log("Verification error:", error);
    console.log("Continuing with state verification...");
  }

  console.log("\nVerifying contract state and initialization...");

  // Verify contract references
  console.log("\nVerifying contract references...");
  const cvRentalCore = await complianceVerifier.rentalCore();
  const cvAccessManager = await complianceVerifier.accessManager();
  const pmRentalCore = await paymentManager.rentalCore();
  const pmAccessManager = await paymentManager.accessManager();
  const rcPaymentManager = await rentalCore.paymentManager();
  const rcComplianceVerifier = await rentalCore.complianceVerifier();
  const rcAccessManager = await rentalCore.accessManager();

  console.assert(
    cvRentalCore === rentalCore.address,
    "Invalid RentalCore reference in ComplianceVerifier"
  );
  console.assert(
    cvAccessManager === accessControlManager.address,
    "Invalid AccessControlManager reference in ComplianceVerifier"
  );
  console.assert(
    pmRentalCore === rentalCore.address,
    "Invalid RentalCore reference in PaymentManager"
  );
  console.assert(
    pmAccessManager === accessControlManager.address,
    "Invalid AccessControlManager reference in PaymentManager"
  );
  console.assert(
    rcPaymentManager === paymentManager.address,
    "Invalid PaymentManager reference in RentalCore"
  );
  console.assert(
    rcComplianceVerifier === complianceVerifier.address,
    "Invalid ComplianceVerifier reference in RentalCore"
  );
  console.assert(
    rcAccessManager === accessControlManager.address,
    "Invalid AccessControlManager reference in RentalCore"
  );

  // Verify roles and permissions
  console.log("\nVerifying roles and permissions...");
  const rentalAdmin = process.env.RENTAL_ADMIN_ADDRESS;
  const complianceAdmin = process.env.COMPLIANCE_ADMIN_ADDRESS;
  const paymentAdmin = process.env.PAYMENT_ADMIN_ADDRESS;

  if (!rentalAdmin || !complianceAdmin || !paymentAdmin) {
    throw new Error("Missing admin addresses in environment variables");
  }

  const SYSTEM_ADMIN_ROLE = keccak256(toBytes("SYSTEM_ADMIN"));
  const PAYMENT_MANAGER_ROLE = keccak256(toBytes("PAYMENT_MANAGER"));
  const REGISTER_PROPERTY_PERMISSION = keccak256(toBytes("REGISTER_PROPERTY"));
  const UPDATE_AGREEMENT_PERMISSION = keccak256(toBytes("UPDATE_AGREEMENT"));

  const hasSystemAdminRole = await accessControlManager.hasRole(rentalAdmin, SYSTEM_ADMIN_ROLE);
  const hasPaymentManagerRole = await accessControlManager.hasRole(paymentAdmin, PAYMENT_MANAGER_ROLE);
  const hasRegisterPropertyPermission = await accessControlManager.hasPermission(rentalAdmin, REGISTER_PROPERTY_PERMISSION);
  const hasUpdateAgreementPermission = await accessControlManager.hasPermission(rentalAdmin, UPDATE_AGREEMENT_PERMISSION);
  const isAuthorizedVerifier = await complianceVerifier.isAuthorizedVerifier(complianceAdmin);

  console.assert(hasSystemAdminRole, "Rental admin missing SYSTEM_ADMIN role");
  console.assert(hasPaymentManagerRole, "Payment admin missing PAYMENT_MANAGER role");
  console.assert(hasRegisterPropertyPermission, "Rental admin missing REGISTER_PROPERTY permission");
  console.assert(hasUpdateAgreementPermission, "Rental admin missing UPDATE_AGREEMENT permission");
  console.assert(isAuthorizedVerifier, "Compliance admin not authorized as verifier");

  console.log("\nVerification completed successfully!");
}

async function verifyContract(
  name: string,
  address: string,
  constructorArguments: any[]
) {
  console.log(`Verifying ${name}...`);
  try {
    await ethers.verify(address, constructorArguments);
    console.log(`${name} verified successfully`);
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log(`${name} already verified`);
    } else {
      throw error;
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });