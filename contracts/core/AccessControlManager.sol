// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../interfaces/IAccessControlManager.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title AccessControlManager
 * @notice Manages role-based access control for the rental system
 * @dev Implements OpenZeppelin's AccessControl for role management
 */
contract AccessControlManager is IAccessControlManager, AccessControl, Pausable, ReentrancyGuard {
    // Role definitions
    bytes32 public constant SYSTEM_ADMIN = keccak256("SYSTEM_ADMIN");
    bytes32 public constant LANDLORD = keccak256("LANDLORD");
    bytes32 public constant TENANT = keccak256("TENANT");
    bytes32 public constant BROKER = keccak256("BROKER");
    bytes32 public constant PROPERTY_MANAGER = keccak256("PROPERTY_MANAGER");
    bytes32 public constant LEGAL_VERIFIER = keccak256("LEGAL_VERIFIER");

    // Permission definitions
    bytes32 public constant REGISTER_PROPERTY = keccak256("REGISTER_PROPERTY");
    bytes32 public constant CREATE_AGREEMENT = keccak256("CREATE_AGREEMENT");
    bytes32 public constant UPDATE_AGREEMENT = keccak256("UPDATE_AGREEMENT");
    bytes32 public constant PROCESS_PAYMENT = keccak256("PROCESS_PAYMENT");
    bytes32 public constant ACCESS_PAYMENT_HISTORY = keccak256("ACCESS_PAYMENT_HISTORY");
    bytes32 public constant VERIFY_COMPLIANCE = keccak256("VERIFY_COMPLIANCE");
    bytes32 public constant TRANSFER_OWNERSHIP = keccak256("TRANSFER_OWNERSHIP");
    bytes32 public constant TERMINATE_AGREEMENT = keccak256("TERMINATE_AGREEMENT");
    bytes32 public constant UPDATE_SYSTEM = keccak256("UPDATE_SYSTEM");

    // Mappings for custom permissions
    mapping(bytes32 => mapping(address => bool)) private _permissions;
    mapping(address => bytes32[]) private _userPermissions;

    /**
     * @notice Contract constructor
     * @dev Sets up initial admin role
     */
    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(SYSTEM_ADMIN, msg.sender);

        // Set up role hierarchies
        _setRoleAdmin(LANDLORD, SYSTEM_ADMIN);
        _setRoleAdmin(TENANT, SYSTEM_ADMIN);
        _setRoleAdmin(BROKER, SYSTEM_ADMIN);
        _setRoleAdmin(PROPERTY_MANAGER, SYSTEM_ADMIN);
        _setRoleAdmin(LEGAL_VERIFIER, SYSTEM_ADMIN);

        // Set up default permissions for roles
        _setupDefaultPermissions();
    }

    /**
     * @inheritdoc IAccessControlManager
     */
    function assignRole(address account, bytes32 role)
        external
        override
        whenNotPaused
        nonReentrant
        returns (bool)
    {
        require(account != address(0), "Invalid address");
        require(hasRole(getRoleAdmin(role), msg.sender), "Not authorized");

        grantRole(role, account);
        _setupRolePermissions(account, role);

        emit RoleAssigned(account, role, msg.sender);
        return true;
    }

    /**
     * @inheritdoc IAccessControlManager
     */
    function revokeRole(address account, bytes32 role)
        external
        override
        whenNotPaused
        nonReentrant
        returns (bool)
    {
        require(account != address(0), "Invalid address");
        require(hasRole(getRoleAdmin(role), msg.sender), "Not authorized");

        _revokeRole(role, account);
        _revokeRolePermissions(account, role);

        emit RoleRevoked(account, role, msg.sender);
        return true;
    }

    /**
     * @inheritdoc IAccessControlManager
     */
    function grantPermission(address account, bytes32 permission)
        external
        override
        whenNotPaused
        nonReentrant
        returns (bool)
    {
        require(account != address(0), "Invalid address");
        require(hasRole(SYSTEM_ADMIN, msg.sender), "Not authorized");

        _permissions[permission][account] = true;
        _userPermissions[account].push(permission);

        emit PermissionGranted(account, permission);
        return true;
    }

    /**
     * @inheritdoc IAccessControlManager
     */
    function revokePermission(address account, bytes32 permission)
        external
        override
        whenNotPaused
        nonReentrant
        returns (bool)
    {
        require(account != address(0), "Invalid address");
        require(hasRole(SYSTEM_ADMIN, msg.sender), "Not authorized");

        _permissions[permission][account] = false;
        _removePermission(account, permission);

        emit PermissionRevoked(account, permission);
        return true;
    }

    /**
     * @inheritdoc IAccessControlManager
     */
    function hasPermission(address account, bytes32 permission)
        external
        view
        override
        returns (bool)
    {
        return _permissions[permission][account];
    }

    /**
     * @inheritdoc IAccessControlManager
     */
    function getRoles(address account)
        external
        view
        override
        returns (bytes32[] memory roles)
    {
        bytes32[] memory allRoles = new bytes32[](6);
        allRoles[0] = SYSTEM_ADMIN;
        allRoles[1] = LANDLORD;
        allRoles[2] = TENANT;
        allRoles[3] = BROKER;
        allRoles[4] = PROPERTY_MANAGER;
        allRoles[5] = LEGAL_VERIFIER;

        uint256 count = 0;
        for (uint256 i = 0; i < allRoles.length; i++) {
            if (hasRole(allRoles[i], account)) {
                count++;
            }
        }

        roles = new bytes32[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < allRoles.length; i++) {
            if (hasRole(allRoles[i], account)) {
                roles[index] = allRoles[i];
                index++;
            }
        }

        return roles;
    }

    /**
     * @inheritdoc IAccessControlManager
     */
    function getPermissions(address account)
        external
        view
        override
        returns (bytes32[] memory)
    {
        return _userPermissions[account];
    }

    /**
     * @notice Sets up default permissions for each role
     */
    function _setupDefaultPermissions() private {
        // System Admin permissions
        _setupRolePermissions(msg.sender, SYSTEM_ADMIN);

        // Define default permissions for other roles
        // These will be applied when roles are assigned
    }

    /**
     * @notice Sets up permissions for a specific role
     * @param account Address to receive permissions
     * @param role Role to setup permissions for
     */
    function _setupRolePermissions(address account, bytes32 role) private {
        if (role == SYSTEM_ADMIN) {
            _grantAllPermissions(account);
        } else if (role == LANDLORD) {
            _permissions[REGISTER_PROPERTY][account] = true;
            _permissions[CREATE_AGREEMENT][account] = true;
            _permissions[ACCESS_PAYMENT_HISTORY][account] = true;
            _permissions[TRANSFER_OWNERSHIP][account] = true;
            _permissions[TERMINATE_AGREEMENT][account] = true;
        } else if (role == TENANT) {
            _permissions[PROCESS_PAYMENT][account] = true;
            _permissions[ACCESS_PAYMENT_HISTORY][account] = true;
            _permissions[TERMINATE_AGREEMENT][account] = true;
        } else if (role == BROKER) {
            _permissions[REGISTER_PROPERTY][account] = true;
            _permissions[CREATE_AGREEMENT][account] = true;
            _permissions[ACCESS_PAYMENT_HISTORY][account] = true;
        } else if (role == PROPERTY_MANAGER) {
            _permissions[UPDATE_AGREEMENT][account] = true;
            _permissions[PROCESS_PAYMENT][account] = true;
            _permissions[ACCESS_PAYMENT_HISTORY][account] = true;
        } else if (role == LEGAL_VERIFIER) {
            _permissions[VERIFY_COMPLIANCE][account] = true;
        }

        // Update user permissions array
        _updateUserPermissions(account);
    }

    /**
     * @notice Grants all system permissions to an address
     * @param account Address to receive all permissions
     */
    function _grantAllPermissions(address account) private {
        _permissions[REGISTER_PROPERTY][account] = true;
        _permissions[CREATE_AGREEMENT][account] = true;
        _permissions[UPDATE_AGREEMENT][account] = true;
        _permissions[PROCESS_PAYMENT][account] = true;
        _permissions[ACCESS_PAYMENT_HISTORY][account] = true;
        _permissions[VERIFY_COMPLIANCE][account] = true;
        _permissions[TRANSFER_OWNERSHIP][account] = true;
        _permissions[TERMINATE_AGREEMENT][account] = true;
        _permissions[UPDATE_SYSTEM][account] = true;

        _updateUserPermissions(account);
    }

    /**
     * @notice Revokes all permissions associated with a role
     * @param account Address to revoke permissions from
     * @param role Role whose permissions should be revoked
     */
    function _revokeRolePermissions(address account, bytes32 role) private {
        bytes32[] memory permissions = _userPermissions[account];
        for (uint256 i = 0; i < permissions.length; i++) {
            _permissions[permissions[i]][account] = false;
        }
        delete _userPermissions[account];
    }

    /**
     * @notice Updates the user's permission array
     * @param account Address to update permissions for
     */
    function _updateUserPermissions(address account) private {
        delete _userPermissions[account];
        bytes32[] memory allPermissions = new bytes32[](9);
        allPermissions[0] = REGISTER_PROPERTY;
        allPermissions[1] = CREATE_AGREEMENT;
        allPermissions[2] = UPDATE_AGREEMENT;
        allPermissions[3] = PROCESS_PAYMENT;
        allPermissions[4] = ACCESS_PAYMENT_HISTORY;
        allPermissions[5] = VERIFY_COMPLIANCE;
        allPermissions[6] = TRANSFER_OWNERSHIP;
        allPermissions[7] = TERMINATE_AGREEMENT;
        allPermissions[8] = UPDATE_SYSTEM;

        for (uint256 i = 0; i < allPermissions.length; i++) {
            if (_permissions[allPermissions[i]][account]) {
                _userPermissions[account].push(allPermissions[i]);
            }
        }
    }

    /**
     * @notice Removes a specific permission from user's permission array
     * @param account Address to remove permission from
     * @param permission Permission to remove
     */
    function _removePermission(address account, bytes32 permission) private {
        bytes32[] storage permissions = _userPermissions[account];
        for (uint256 i = 0; i < permissions.length; i++) {
            if (permissions[i] == permission) {
                permissions[i] = permissions[permissions.length - 1];
                permissions.pop();
                break;
            }
        }
    }
}