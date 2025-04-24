import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { PaymentManager, RentalCore, AccessControlManager } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("PaymentManager", function () {
  // Test fixtures
  async function deployPaymentSystemFixture() {
    const [owner, landlord, tenant, admin] = await ethers.getSigners();

    // Deploy AccessControlManager
    const AccessControlManager = await ethers.getContractFactory("AccessControlManager");
    const accessManager = await AccessControlManager.deploy();

    // Deploy RentalCore (mock version for testing)
    const RentalCore = await ethers.getContractFactory("RentalCore");
    const rentalCore = await RentalCore.deploy(
      ethers.ZeroAddress, // We'll update this after PaymentManager deployment
      ethers.ZeroAddress,
      await accessManager.getAddress()
    );

    // Deploy PaymentManager
    const PaymentManager = await ethers.getContractFactory("PaymentManager");
    const paymentManager = await PaymentManager.deploy(
      await rentalCore.getAddress(),
      await accessManager.getAddress()
    );

    // Setup roles and permissions
    await accessManager.grantRole(ethers.keccak256(ethers.toUtf8Bytes("SYSTEM_ADMIN")), admin.address);
    await accessManager.grantRole(ethers.keccak256(ethers.toUtf8Bytes("PAYMENT_MANAGER")), admin.address);

    return {
      paymentManager,
      rentalCore,
      accessManager,
      owner,
      landlord,
      tenant,
      admin
    };
  }

  // Helper function to create an active rental agreement
  async function createActiveAgreement(
    rentalCore: RentalCore,
    landlord: HardhatEthersSigner,
    tenant: HardhatEthersSigner,
    rentAmount: bigint,
    depositAmount: bigint
  ) {
    const startDate = await time.latest() + 86400; // Start tomorrow
    const endDate = startDate + (86400 * 365); // 1 year duration
    const terms = ethers.keccak256(ethers.toUtf8Bytes("agreement_terms"));

    await rentalCore.connect(landlord).createAgreement(
      1, // propertyId
      tenant.address,
      terms,
      startDate,
      endDate,
      rentAmount,
      depositAmount
    );

    return 1n; // First agreement ID
  }

  describe("Deployment", function () {
    it("Should deploy with correct dependencies", async function () {
      const { paymentManager, rentalCore, accessManager } = await loadFixture(deployPaymentSystemFixture);
      
      expect(await paymentManager.rentalCore()).to.equal(await rentalCore.getAddress());
      expect(await paymentManager.accessManager()).to.equal(await accessManager.getAddress());
    });

    it("Should set correct constants", async function () {
      const { paymentManager } = await loadFixture(deployPaymentSystemFixture);
      
      expect(await paymentManager.LATE_FEE_PERCENTAGE()).to.equal(10);
      expect(await paymentManager.GRACE_PERIOD_DAYS()).to.equal(5);
      expect(await paymentManager.SECONDS_PER_DAY()).to.equal(86400);
    });
  });

  describe("Rent Payments", function () {
    it("Should process valid rent payment", async function () {
      const { paymentManager, rentalCore, tenant } = await loadFixture(deployPaymentSystemFixture);
      const rentAmount = ethers.parseEther("1");
      
      const agreementId = await createActiveAgreement(
        rentalCore,
        tenant, // Using tenant as landlord for simplicity
        tenant,
        rentAmount,
        ethers.parseEther("2")
      );

      await expect(paymentManager.connect(tenant).processRentPayment(agreementId, { value: rentAmount }))
        .to.emit(paymentManager, "RentPaymentProcessed")
        .withArgs(agreementId, rentAmount, tenant.address, await time.latest())
        .and.to.emit(paymentManager, "PaymentConfirmed")
        .withArgs(agreementId, rentAmount, 0); // 0 = Rent payment type
    });

    it("Should reject insufficient rent payment", async function () {
      const { paymentManager, rentalCore, tenant } = await loadFixture(deployPaymentSystemFixture);
      const rentAmount = ethers.parseEther("1");
      
      const agreementId = await createActiveAgreement(
        rentalCore,
        tenant,
        tenant,
        rentAmount,
        ethers.parseEther("2")
      );

      await expect(
        paymentManager.connect(tenant).processRentPayment(agreementId, { value: rentAmount / 2n })
      ).to.be.revertedWith("Insufficient payment");
    });
  });

  describe("Deposit Management", function () {
    it("Should process security deposit", async function () {
      const { paymentManager, rentalCore, tenant } = await loadFixture(deployPaymentSystemFixture);
      const depositAmount = ethers.parseEther("2");
      
      const agreementId = await createActiveAgreement(
        rentalCore,
        tenant,
        tenant,
        ethers.parseEther("1"),
        depositAmount
      );

      await expect(paymentManager.connect(tenant).processDeposit(agreementId, { value: depositAmount }))
        .to.emit(paymentManager, "DepositProcessed")
        .withArgs(agreementId, depositAmount, tenant.address)
        .and.to.emit(paymentManager, "PaymentConfirmed")
        .withArgs(agreementId, depositAmount, 1); // 1 = Deposit payment type

      expect(await paymentManager.getDepositBalance(agreementId)).to.equal(depositAmount);
    });

    it("Should release deposit to recipient", async function () {
      const { paymentManager, rentalCore, tenant, admin } = await loadFixture(deployPaymentSystemFixture);
      const depositAmount = ethers.parseEther("2");
      
      const agreementId = await createActiveAgreement(
        rentalCore,
        tenant,
        tenant,
        ethers.parseEther("1"),
        depositAmount
      );

      await paymentManager.connect(tenant).processDeposit(agreementId, { value: depositAmount });

      await expect(paymentManager.connect(admin).releaseDeposit(agreementId, depositAmount, tenant.address))
        .to.emit(paymentManager, "DepositReleased")
        .withArgs(agreementId, depositAmount, tenant.address)
        .and.to.changeEtherBalance(tenant, depositAmount);
    });
  });

  describe("Late Fees", function () {
    it("Should calculate late fees after grace period", async function () {
      const { paymentManager, rentalCore, tenant } = await loadFixture(deployPaymentSystemFixture);
      const rentAmount = ethers.parseEther("1");
      
      const agreementId = await createActiveAgreement(
        rentalCore,
        tenant,
        tenant,
        rentAmount,
        ethers.parseEther("2")
      );

      // Process initial rent payment
      await paymentManager.connect(tenant).processRentPayment(agreementId, { value: rentAmount });

      // Move time forward past grace period
      await time.increase(86400 * 6); // 6 days

      const [, lateFees] = await paymentManager.calculateOutstandingRent(agreementId);
      expect(lateFees).to.equal(rentAmount * 10n / 100n); // 10% late fee
    });

    it("Should not charge late fees within grace period", async function () {
      const { paymentManager, rentalCore, tenant } = await loadFixture(deployPaymentSystemFixture);
      const rentAmount = ethers.parseEther("1");
      
      const agreementId = await createActiveAgreement(
        rentalCore,
        tenant,
        tenant,
        rentAmount,
        ethers.parseEther("2")
      );

      await paymentManager.connect(tenant).processRentPayment(agreementId, { value: rentAmount });

      // Move time forward within grace period
      await time.increase(86400 * 4); // 4 days

      const [, lateFees] = await paymentManager.calculateOutstandingRent(agreementId);
      expect(lateFees).to.equal(0);
    });
  });

  describe("Payment History", function () {
    it("Should track payment history correctly", async function () {
      const { paymentManager, rentalCore, tenant } = await loadFixture(deployPaymentSystemFixture);
      const rentAmount = ethers.parseEther("1");
      const depositAmount = ethers.parseEther("2");
      
      const agreementId = await createActiveAgreement(
        rentalCore,
        tenant,
        tenant,
        rentAmount,
        depositAmount
      );

      // Make rent and deposit payments
      await paymentManager.connect(tenant).processRentPayment(agreementId, { value: rentAmount });
      await paymentManager.connect(tenant).processDeposit(agreementId, { value: depositAmount });

      const [timestamps, amounts, types] = await paymentManager.getPaymentHistory(agreementId);
      
      expect(amounts[0]).to.equal(rentAmount);
      expect(types[0]).to.equal(0); // Rent payment
      expect(amounts[1]).to.equal(depositAmount);
      expect(types[1]).to.equal(1); // Deposit payment
    });
  });

  describe("Emergency Controls", function () {
    it("Should allow emergency withdrawal by admin", async function () {
      const { paymentManager, rentalCore, tenant, admin } = await loadFixture(deployPaymentSystemFixture);
      const amount = ethers.parseEther("1");
      
      const agreementId = await createActiveAgreement(
        rentalCore,
        tenant,
        tenant,
        amount,
        amount
      );

      // Add some funds to contract
      await paymentManager.connect(tenant).processRentPayment(agreementId, { value: amount });

      await expect(paymentManager.connect(admin).emergencyWithdraw(admin.address))
        .to.changeEtherBalance(admin, amount);
    });

    it("Should reject unauthorized emergency withdrawal", async function () {
      const { paymentManager, tenant } = await loadFixture(deployPaymentSystemFixture);

      await expect(
        paymentManager.connect(tenant).emergencyWithdraw(tenant.address)
      ).to.be.revertedWith("Not authorized");
    });
  });
});