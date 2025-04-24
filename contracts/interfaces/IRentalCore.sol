// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IRentalCore
 * @notice Interface for the main RentalCore contract that orchestrates the rental management system
 */
interface IRentalCore {
    /**
     * @notice Emitted when a new property is registered
     * @param propertyId Unique identifier of the property
     * @param owner Address of the property owner
     * @param dataHash Hash of the property details stored off-chain
     */
    event PropertyRegistered(uint256 indexed propertyId, address indexed owner, bytes32 dataHash);

    /**
     * @notice Emitted when a new rental agreement is created
     * @param agreementId Unique identifier of the agreement
     * @param propertyId Associated property ID
     * @param landlord Address of the landlord
     * @param tenant Address of the tenant
     */
    event AgreementCreated(
        uint256 indexed agreementId,
        uint256 indexed propertyId,
        address indexed landlord,
        address tenant
    );

    /**
     * @notice Emitted when an agreement's status is updated
     * @param agreementId Unique identifier of the agreement
     * @param status New status of the agreement
     */
    event AgreementStatusUpdated(uint256 indexed agreementId, uint8 status);

    /**
     * @notice Registers a new property in the system
     * @param dataHash Hash of the property details stored off-chain
     * @return propertyId Unique identifier of the registered property
     */
    function registerProperty(bytes32 dataHash) external returns (uint256 propertyId);

    /**
     * @notice Creates a new rental agreement
     * @param propertyId ID of the property to rent
     * @param tenant Address of the tenant
     * @param terms Hash of the agreement terms
     * @param startDate Start date of the rental period
     * @param endDate End date of the rental period
     * @param rentAmount Monthly rent amount
     * @param depositAmount Security deposit amount
     * @return agreementId Unique identifier of the created agreement
     */
    function createAgreement(
        uint256 propertyId,
        address tenant,
        bytes32 terms,
        uint256 startDate,
        uint256 endDate,
        uint256 rentAmount,
        uint256 depositAmount
    ) external returns (uint256 agreementId);

    /**
     * @notice Terminates an existing rental agreement
     * @param agreementId ID of the agreement to terminate
     */
    function terminateAgreement(uint256 agreementId) external;

    /**
     * @notice Updates the status of an agreement
     * @param agreementId ID of the agreement to update
     * @param status New status to set
     */
    function updateAgreementStatus(uint256 agreementId, uint8 status) external;

    /**
     * @notice Retrieves property details
     * @param propertyId ID of the property
     * @return owner Address of the property owner
     * @return dataHash Hash of the property details
     * @return isActive Whether the property is active
     */
    function getPropertyDetails(uint256 propertyId) external view returns (
        address owner,
        bytes32 dataHash,
        bool isActive
    );

    /**
     * @notice Retrieves agreement details
     * @param agreementId ID of the agreement
     * @return propertyId Associated property ID
     * @return landlord Address of the landlord
     * @return tenant Address of the tenant
     * @return startDate Start date of the rental period
     * @return endDate End date of the rental period
     * @return rentAmount Monthly rent amount
     * @return depositAmount Security deposit amount
     * @return status Current status of the agreement
     * @return termsHash Hash of the agreement terms
     */
    function getAgreementDetails(uint256 agreementId) external view returns (
        uint256 propertyId,
        address landlord,
        address tenant,
        uint256 startDate,
        uint256 endDate,
        uint256 rentAmount,
        uint256 depositAmount,
        uint8 status,
        bytes32 termsHash
    );
}