// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IAccessControlManager
 * @notice Interface for managing role-based access control in the rental system
 */
interface IAccessControlManager {
    /**
     * @notice Emitted when a role is assigned to an address
     * @param account Address receiving the role
     * @param role Role being assigned
     * @param assignedBy Address that assigned the role
     */
    event RoleAssigned(
        address indexed account,
        bytes32 indexed role,
        address indexed assignedBy
    );

    /**
     * @notice Emitted when a role is revoked from an address
     * @param account Address losing the role
     * @param role Role being revoked
     * @param revokedBy Address that revoked the role
     */
    event RoleRevoked(
        address indexed account,
        bytes32 indexed role,
        address indexed revokedBy
    );

    /**
     * @notice Emitted when a permission is granted
     * @param account Address receiving the permission
     * @param permission Permission being granted
     */
    event PermissionGranted(
        address indexed account,
        bytes32 indexed permission
    );

    /**
     * @notice Emitted when a permission is revoked
     * @param account Address losing the permission
     * @param permission Permission being revoked
     */
    event PermissionRevoked(
        address indexed account,
        bytes32 indexed permission
    );

    /**
     * @notice Assigns a role to an address
     * @param account Address to receive the role
     * @param role Role to assign
     * @return success Whether the role was assigned successfully
     */
    function assignRole(address account, bytes32 role) external returns (bool success);

    /**
     * @notice Revokes a role from an address
     * @param account Address to revoke the role from
     * @param role Role to revoke
     * @return success Whether the role was revoked successfully
     */
    function revokeRole(address account, bytes32 role) external returns (bool success);

    /**
     * @notice Grants a specific permission to an address
     * @param account Address to receive the permission
     * @param permission Permission to grant
     * @return success Whether the permission was granted successfully
     */
    function grantPermission(address account, bytes32 permission) external returns (bool success);

    /**
     * @notice Revokes a specific permission from an address
     * @param account Address to revoke the permission from
     * @param permission Permission to revoke
     * @return success Whether the permission was revoked successfully
     */
    function revokePermission(address account, bytes32 permission) external returns (bool success);

    /**
     * @notice Checks if an address has a specific role
     * @param account Address to check
     * @param role Role to verify
     * @return hasRole Whether the address has the role
     */
    function hasRole(address account, bytes32 role) external view returns (bool hasRole);

    /**
     * @notice Checks if an address has a specific permission
     * @param account Address to check
     * @param permission Permission to verify
     * @return hasPermission Whether the address has the permission
     */
    function hasPermission(address account, bytes32 permission) external view returns (bool hasPermission);

    /**
     * @notice Gets all roles assigned to an address
     * @param account Address to check
     * @return roles Array of roles assigned to the address
     */
    function getRoles(address account) external view returns (bytes32[] memory roles);

    /**
     * @notice Gets all permissions granted to an address
     * @param account Address to check
     * @return permissions Array of permissions granted to the address
     */
    function getPermissions(address account) external view returns (bytes32[] memory permissions);
}