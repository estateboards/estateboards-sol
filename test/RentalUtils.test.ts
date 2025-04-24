import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { RentalUtils } from "../typechain-types";

describe("RentalUtils", function () {
  let rentalUtils: RentalUtils;

  before(async function () {
    const RentalUtils = await ethers.getContractFactory("RentalUtils");
    rentalUtils = await RentalUtils.deploy();
  });

  describe("Constants", function () {
    it("Should have correct constant values", async function () {
      expect(await rentalUtils.MAX_DEPOSIT_MONTHS()).to.equal(3);
      expect(await rentalUtils.MIN_RENTAL_PERIOD_DAYS()).to.equal(30);
      expect(await rentalUtils.MAX_RENTAL_PERIOD_YEARS()).to.equal(10);
      expect(await rentalUtils.SECONDS_PER_DAY()).to.equal(86400);
      expect(await rentalUtils.DAYS_PER_YEAR()).to.equal(365);
      expect(await rentalUtils.DEFAULT_NOTICE_PERIOD_DAYS()).to.equal(30);
    });
  });

  describe("Rental Period Validation", function () {
    it("Should validate correct rental period", async function () {
      const startDate = await time.latest();
      const endDate = startDate + (90 * 86400); // 90 days rental

      const [valid, reason] = await rentalUtils.validateRentalPeriod(startDate, endDate);
      expect(valid).to.be.true;
      expect(reason).to.equal(0);
    });

    it("Should reject if end date before start date", async function () {
      const startDate = await time.latest();
      const endDate = startDate - 86400; // 1 day before

      const [valid, reason] = await rentalUtils.validateRentalPeriod(startDate, endDate);
      expect(valid).to.be.false;
      expect(reason).to.equal(1);
    });

    it("Should reject too short rental period", async function () {
      const startDate = await time.latest();
      const endDate = startDate + (20 * 86400); // 20 days rental

      const [valid, reason] = await rentalUtils.validateRentalPeriod(startDate, endDate);
      expect(valid).to.be.false;
      expect(reason).to.equal(2);
    });

    it("Should reject too long rental period", async function () {
      const startDate = await time.latest();
      const endDate = startDate + (11 * 365 * 86400); // 11 years rental

      const [valid, reason] = await rentalUtils.validateRentalPeriod(startDate, endDate);
      expect(valid).to.be.false;
      expect(reason).to.equal(3);
    });
  });

  describe("Deposit Validation", function () {
    it("Should validate correct deposit amount", async function () {
      const rentAmount = ethers.parseEther("1000"); // 1000 PLN rent
      const depositAmount = ethers.parseEther("2000"); // 2 months deposit

      const [valid, reason] = await rentalUtils.validateDeposit(rentAmount, depositAmount);
      expect(valid).to.be.true;
      expect(reason).to.equal(0);
    });

    it("Should reject zero deposit", async function () {
      const rentAmount = ethers.parseEther("1000");
      const depositAmount = ethers.parseEther("0");

      const [valid, reason] = await rentalUtils.validateDeposit(rentAmount, depositAmount);
      expect(valid).to.be.false;
      expect(reason).to.equal(1);
    });

    it("Should reject excessive deposit", async function () {
      const rentAmount = ethers.parseEther("1000");
      const depositAmount = ethers.parseEther("4000"); // 4 months deposit

      const [valid, reason] = await rentalUtils.validateDeposit(rentAmount, depositAmount);
      expect(valid).to.be.false;
      expect(reason).to.equal(2);
    });
  });

  describe("Notice Period Calculation", function () {
    it("Should return 7 days notice for short-term rental", async function () {
      const startDate = await time.latest();
      const currentTime = startDate + (60 * 86400); // 60 days after start

      const noticePeriod = await rentalUtils.calculateNoticePeriod(startDate, currentTime);
      expect(noticePeriod).to.equal(7);
    });

    it("Should return 14 days notice for medium-term rental", async function () {
      const startDate = await time.latest();
      const currentTime = startDate + (120 * 86400); // 120 days after start

      const noticePeriod = await rentalUtils.calculateNoticePeriod(startDate, currentTime);
      expect(noticePeriod).to.equal(14);
    });

    it("Should return 30 days notice for long-term rental", async function () {
      const startDate = await time.latest();
      const currentTime = startDate + (200 * 86400); // 200 days after start

      const noticePeriod = await rentalUtils.calculateNoticePeriod(startDate, currentTime);
      expect(noticePeriod).to.equal(30);
    });
  });

  describe("Late Fee Calculation", function () {
    it("Should calculate correct late fee", async function () {
      const amount = ethers.parseEther("1000");
      const daysLate = 10;

      const lateFee = await rentalUtils.calculateLateFee(amount, daysLate);
      // Expected fee: 1000 * 0.1185 * 10 / 365 ≈ 3.246 PLN
      expect(lateFee).to.be.closeTo(
        ethers.parseEther("3.246"),
        ethers.parseEther("0.001")
      );
    });

    it("Should return zero late fee for zero days late", async function () {
      const amount = ethers.parseEther("1000");
      const daysLate = 0;

      const lateFee = await rentalUtils.calculateLateFee(amount, daysLate);
      expect(lateFee).to.equal(0);
    });
  });

  describe("Rent Amount Validation", function () {
    it("Should validate correct rent amount", async function () {
      const rentAmount = ethers.parseEther("2000"); // 2000 PLN
      const propertySize = 50; // 50 square meters

      const [valid, reason] = await rentalUtils.validateRentAmount(rentAmount, propertySize);
      expect(valid).to.be.true;
      expect(reason).to.equal(0);
    });

    it("Should reject zero rent amount", async function () {
      const rentAmount = ethers.parseEther("0");
      const propertySize = 50;

      const [valid, reason] = await rentalUtils.validateRentAmount(rentAmount, propertySize);
      expect(valid).to.be.false;
      expect(reason).to.equal(1);
    });

    it("Should reject zero property size", async function () {
      const rentAmount = ethers.parseEther("2000");
      const propertySize = 0;

      const [valid, reason] = await rentalUtils.validateRentAmount(rentAmount, propertySize);
      expect(valid).to.be.false;
      expect(reason).to.equal(2);
    });

    it("Should reject rent too low for property size", async function () {
      const rentAmount = ethers.parseEther("100"); // 100 PLN
      const propertySize = 50;

      const [valid, reason] = await rentalUtils.validateRentAmount(rentAmount, propertySize);
      expect(valid).to.be.false;
      expect(reason).to.equal(3);
    });
  });

  describe("Utility Cost Calculation", function () {
    it("Should calculate correct utility cost distribution", async function () {
      const totalCost = ethers.parseEther("1000");
      const propertySize = 100;
      const unitSize = 25;

      const unitCost = await rentalUtils.calculateUtilityCost(totalCost, propertySize, unitSize);
      expect(unitCost).to.equal(ethers.parseEther("250")); // 25% of total cost
    });

    it("Should revert for zero property size", async function () {
      const totalCost = ethers.parseEther("1000");
      const propertySize = 0;
      const unitSize = 25;

      await expect(
        rentalUtils.calculateUtilityCost(totalCost, propertySize, unitSize)
      ).to.be.revertedWith("Invalid property size");
    });

    it("Should revert if unit size exceeds property size", async function () {
      const totalCost = ethers.parseEther("1000");
      const propertySize = 100;
      const unitSize = 150;

      await expect(
        rentalUtils.calculateUtilityCost(totalCost, propertySize, unitSize)
      ).to.be.revertedWith("Unit size exceeds property");
    });
  });

  describe("Termination Validation", function () {
    it("Should allow termination with no penalty for short remaining period", async function () {
      const startDate = await time.latest();
      const endDate = startDate + (180 * 86400);
      const currentTime = startDate + (120 * 86400); // 60 days remaining

      const [allowed, penalty] = await rentalUtils.validateTermination(startDate, endDate, currentTime);
      expect(allowed).to.be.true;
      expect(penalty).to.equal(0);
    });

    it("Should apply penalty for early termination", async function () {
      const startDate = await time.latest();
      const endDate = startDate + (365 * 86400);
      const currentTime = startDate + (30 * 86400); // 335 days remaining

      const [allowed, penalty] = await rentalUtils.validateTermination(startDate, endDate, currentTime);
      expect(allowed).to.be.true;
      expect(penalty).to.equal(2); // 2 months penalty
    });

    it("Should reject termination before start date", async function () {
      const startDate = (await time.latest()) + (30 * 86400); // Starts in 30 days
      const endDate = startDate + (365 * 86400);
      const currentTime = await time.latest();

      const [allowed, penalty] = await rentalUtils.validateTermination(startDate, endDate, currentTime);
      expect(allowed).to.be.false;
      expect(penalty).to.equal(0);
    });
  });

  describe("Postal Code Validation", function () {
    it("Should validate correct Polish postal code", async function () {
      const postalCode = 12345; // Represents 12-345

      const valid = await rentalUtils.validatePostalCode(postalCode);
      expect(valid).to.be.true;
    });

    it("Should reject invalid postal code format", async function () {
      const postalCode = 123456; // Too many digits

      const valid = await rentalUtils.validatePostalCode(postalCode);
      expect(valid).to.be.false;
    });

    it("Should reject postal code with invalid prefix", async function () {
      const postalCode = 1234; // Too few digits

      const valid = await rentalUtils.validatePostalCode(postalCode);
      expect(valid).to.be.false;
    });
  });
});