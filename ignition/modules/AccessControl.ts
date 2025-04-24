import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("AccessControlModule", (m) => {
  const accessControlManager = m.contract("AccessControlManager", [], {
    // Set contract deployment args if needed
  });

  // Set up initial admin role
  m.call(accessControlManager, "grantRole", [
    m.getVariable("DEFAULT_ADMIN_ROLE"),
    process.env.RENTAL_ADMIN_ADDRESS || "",
  ], {
    id: "grant-admin-role",
    after: [accessControlManager],
  });

  return { accessControlManager };
});