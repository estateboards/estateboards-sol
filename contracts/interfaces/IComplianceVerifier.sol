// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IComplianceVerifier
 * @notice Interface for verifying compliance with Polish real estate laws and regulations
 */
interface IComplianceVerifier {
    /**
     * @notice Emitted when a compliance check is completed
     * @param entityId ID of the entity checked (agreement or property)
     * @param entityType Type of entity (1: Agreement, 2: Property, 3: Landlord, 4: Tenant)
     * @param passed Whether the compliance check passed
     * @param detailsHash Hash of the compliance check details
     */
    event ComplianceCheckCompleted(
        uint256 indexed entityId,
        uint8 indexed entityType,
        bool passed,
        bytes32 detailsHash
    );

    /**
     * @notice Emitted when compliance parameters are updated
     * @param parametersHash Hash of the new compliance parameters
     * @param timestamp Time of update
     */
    event ComplianceParametersUpdated(bytes32 parametersHash, uint256 timestamp);

    /**
     * @notice Verifies compliance of a rental agreement
     * @param agreementId ID of the agreement to verify
     * @return passed Whether the agreement is compliant
     * @return detailsHash Hash of the compliance details
     */
    function verifyContractCompliance(uint256 agreementId) external returns (
        bool passed,
        bytes32 detailsHash
    );

    /**
     * @notice Verifies landlord compliance with regulations
     * @param landlordAddress Address of the landlord
     * @return passed Whether the landlord is compliant
     * @return detailsHash Hash of the compliance details
     */
    function verifyLandlordCompliance(address landlordAddress) external returns (
        bool passed,
        bytes32 detailsHash
    );

    /**
     * @notice Verifies tenant compliance
     * @param tenantAddress Address of the tenant
     * @return passed Whether the tenant is compliant
     * @return detailsHash Hash of the compliance details
     */
    function verifyTenantCompliance(address tenantAddress) external returns (
        bool passed,
        bytes32 detailsHash
    );

    /**
     * @notice Updates compliance verification parameters
     * @param parametersHash Hash of the new parameters
     * @return success Whether the parameters were updated successfully
     */
    function updateComplianceParameters(bytes32 parametersHash) external returns (bool success);

    /**
     * @notice Gets the current compliance status for an entity
     * @param entityId ID of the entity
     * @param entityType Type of entity (1: Agreement, 2: Property, 3: Landlord, 4: Tenant)
     * @return passed Whether the entity is currently compliant
     * @return lastCheckTime Timestamp of the last compliance check
     * @return detailsHash Hash of the latest compliance details
     */
    function getComplianceStatus(uint256 entityId, uint8 entityType) external view returns (
        bool passed,
        uint256 lastCheckTime,
        bytes32 detailsHash
    );

    /**
     * @notice Checks if an address is authorized to perform compliance checks
     * @param verifier Address to check
     * @return isAuthorized Whether the address is authorized
     */
    function isAuthorizedVerifier(address verifier) external view returns (bool isAuthorized);

    /**
     * @notice Gets the current compliance parameters
     * @return parametersHash Hash of current compliance parameters
     * @return lastUpdateTime Time of last parameters update
     */
    function getCurrentParameters() external view returns (
        bytes32 parametersHash,
        uint256 lastUpdateTime
    );
}