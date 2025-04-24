import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { keccak256, toBytes } from "viem";

export default buildModule("PaymentManagerModule", async (m) => {
  // Get the AccessControlManager deployment
  const { accessControlManager } = await m.useModule("AccessControl");

  // Deploy PaymentManager with temporary RentalCore address (will be updated later)
  const paymentManager = m.contract("PaymentManager", [
    m.getAddress("RENTAL_CORE_PLACEHOLDER"), // Temporary address, will be updated after RentalCore deployment
    accessControlManager
  ], {
    id: "deploy-payment-manager"
  });

  // Grant PAYMENT_MANAGER role to the payment admin
  const PAYMENT_MANAGER_ROLE = keccak256(toBytes("PAYMENT_MANAGER"));
  
  m.call(accessControlManager, "grantRole", [
    PAYMENT_MANAGER_ROLE,
    process.env.PAYMENT_ADMIN_ADDRESS || ""
  ], {
    id: "grant-payment-manager-role",
    after: [paymentManager]
  });

  return { paymentManager };
});