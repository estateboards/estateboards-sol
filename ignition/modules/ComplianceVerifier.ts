import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { keccak256, toBytes } from "viem";

export default buildModule("ComplianceVerifierModule", async (m) => {
  // Get the AccessControlManager deployment
  const { accessControlManager } = await m.useModule("AccessControl");

  // Deploy ComplianceVerifier with temporary RentalCore address (will be updated later)
  const complianceVerifier = m.contract("ComplianceVerifier", [
    m.getAddress("RENTAL_CORE_PLACEHOLDER"), // Temporary address, will be updated after RentalCore deployment
    accessControlManager
  ], {
    id: "deploy-compliance-verifier"
  });

  // Set initial compliance parameters
  const initialParamsHash = keccak256(
    toBytes("Initial compliance parameters v1.0")
  );

  m.call(complianceVerifier, "updateComplianceParameters", [
    initialParamsHash
  ], {
    id: "set-initial-parameters",
    after: [complianceVerifier]
  });

  // Authorize the compliance admin as a verifier
  m.call(complianceVerifier, "authorizeVerifier", [
    process.env.COMPLIANCE_ADMIN_ADDRESS || ""
  ], {
    id: "authorize-compliance-admin",
    after: ["set-initial-parameters"]
  });

  return { complianceVerifier };
});