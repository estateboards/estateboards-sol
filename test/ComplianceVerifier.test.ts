import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { ComplianceVerifier, RentalCore, AccessControlManager } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("ComplianceVerifier", function () {
  // Test fixtures
  async function deployComplianceSystemFixture() {
    const [owner, admin, verifier, landlord, tenant] = await ethers.getSigners();

    // Deploy AccessControlManager
    const AccessControlManager = await ethers.getContractFactory("AccessControlManager");
    const accessManager = await AccessControlManager.deploy();

    // Deploy RentalCore (mock version for testing)
    const RentalCore = await ethers.getContractFactory("RentalCore");
    const rentalCore = await RentalCore.deploy(
      ethers.ZeroAddress,
      ethers.ZeroAddress,
      await accessManager.getAddress()
    );

    // Deploy ComplianceVerifier
    const ComplianceVerifier = await ethers.getContractFactory("ComplianceVerifier");
    const complianceVerifier = await ComplianceVerifier.deploy(
      await rentalCore.getAddress(),
      await accessManager.getAddress()
    );

    // Setup roles
    await accessManager.grantRole(ethers.keccak256(ethers.toUtf8Bytes("SYSTEM_ADMIN")), admin.address);

    // Set initial compliance parameters
    const initialParams = ethers.keccak256(ethers.toUtf8Bytes("initial_parameters"));
    await complianceVerifier.connect(admin).updateComplianceParameters(initialParams);

    return {
      complianceVerifier,
      rentalCore,
      accessManager,
      owner,
      admin,
      verifier,
      landlord,
      tenant,
      initialParams
    };
  }

  describe("Deployment", function () {
    it("Should deploy with correct dependencies", async function () {
      const { complianceVerifier, rentalCore, accessManager } = await loadFixture(deployComplianceSystemFixture);
      
      expect(await complianceVerifier.rentalCore()).to.equal(await rentalCore.getAddress());
      expect(await complianceVerifier.accessManager()).to.equal(await accessManager.getAddress());
    });

    it("Should set correct constants", async function () {
      const { complianceVerifier } = await loadFixture(deployComplianceSystemFixture);
      
      expect(await complianceVerifier.AGREEMENT_TYPE()).to.equal(1);
      expect(await complianceVerifier.PROPERTY_TYPE()).to.equal(2);
      expect(await complianceVerifier.LANDLORD_TYPE()).to.equal(3);
      expect(await complianceVerifier.TENANT_TYPE()).to.equal(4);
    });
  });

  describe("Verifier Management", function () {
    it("Should allow admin to authorize verifier", async function () {
      const { complianceVerifier, admin, verifier } = await loadFixture(deployComplianceSystemFixture);

      await expect(complianceVerifier.connect(admin).authorizeVerifier(verifier.address))
        .to.emit(complianceVerifier, "VerifierAuthorized")
        .withArgs(verifier.address);

      expect(await complianceVerifier.isAuthorizedVerifier(verifier.address)).to.be.true;
    });

    it("Should allow admin to revoke verifier", async function () {
      const { complianceVerifier, admin, verifier } = await loadFixture(deployComplianceSystemFixture);

      await complianceVerifier.connect(admin).authorizeVerifier(verifier.address);
      await expect(complianceVerifier.connect(admin).revokeVerifier(verifier.address))
        .to.emit(complianceVerifier, "VerifierRevoked")
        .withArgs(verifier.address);

      expect(await complianceVerifier.isAuthorizedVerifier(verifier.address)).to.be.false;
    });

    it("Should reject unauthorized verifier operations", async function () {
      const { complianceVerifier, verifier } = await loadFixture(deployComplianceSystemFixture);

      await expect(
        complianceVerifier.connect(verifier).authorizeVerifier(verifier.address)
      ).to.be.revertedWith("Not admin");
    });
  });

  describe("Compliance Parameters", function () {
    it("Should allow admin to update compliance parameters", async function () {
      const { complianceVerifier, admin } = await loadFixture(deployComplianceSystemFixture);
      
      const newParams = ethers.keccak256(ethers.toUtf8Bytes("new_parameters"));
      await expect(complianceVerifier.connect(admin).updateComplianceParameters(newParams))
        .to.emit(complianceVerifier, "ComplianceParametersUpdated")
        .withArgs(newParams, await ethers.provider.getBlock('latest').then(b => b!.timestamp));

      const [parametersHash, ] = await complianceVerifier.getCurrentParameters();
      expect(parametersHash).to.equal(newParams);
    });

    it("Should reject invalid compliance parameters", async function () {
      const { complianceVerifier, admin } = await loadFixture(deployComplianceSystemFixture);

      await expect(
        complianceVerifier.connect(admin).updateComplianceParameters(ethers.ZeroHash)
      ).to.be.revertedWith("Invalid parameters");
    });
  });

  describe("Oracle Management", function () {
    it("Should allow admin to register oracle", async function () {
      const { complianceVerifier, admin } = await loadFixture(deployComplianceSystemFixture);
      
      const oracleType = ethers.keccak256(ethers.toUtf8Bytes("LEGAL_STATUS"));
      const oracleAddress = ethers.Wallet.createRandom().address;

      await expect(complianceVerifier.connect(admin).registerOracle(oracleType, oracleAddress))
        .to.emit(complianceVerifier, "OracleRegistered")
        .withArgs(oracleType, oracleAddress);
    });

    it("Should reject invalid oracle registration", async function () {
      const { complianceVerifier, admin } = await loadFixture(deployComplianceSystemFixture);
      
      const oracleType = ethers.keccak256(ethers.toUtf8Bytes("LEGAL_STATUS"));

      await expect(
        complianceVerifier.connect(admin).registerOracle(oracleType, ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid oracle address");
    });
  });

  describe("Compliance Verification", function () {
    it("Should verify contract compliance", async function () {
      const { complianceVerifier, landlord, tenant } = await loadFixture(deployComplianceSystemFixture);
      
      const agreementId = 1n;
      const [passed, detailsHash] = await complianceVerifier.verifyContractCompliance(agreementId);

      expect(passed).to.be.true;
      expect(detailsHash).to.not.equal(ethers.ZeroHash);
    });

    it("Should verify landlord compliance", async function () {
      const { complianceVerifier, landlord } = await loadFixture(deployComplianceSystemFixture);
      
      const [passed, detailsHash] = await complianceVerifier.verifyLandlordCompliance(landlord.address);

      expect(passed).to.be.true;
      expect(detailsHash).to.not.equal(ethers.ZeroHash);

      const [statusPassed, , statusHash] = await complianceVerifier.getComplianceStatus(
        BigInt(landlord.address),
        await complianceVerifier.LANDLORD_TYPE()
      );
      expect(statusPassed).to.be.true;
      expect(statusHash).to.equal(detailsHash);
    });

    it("Should verify tenant compliance", async function () {
      const { complianceVerifier, tenant } = await loadFixture(deployComplianceSystemFixture);
      
      const [passed, detailsHash] = await complianceVerifier.verifyTenantCompliance(tenant.address);

      expect(passed).to.be.true;
      expect(detailsHash).to.not.equal(ethers.ZeroHash);

      const [statusPassed, , statusHash] = await complianceVerifier.getComplianceStatus(
        BigInt(tenant.address),
        await complianceVerifier.TENANT_TYPE()
      );
      expect(statusPassed).to.be.true;
      expect(statusHash).to.equal(detailsHash);
    });

    it("Should reject compliance check with invalid entity type", async function () {
      const { complianceVerifier } = await loadFixture(deployComplianceSystemFixture);
      
      const invalidEntityType = 5; // Higher than TENANT_TYPE
      await expect(
        complianceVerifier.getComplianceStatus(1, invalidEntityType)
      ).to.be.revertedWith("Invalid entity type");
    });

    it("Should reject compliance check without parameters", async function () {
      const { complianceVerifier, admin } = await loadFixture(deployComplianceSystemFixture);
      
      // Create new instance without parameters
      const ComplianceVerifier = await ethers.getContractFactory("ComplianceVerifier");
      const newVerifier = await ComplianceVerifier.deploy(
        await complianceVerifier.rentalCore(),
        await complianceVerifier.accessManager()
      );

      await expect(
        newVerifier.verifyContractCompliance(1)
      ).to.be.revertedWith("Compliance parameters not set");
    });
  });

  describe("Compliance History", function () {
    it("Should maintain compliance check history", async function () {
      const { complianceVerifier, landlord } = await loadFixture(deployComplianceSystemFixture);
      
      // Perform compliance check
      await complianceVerifier.verifyLandlordCompliance(landlord.address);

      // Verify history
      const [passed, timestamp, detailsHash] = await complianceVerifier.getComplianceStatus(
        BigInt(landlord.address),
        await complianceVerifier.LANDLORD_TYPE()
      );

      expect(passed).to.be.true;
      expect(timestamp).to.be.gt(0);
      expect(detailsHash).to.not.equal(ethers.ZeroHash);
    });
  });
});