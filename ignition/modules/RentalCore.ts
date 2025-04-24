import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { keccak256, toBytes } from "viem";

export default buildModule("RentalCoreModule", async (m) => {
  // Get the dependency deployments
  const { accessControlManager } = await m.useModule("AccessControl");
  const { complianceVerifier } = await m.useModule("ComplianceVerifier");
  const { paymentManager } = await m.useModule("PaymentManager");

  // Deploy RentalCore with all dependencies
  const rentalCore = m.contract("RentalCore", [
    paymentManager,
    complianceVerifier,
    accessControlManager
  ], {
    id: "deploy-rental-core"
  });

  // Update RentalCore address in ComplianceVerifier
  m.call(complianceVerifier, "rentalCore", [rentalCore], {
    id: "update-compliance-verifier-core",
    after: [rentalCore]
  });

  // Update RentalCore address in PaymentManager
  m.call(paymentManager, "rentalCore", [rentalCore], {
    id: "update-payment-manager-core",
    after: [rentalCore]
  });

  // Set up required permissions
  const REGISTER_PROPERTY_PERMISSION = keccak256(toBytes("REGISTER_PROPERTY"));
  const UPDATE_AGREEMENT_PERMISSION = keccak256(toBytes("UPDATE_AGREEMENT"));
  const SYSTEM_ADMIN_ROLE = keccak256(toBytes("SYSTEM_ADMIN"));

  // Grant REGISTER_PROPERTY permission to rental admin
  m.call(accessControlManager, "grantPermission", [
    process.env.RENTAL_ADMIN_ADDRESS || "",
    REGISTER_PROPERTY_PERMISSION
  ], {
    id: "grant-register-property-permission",
    after: [rentalCore]
  });

  // Grant UPDATE_AGREEMENT permission to rental admin
  m.call(accessControlManager, "grantPermission", [
    process.env.RENTAL_ADMIN_ADDRESS || "",
    UPDATE_AGREEMENT_PERMISSION
  ], {
    id: "grant-update-agreement-permission",
    after: ["grant-register-property-permission"]
  });

  // Grant SYSTEM_ADMIN role if not already granted
  m.call(accessControlManager, "grantRole", [
    SYSTEM_ADMIN_ROLE,
    process.env.RENTAL_ADMIN_ADDRESS || ""
  ], {
    id: "grant-system-admin-role",
    after: ["grant-update-agreement-permission"]
  });

  return { rentalCore };
});