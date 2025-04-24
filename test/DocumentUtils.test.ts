import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { DocumentUtils } from "../typechain-types";

describe("DocumentUtils", function () {
  let documentUtils: DocumentUtils;

  before(async function () {
    const DocumentUtils = await ethers.getContractFactory("DocumentUtils");
    documentUtils = await DocumentUtils.deploy();
  });

  describe("Agreement Hash Generation", function () {
    it("Should generate consistent agreement hash", async function () {
      const [landlord, tenant] = await ethers.getSigners();
      const propertyId = 1n;
      const startDate = await time.latest();
      const endDate = startDate + (365 * 86400);
      const rentAmount = ethers.parseEther("1000");
      const depositAmount = ethers.parseEther("2000");
      const additionalTerms = ethers.keccak256(ethers.toUtf8Bytes("Additional terms"));

      const hash = await documentUtils.generateAgreementHash(
        propertyId,
        landlord.address,
        tenant.address,
        startDate,
        endDate,
        rentAmount,
        depositAmount,
        additionalTerms
      );

      expect(hash).to.not.equal(ethers.ZeroHash);

      // Verify consistency
      const secondHash = await documentUtils.generateAgreementHash(
        propertyId,
        landlord.address,
        tenant.address,
        startDate,
        endDate,
        rentAmount,
        depositAmount,
        additionalTerms
      );

      expect(hash).to.equal(secondHash);
    });

    it("Should generate different hashes for different agreements", async function () {
      const [landlord, tenant1, tenant2] = await ethers.getSigners();
      const startDate = await time.latest();
      const endDate = startDate + (365 * 86400);
      const additionalTerms = ethers.keccak256(ethers.toUtf8Bytes("Additional terms"));

      const hash1 = await documentUtils.generateAgreementHash(
        1n,
        landlord.address,
        tenant1.address,
        startDate,
        endDate,
        ethers.parseEther("1000"),
        ethers.parseEther("2000"),
        additionalTerms
      );

      const hash2 = await documentUtils.generateAgreementHash(
        2n,
        landlord.address,
        tenant2.address,
        startDate,
        endDate,
        ethers.parseEther("1200"),
        ethers.parseEther("2400"),
        additionalTerms
      );

      expect(hash1).to.not.equal(hash2);
    });
  });

  describe("Property Hash Generation", function () {
    it("Should generate consistent property hash", async function () {
      const [owner] = await ethers.getSigners();
      const postalCode = 12345;
      const size = 100;
      const roomCount = 3;
      const features = ethers.keccak256(ethers.toUtf8Bytes("Property features"));
      const documents = [
        ethers.keccak256(ethers.toUtf8Bytes("Document 1")),
        ethers.keccak256(ethers.toUtf8Bytes("Document 2"))
      ];

      const hash = await documentUtils.generatePropertyHash(
        owner.address,
        postalCode,
        size,
        roomCount,
        features,
        documents
      );

      expect(hash).to.not.equal(ethers.ZeroHash);

      // Verify consistency
      const secondHash = await documentUtils.generatePropertyHash(
        owner.address,
        postalCode,
        size,
        roomCount,
        features,
        documents
      );

      expect(hash).to.equal(secondHash);
    });
  });

  describe("Amendment Hash Generation", function () {
    it("Should generate unique amendment hash", async function () {
      const agreementId = 1n;
      const amendmentType = 1; // e.g., rent change
      const timestamp = await time.latest();
      const changes = ethers.keccak256(ethers.toUtf8Bytes("Rent increase"));

      const hash = await documentUtils.generateAmendmentHash(
        agreementId,
        amendmentType,
        timestamp,
        changes
      );

      expect(hash).to.not.equal(ethers.ZeroHash);
    });

    it("Should generate different hashes for different amendments", async function () {
      const timestamp = await time.latest();
      
      const hash1 = await documentUtils.generateAmendmentHash(
        1n,
        1,
        timestamp,
        ethers.keccak256(ethers.toUtf8Bytes("Amendment 1"))
      );

      const hash2 = await documentUtils.generateAmendmentHash(
        1n,
        2,
        timestamp,
        ethers.keccak256(ethers.toUtf8Bytes("Amendment 2"))
      );

      expect(hash1).to.not.equal(hash2);
    });
  });

  describe("Inspection Hash Generation", function () {
    it("Should generate consistent inspection hash", async function () {
      const [inspector] = await ethers.getSigners();
      const propertyId = 1n;
      const timestamp = await time.latest();
      const condition = 1; // e.g., excellent condition
      const notes = ethers.keccak256(ethers.toUtf8Bytes("Inspection notes"));
      const images = [
        ethers.keccak256(ethers.toUtf8Bytes("Image 1")),
        ethers.keccak256(ethers.toUtf8Bytes("Image 2"))
      ];

      const hash = await documentUtils.generateInspectionHash(
        propertyId,
        inspector.address,
        timestamp,
        condition,
        notes,
        images
      );

      expect(hash).to.not.equal(ethers.ZeroHash);
    });
  });

  describe("Payment Hash Generation", function () {
    it("Should generate unique payment hash", async function () {
      const agreementId = 1n;
      const amount = ethers.parseEther("1000");
      const paymentType = 1; // e.g., rent payment
      const timestamp = await time.latest();
      const metadata = ethers.keccak256(ethers.toUtf8Bytes("Payment metadata"));

      const hash = await documentUtils.generatePaymentHash(
        agreementId,
        amount,
        paymentType,
        timestamp,
        metadata
      );

      expect(hash).to.not.equal(ethers.ZeroHash);
    });
  });

  describe("Dispute Hash Generation", function () {
    it("Should generate unique dispute hash", async function () {
      const [party1, party2] = await ethers.getSigners();
      const agreementId = 1n;
      const disputeType = 1; // e.g., maintenance dispute
      const timestamp = await time.latest();
      const parties = [party1.address, party2.address];
      const evidence = [
        ethers.keccak256(ethers.toUtf8Bytes("Evidence 1")),
        ethers.keccak256(ethers.toUtf8Bytes("Evidence 2"))
      ];

      const hash = await documentUtils.generateDisputeHash(
        agreementId,
        disputeType,
        timestamp,
        parties,
        evidence
      );

      expect(hash).to.not.equal(ethers.ZeroHash);
    });
  });

  describe("Document Verification", function () {
    it("Should verify matching document hashes", async function () {
      const documentHash = ethers.keccak256(ethers.toUtf8Bytes("Document content"));
      
      const matches = await documentUtils.verifyDocument(documentHash, documentHash);
      expect(matches).to.be.true;
    });

    it("Should reject non-matching document hashes", async function () {
      const originalHash = ethers.keccak256(ethers.toUtf8Bytes("Original content"));
      const modifiedHash = ethers.keccak256(ethers.toUtf8Bytes("Modified content"));
      
      const matches = await documentUtils.verifyDocument(originalHash, modifiedHash);
      expect(matches).to.be.false;
    });
  });

  describe("Document Hash Combination", function () {
    it("Should combine multiple document hashes", async function () {
      const hashes = [
        ethers.keccak256(ethers.toUtf8Bytes("Document 1")),
        ethers.keccak256(ethers.toUtf8Bytes("Document 2")),
        ethers.keccak256(ethers.toUtf8Bytes("Document 3"))
      ];

      const combinedHash = await documentUtils.combineDocumentHashes(hashes);
      expect(combinedHash).to.not.equal(ethers.ZeroHash);
    });

    it("Should generate different combined hashes for different orders", async function () {
      const hashes1 = [
        ethers.keccak256(ethers.toUtf8Bytes("Document 1")),
        ethers.keccak256(ethers.toUtf8Bytes("Document 2"))
      ];

      const hashes2 = [
        ethers.keccak256(ethers.toUtf8Bytes("Document 2")),
        ethers.keccak256(ethers.toUtf8Bytes("Document 1"))
      ];

      const combinedHash1 = await documentUtils.combineDocumentHashes(hashes1);
      const combinedHash2 = await documentUtils.combineDocumentHashes(hashes2);
      expect(combinedHash1).to.not.equal(combinedHash2);
    });
  });

  describe("Document ID Generation", function () {
    it("Should generate unique document IDs", async function () {
      const [creator] = await ethers.getSigners();
      const documentType = 1; // e.g., rental agreement
      const timestamp = await time.latest();
      const contentHash = ethers.keccak256(ethers.toUtf8Bytes("Document content"));

      const documentId = await documentUtils.generateDocumentId(
        documentType,
        creator.address,
        timestamp,
        contentHash
      );

      expect(documentId).to.not.equal(ethers.ZeroHash);
    });

    it("Should generate different IDs for different documents", async function () {
      const [creator] = await ethers.getSigners();
      const timestamp = await time.latest();

      const documentId1 = await documentUtils.generateDocumentId(
        1,
        creator.address,
        timestamp,
        ethers.keccak256(ethers.toUtf8Bytes("Content 1"))
      );

      const documentId2 = await documentUtils.generateDocumentId(
        2,
        creator.address,
        timestamp,
        ethers.keccak256(ethers.toUtf8Bytes("Content 2"))
      );

      expect(documentId1).to.not.equal(documentId2);
    });
  });
});