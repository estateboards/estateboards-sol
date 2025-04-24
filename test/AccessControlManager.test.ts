import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { AccessControlManager } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("AccessControlManager", function () {
  // Test fixtures
  async function deployAccessControlFixture() {
    const [owner, admin, landlord, tenant, broker, propertyManager, legalVerifier] = await ethers.getSigners();

    const AccessControlManager = await ethers.getContractFactory("AccessControlManager");
    const accessManager = await AccessControlManager.deploy();

    // Get role hashes
    const SYSTEM_ADMIN = await accessManager.SYSTEM_ADMIN();
    const LANDLORD = await accessManager.LANDLORD();
    const TENANT = await accessManager.TENANT();
    const BROKER = await accessManager.BROKER();
    const PROPERTY_MANAGER = await accessManager.PROPERTY_MANAGER();
    const LEGAL_VERIFIER = await accessManager.LEGAL_VERIFIER();

    // Get permission hashes
    const REGISTER_PROPERTY = await accessManager.REGISTER_PROPERTY();
    const CREATE_AGREEMENT = await accessManager.CREATE_AGREEMENT();
    const UPDATE_AGREEMENT = await accessManager.UPDATE_AGREEMENT();
    const PROCESS_PAYMENT = await accessManager.PROCESS_PAYMENT();
    const ACCESS_PAYMENT_HISTORY = await accessManager.ACCESS_PAYMENT_HISTORY();
    const VERIFY_COMPLIANCE = await accessManager.VERIFY_COMPLIANCE();
    const TRANSFER_OWNERSHIP = await accessManager.TRANSFER_OWNERSHIP();
    const TERMINATE_AGREEMENT = await accessManager.TERMINATE_AGREEMENT();
    const UPDATE_SYSTEM = await accessManager.UPDATE_SYSTEM();

    return {
      accessManager,
      owner,
      admin,
      landlord,
      tenant,
      broker,
      propertyManager,
      legalVerifier,
      roles: {
        SYSTEM_ADMIN,
        LANDLORD,
        TENANT,
        BROKER,
        PROPERTY_MANAGER,
        LEGAL_VERIFIER
      },
      permissions: {
        REGISTER_PROPERTY,
        CREATE_AGREEMENT,
        UPDATE_AGREEMENT,
        PROCESS_PAYMENT,
        ACCESS_PAYMENT_HISTORY,
        VERIFY_COMPLIANCE,
        TRANSFER_OWNERSHIP,
        TERMINATE_AGREEMENT,
        UPDATE_SYSTEM
      }
    };
  }

  describe("Deployment", function () {
    it("Should set deployer as admin and system admin", async function () {
      const { accessManager, owner, roles } = await loadFixture(deployAccessControlFixture);
      
      expect(await accessManager.hasRole(await accessManager.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.true;
      expect(await accessManager.hasRole(roles.SYSTEM_ADMIN, owner.address)).to.be.true;
    });

    it("Should set up role hierarchies correctly", async function () {
      const { accessManager, roles } = await loadFixture(deployAccessControlFixture);
      
      expect(await accessManager.getRoleAdmin(roles.LANDLORD)).to.equal(roles.SYSTEM_ADMIN);
      expect(await accessManager.getRoleAdmin(roles.TENANT)).to.equal(roles.SYSTEM_ADMIN);
      expect(await accessManager.getRoleAdmin(roles.BROKER)).to.equal(roles.SYSTEM_ADMIN);
      expect(await accessManager.getRoleAdmin(roles.PROPERTY_MANAGER)).to.equal(roles.SYSTEM_ADMIN);
      expect(await accessManager.getRoleAdmin(roles.LEGAL_VERIFIER)).to.equal(roles.SYSTEM_ADMIN);
    });
  });

  describe("Role Management", function () {
    it("Should allow system admin to assign roles", async function () {
      const { accessManager, owner, landlord, roles } = await loadFixture(deployAccessControlFixture);

      await expect(accessManager.assignRole(landlord.address, roles.LANDLORD))
        .to.emit(accessManager, "RoleAssigned")
        .withArgs(landlord.address, roles.LANDLORD, owner.address);

      expect(await accessManager.hasRole(roles.LANDLORD, landlord.address)).to.be.true;
    });

    it("Should allow system admin to revoke roles", async function () {
      const { accessManager, owner, landlord, roles } = await loadFixture(deployAccessControlFixture);

      await accessManager.assignRole(landlord.address, roles.LANDLORD);
      await expect(accessManager.revokeRole(landlord.address, roles.LANDLORD))
        .to.emit(accessManager, "RoleRevoked")
        .withArgs(landlord.address, roles.LANDLORD, owner.address);

      expect(await accessManager.hasRole(roles.LANDLORD, landlord.address)).to.be.false;
    });

    it("Should reject role assignment from non-admin", async function () {
      const { accessManager, landlord, tenant, roles } = await loadFixture(deployAccessControlFixture);

      await expect(
        accessManager.connect(landlord).assignRole(tenant.address, roles.TENANT)
      ).to.be.revertedWith("Not authorized");
    });
  });

  describe("Permission Management", function () {
    it("Should grant default permissions when assigning roles", async function () {
      const { accessManager, landlord, roles, permissions } = await loadFixture(deployAccessControlFixture);

      await accessManager.assignRole(landlord.address, roles.LANDLORD);

      expect(await accessManager.hasPermission(landlord.address, permissions.REGISTER_PROPERTY)).to.be.true;
      expect(await accessManager.hasPermission(landlord.address, permissions.CREATE_AGREEMENT)).to.be.true;
      expect(await accessManager.hasPermission(landlord.address, permissions.ACCESS_PAYMENT_HISTORY)).to.be.true;
      expect(await accessManager.hasPermission(landlord.address, permissions.TRANSFER_OWNERSHIP)).to.be.true;
      expect(await accessManager.hasPermission(landlord.address, permissions.TERMINATE_AGREEMENT)).to.be.true;
    });

    it("Should grant all permissions to system admin", async function () {
      const { accessManager, admin, roles, permissions } = await loadFixture(deployAccessControlFixture);

      await accessManager.assignRole(admin.address, roles.SYSTEM_ADMIN);

      const adminPermissions = await accessManager.getPermissions(admin.address);
      expect(adminPermissions).to.include(permissions.REGISTER_PROPERTY);
      expect(adminPermissions).to.include(permissions.CREATE_AGREEMENT);
      expect(adminPermissions).to.include(permissions.UPDATE_AGREEMENT);
      expect(adminPermissions).to.include(permissions.PROCESS_PAYMENT);
      expect(adminPermissions).to.include(permissions.ACCESS_PAYMENT_HISTORY);
      expect(adminPermissions).to.include(permissions.VERIFY_COMPLIANCE);
      expect(adminPermissions).to.include(permissions.TRANSFER_OWNERSHIP);
      expect(adminPermissions).to.include(permissions.TERMINATE_AGREEMENT);
      expect(adminPermissions).to.include(permissions.UPDATE_SYSTEM);
    });

    it("Should allow system admin to grant additional permissions", async function () {
      const { accessManager, tenant, permissions } = await loadFixture(deployAccessControlFixture);

      await expect(accessManager.grantPermission(tenant.address, permissions.REGISTER_PROPERTY))
        .to.emit(accessManager, "PermissionGranted")
        .withArgs(tenant.address, permissions.REGISTER_PROPERTY);

      expect(await accessManager.hasPermission(tenant.address, permissions.REGISTER_PROPERTY)).to.be.true;
    });

    it("Should allow system admin to revoke permissions", async function () {
      const { accessManager, tenant, roles, permissions } = await loadFixture(deployAccessControlFixture);

      await accessManager.assignRole(tenant.address, roles.TENANT);
      await expect(accessManager.revokePermission(tenant.address, permissions.PROCESS_PAYMENT))
        .to.emit(accessManager, "PermissionRevoked")
        .withArgs(tenant.address, permissions.PROCESS_PAYMENT);

      expect(await accessManager.hasPermission(tenant.address, permissions.PROCESS_PAYMENT)).to.be.false;
    });
  });

  describe("Role-Specific Permissions", function () {
    it("Should set correct permissions for tenant role", async function () {
      const { accessManager, tenant, roles, permissions } = await loadFixture(deployAccessControlFixture);

      await accessManager.assignRole(tenant.address, roles.TENANT);

      expect(await accessManager.hasPermission(tenant.address, permissions.PROCESS_PAYMENT)).to.be.true;
      expect(await accessManager.hasPermission(tenant.address, permissions.ACCESS_PAYMENT_HISTORY)).to.be.true;
      expect(await accessManager.hasPermission(tenant.address, permissions.TERMINATE_AGREEMENT)).to.be.true;
      expect(await accessManager.hasPermission(tenant.address, permissions.REGISTER_PROPERTY)).to.be.false;
    });

    it("Should set correct permissions for broker role", async function () {
      const { accessManager, broker, roles, permissions } = await loadFixture(deployAccessControlFixture);

      await accessManager.assignRole(broker.address, roles.BROKER);

      expect(await accessManager.hasPermission(broker.address, permissions.REGISTER_PROPERTY)).to.be.true;
      expect(await accessManager.hasPermission(broker.address, permissions.CREATE_AGREEMENT)).to.be.true;
      expect(await accessManager.hasPermission(broker.address, permissions.ACCESS_PAYMENT_HISTORY)).to.be.true;
      expect(await accessManager.hasPermission(broker.address, permissions.UPDATE_SYSTEM)).to.be.false;
    });

    it("Should set correct permissions for property manager role", async function () {
      const { accessManager, propertyManager, roles, permissions } = await loadFixture(deployAccessControlFixture);

      await accessManager.assignRole(propertyManager.address, roles.PROPERTY_MANAGER);

      expect(await accessManager.hasPermission(propertyManager.address, permissions.UPDATE_AGREEMENT)).to.be.true;
      expect(await accessManager.hasPermission(propertyManager.address, permissions.PROCESS_PAYMENT)).to.be.true;
      expect(await accessManager.hasPermission(propertyManager.address, permissions.ACCESS_PAYMENT_HISTORY)).to.be.true;
      expect(await accessManager.hasPermission(propertyManager.address, permissions.REGISTER_PROPERTY)).to.be.false;
    });
  });

  describe("Permission Queries", function () {
    it("Should return all roles for an account", async function () {
      const { accessManager, landlord, roles } = await loadFixture(deployAccessControlFixture);

      await accessManager.assignRole(landlord.address, roles.LANDLORD);
      await accessManager.assignRole(landlord.address, roles.BROKER);

      const accountRoles = await accessManager.getRoles(landlord.address);
      expect(accountRoles).to.include(roles.LANDLORD);
      expect(accountRoles).to.include(roles.BROKER);
      expect(accountRoles).to.not.include(roles.TENANT);
    });

    it("Should return all permissions for an account", async function () {
      const { accessManager, landlord, roles, permissions } = await loadFixture(deployAccessControlFixture);

      await accessManager.assignRole(landlord.address, roles.LANDLORD);

      const accountPermissions = await accessManager.getPermissions(landlord.address);
      expect(accountPermissions).to.include(permissions.REGISTER_PROPERTY);
      expect(accountPermissions).to.include(permissions.CREATE_AGREEMENT);
      expect(accountPermissions).to.include(permissions.ACCESS_PAYMENT_HISTORY);
      expect(accountPermissions).to.not.include(permissions.UPDATE_SYSTEM);
    });
  });
});