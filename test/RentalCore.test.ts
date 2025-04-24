import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { RentalCore, PaymentManager, ComplianceVerifier, AccessControlManager } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("RentalCore", function () {
  // Test fixtures
  async function deployRentalSystemFixture() {
    const [owner, landlord, tenant, admin] = await ethers.getSigners();

    // Deploy AccessControlManager first
    const AccessControlManager = await ethers.getContractFactory("AccessControlManager");
    const accessManager = await AccessControlManager.deploy();

    // Deploy PaymentManager
    const PaymentManager = await ethers.getContractFactory("PaymentManager");
    const paymentManager = await PaymentManager.deploy();

    // Deploy ComplianceVerifier
    const ComplianceVerifier = await ethers.getContractFactory("ComplianceVerifier");
    const complianceVerifier = await ComplianceVerifier.deploy();

    // Deploy RentalCore
    const RentalCore = await ethers.getContractFactory("RentalCore");
    const rentalCore = await RentalCore.deploy(
      await paymentManager.getAddress(),
      await complianceVerifier.getAddress(),
      await accessManager.getAddress()
    );

    // Setup roles and permissions
    await accessManager.grantRole(ethers.keccak256(ethers.toUtf8Bytes("SYSTEM_ADMIN")), admin.address);
    await accessManager.grantPermission(landlord.address, ethers.keccak256(ethers.toUtf8Bytes("REGISTER_PROPERTY")));

    return {
      rentalCore,
      paymentManager,
      complianceVerifier,
      accessManager,
      owner,
      landlord,
      tenant,
      admin
    };
  }

  // Test groups
  describe("Deployment", function () {
    it("Should deploy with correct dependencies", async function () {
      const { rentalCore, paymentManager, complianceVerifier, accessManager } = await loadFixture(deployRentalSystemFixture);
      
      expect(await rentalCore.paymentManager()).to.equal(await paymentManager.getAddress());
      expect(await rentalCore.complianceVerifier()).to.equal(await complianceVerifier.getAddress());
      expect(await rentalCore.accessManager()).to.equal(await accessManager.getAddress());
    });

    it("Should revert deployment with zero addresses", async function () {
      const RentalCore = await ethers.getContractFactory("RentalCore");
      const zeroAddress = "0x0000000000000000000000000000000000000000";

      await expect(RentalCore.deploy(zeroAddress, zeroAddress, zeroAddress))
        .to.be.revertedWith("Invalid payment manager");
    });
  });

  describe("Property Registration", function () {
    it("Should allow authorized users to register property", async function () {
      const { rentalCore, landlord } = await loadFixture(deployRentalSystemFixture);
      const dataHash = ethers.keccak256(ethers.toUtf8Bytes("property_data"));

      await expect(rentalCore.connect(landlord).registerProperty(dataHash))
        .to.emit(rentalCore, "PropertyRegistered")
        .withArgs(1, landlord.address, dataHash);

      const [owner, storedHash, isActive] = await rentalCore.getPropertyDetails(1);
      expect(owner).to.equal(landlord.address);
      expect(storedHash).to.equal(dataHash);
      expect(isActive).to.be.true;
    });

    it("Should revert when unauthorized user tries to register property", async function () {
      const { rentalCore, tenant } = await loadFixture(deployRentalSystemFixture);
      const dataHash = ethers.keccak256(ethers.toUtf8Bytes("property_data"));

      await expect(rentalCore.connect(tenant).registerProperty(dataHash))
        .to.be.revertedWith("No permission");
    });

    it("Should revert with invalid property data", async function () {
      const { rentalCore, landlord } = await loadFixture(deployRentalSystemFixture);
      const zeroHash = ethers.ZeroHash;

      await expect(rentalCore.connect(landlord).registerProperty(zeroHash))
        .to.be.revertedWith("Invalid property data");
    });
  });

  describe("Agreement Creation", function () {
    async function setupPropertyFixture() {
      const base = await deployRentalSystemFixture();
      const dataHash = ethers.keccak256(ethers.toUtf8Bytes("property_data"));
      await base.rentalCore.connect(base.landlord).registerProperty(dataHash);
      return { ...base, propertyId: 1n, dataHash };
    }

    it("Should create rental agreement with valid parameters", async function () {
      const { rentalCore, landlord, tenant, propertyId } = await loadFixture(setupPropertyFixture);
      
      const terms = ethers.keccak256(ethers.toUtf8Bytes("agreement_terms"));
      const startDate = Math.floor(Date.now() / 1000) + 86400; // tomorrow
      const endDate = startDate + (86400 * 365); // 1 year
      const rentAmount = ethers.parseEther("1");
      const depositAmount = ethers.parseEther("2");

      await expect(rentalCore.connect(landlord).createAgreement(
        propertyId,
        tenant.address,
        terms,
        startDate,
        endDate,
        rentAmount,
        depositAmount
      )).to.emit(rentalCore, "AgreementCreated")
        .withArgs(1, propertyId, landlord.address, tenant.address);

      const agreement = await rentalCore.getAgreementDetails(1);
      expect(agreement.propertyId).to.equal(propertyId);
      expect(agreement.landlord).to.equal(landlord.address);
      expect(agreement.tenant).to.equal(tenant.address);
      expect(agreement.startDate).to.equal(startDate);
      expect(agreement.endDate).to.equal(endDate);
      expect(agreement.rentAmount).to.equal(rentAmount);
      expect(agreement.depositAmount).to.equal(depositAmount);
      expect(agreement.status).to.equal(0); // Pending
      expect(agreement.termsHash).to.equal(terms);
    });

    it("Should revert when non-owner tries to create agreement", async function () {
      const { rentalCore, tenant, propertyId } = await loadFixture(setupPropertyFixture);
      
      const terms = ethers.keccak256(ethers.toUtf8Bytes("agreement_terms"));
      const startDate = Math.floor(Date.now() / 1000) + 86400;
      const endDate = startDate + (86400 * 365);

      await expect(rentalCore.connect(tenant).createAgreement(
        propertyId,
        tenant.address,
        terms,
        startDate,
        endDate,
        ethers.parseEther("1"),
        ethers.parseEther("2")
      )).to.be.revertedWith("Not property owner");
    });
  });

  describe("Agreement Termination", function () {
    async function setupAgreementFixture() {
      const base = await setupPropertyFixture();
      const terms = ethers.keccak256(ethers.toUtf8Bytes("agreement_terms"));
      const startDate = Math.floor(Date.now() / 1000) + 86400;
      const endDate = startDate + (86400 * 365);
      
      await base.rentalCore.connect(base.landlord).createAgreement(
        base.propertyId,
        base.tenant.address,
        terms,
        startDate,
        endDate,
        ethers.parseEther("1"),
        ethers.parseEther("2")
      );

      // Set agreement to active
      await base.rentalCore.connect(base.admin).updateAgreementStatus(1, 1); // Active status

      return { ...base, agreementId: 1n };
    }

    it("Should allow landlord to terminate active agreement", async function () {
      const { rentalCore, landlord, agreementId } = await loadFixture(setupAgreementFixture);

      await expect(rentalCore.connect(landlord).terminateAgreement(agreementId))
        .to.emit(rentalCore, "AgreementStatusUpdated")
        .withArgs(agreementId, 2); // Terminated status

      const agreement = await rentalCore.getAgreementDetails(agreementId);
      expect(agreement.status).to.equal(2); // Terminated
    });

    it("Should allow tenant to terminate active agreement", async function () {
      const { rentalCore, tenant, agreementId } = await loadFixture(setupAgreementFixture);

      await expect(rentalCore.connect(tenant).terminateAgreement(agreementId))
        .to.emit(rentalCore, "AgreementStatusUpdated")
        .withArgs(agreementId, 2); // Terminated status
    });

    it("Should revert when non-party tries to terminate agreement", async function () {
      const { rentalCore, owner, agreementId } = await loadFixture(setupAgreementFixture);

      await expect(rentalCore.connect(owner).terminateAgreement(agreementId))
        .to.be.revertedWith("Not agreement party");
    });
  });

  describe("Emergency Controls", function () {
    it("Should allow admin to trigger emergency shutdown", async function () {
      const { rentalCore, admin } = await loadFixture(deployRentalSystemFixture);

      await expect(rentalCore.connect(admin).emergencyShutdown())
        .to.emit(rentalCore, "EmergencyShutdown")
        .withArgs(admin.address, await ethers.provider.getBlock('latest').then(b => b!.timestamp));
    });

    it("Should prevent operations when paused", async function () {
      const { rentalCore, admin, landlord } = await loadFixture(deployRentalSystemFixture);
      
      await rentalCore.connect(admin).emergencyShutdown();
      
      const dataHash = ethers.keccak256(ethers.toUtf8Bytes("property_data"));
      await expect(rentalCore.connect(landlord).registerProperty(dataHash))
        .to.be.revertedWith("Pausable: paused");
    });

    it("Should allow admin to resume operations", async function () {
      const { rentalCore, admin, landlord } = await loadFixture(deployRentalSystemFixture);
      
      await rentalCore.connect(admin).emergencyShutdown();
      await rentalCore.connect(admin).resumeOperation();
      
      const dataHash = ethers.keccak256(ethers.toUtf8Bytes("property_data"));
      await expect(rentalCore.connect(landlord).registerProperty(dataHash))
        .to.emit(rentalCore, "PropertyRegistered");
    });
  });
});