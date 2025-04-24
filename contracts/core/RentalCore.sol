// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../interfaces/IRentalCore.sol";
import "../interfaces/IPaymentManager.sol";
import "../interfaces/IComplianceVerifier.sol";
import "../interfaces/IAccessControlManager.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title RentalCore
 * @notice Main contract for the Polish real estate rental management system
 * @dev Implements core rental functionality with security and access control
 */
contract RentalCore is IRentalCore, ReentrancyGuard, Pausable {
    using Counters for Counters.Counter;

    // State variables
    IPaymentManager public paymentManager;
    IComplianceVerifier public complianceVerifier;
    IAccessControlManager public accessManager;

    Counters.Counter private _propertyIds;
    Counters.Counter private _agreementIds;

    // Structs
    struct Property {
        address owner;
        bytes32 dataHash;
        bool isActive;
        uint256[] agreementHistory;
    }

    struct Agreement {
        uint256 propertyId;
        address landlord;
        address tenant;
        uint256 startDate;
        uint256 endDate;
        uint256 rentAmount;
        uint256 depositAmount;
        AgreementStatus status;
        bytes32 termsHash;
        bytes32[] amendmentHashes;
    }

    // Enums
    enum AgreementStatus {
        Pending,
        Active,
        Terminated,
        Expired,
        Disputed
    }

    // Mappings
    mapping(uint256 => Property) private _properties;
    mapping(uint256 => Agreement) private _agreements;
    mapping(address => uint256[]) private _userProperties;
    mapping(address => uint256[]) private _userAgreements;

    // Events (in addition to interface events)
    event AgreementAmended(uint256 indexed agreementId, bytes32 amendmentHash);
    event PropertyUpdated(uint256 indexed propertyId, bytes32 newDataHash);
    event EmergencyShutdown(address indexed triggeredBy, uint256 timestamp);

    // Modifiers
    modifier onlyPropertyOwner(uint256 propertyId) {
        require(_properties[propertyId].owner == msg.sender, "Not property owner");
        _;
    }

    modifier onlyAgreementParty(uint256 agreementId) {
        Agreement storage agreement = _agreements[agreementId];
        require(
            agreement.landlord == msg.sender || agreement.tenant == msg.sender,
            "Not agreement party"
        );
        _;
    }

    modifier propertyExists(uint256 propertyId) {
        require(_properties[propertyId].owner != address(0), "Property doesn't exist");
        _;
    }

    modifier agreementExists(uint256 agreementId) {
        require(_agreements[agreementId].propertyId != 0, "Agreement doesn't exist");
        _;
    }

    /**
     * @notice Contract constructor
     * @param paymentMgr Address of the PaymentManager contract
     * @param complianceVer Address of the ComplianceVerifier contract
     * @param accessMgr Address of the AccessControlManager contract
     */
    constructor(
        address paymentMgr,
        address complianceVer,
        address accessMgr
    ) {
        require(paymentMgr != address(0), "Invalid payment manager");
        require(complianceVer != address(0), "Invalid compliance verifier");
        require(accessMgr != address(0), "Invalid access manager");

        paymentManager = IPaymentManager(paymentMgr);
        complianceVerifier = IComplianceVerifier(complianceVer);
        accessManager = IAccessControlManager(accessMgr);
    }

    /**
     * @inheritdoc IRentalCore
     */
    function registerProperty(bytes32 dataHash) 
        external 
        override 
        whenNotPaused 
        nonReentrant 
        returns (uint256) 
    {
        require(dataHash != bytes32(0), "Invalid property data");
        require(
            accessManager.hasPermission(msg.sender, keccak256("REGISTER_PROPERTY")),
            "No permission"
        );

        _propertyIds.increment();
        uint256 newPropertyId = _propertyIds.current();

        Property storage newProperty = _properties[newPropertyId];
        newProperty.owner = msg.sender;
        newProperty.dataHash = dataHash;
        newProperty.isActive = true;

        _userProperties[msg.sender].push(newPropertyId);

        emit PropertyRegistered(newPropertyId, msg.sender, dataHash);
        return newPropertyId;
    }

    /**
     * @inheritdoc IRentalCore
     */
    function createAgreement(
        uint256 propertyId,
        address tenant,
        bytes32 terms,
        uint256 startDate,
        uint256 endDate,
        uint256 rentAmount,
        uint256 depositAmount
    ) 
        external 
        override 
        whenNotPaused 
        nonReentrant 
        propertyExists(propertyId)
        returns (uint256) 
    {
        require(tenant != address(0), "Invalid tenant address");
        require(terms != bytes32(0), "Invalid terms");
        require(startDate > block.timestamp, "Invalid start date");
        require(endDate > startDate, "Invalid end date");
        require(rentAmount > 0, "Invalid rent amount");
        require(depositAmount > 0, "Invalid deposit amount");
        require(
            _properties[propertyId].owner == msg.sender,
            "Not property owner"
        );
        require(
            _properties[propertyId].isActive,
            "Property not active"
        );

        // Verify compliance
        (bool compliant,) = complianceVerifier.verifyContractCompliance(propertyId);
        require(compliant, "Failed compliance check");

        _agreementIds.increment();
        uint256 newAgreementId = _agreementIds.current();

        Agreement storage newAgreement = _agreements[newAgreementId];
        newAgreement.propertyId = propertyId;
        newAgreement.landlord = msg.sender;
        newAgreement.tenant = tenant;
        newAgreement.startDate = startDate;
        newAgreement.endDate = endDate;
        newAgreement.rentAmount = rentAmount;
        newAgreement.depositAmount = depositAmount;
        newAgreement.status = AgreementStatus.Pending;
        newAgreement.termsHash = terms;

        _properties[propertyId].agreementHistory.push(newAgreementId);
        _userAgreements[msg.sender].push(newAgreementId);
        _userAgreements[tenant].push(newAgreementId);

        emit AgreementCreated(newAgreementId, propertyId, msg.sender, tenant);
        return newAgreementId;
    }

    /**
     * @inheritdoc IRentalCore
     */
    function terminateAgreement(uint256 agreementId)
        external
        override
        whenNotPaused
        nonReentrant
        agreementExists(agreementId)
        onlyAgreementParty(agreementId)
    {
        Agreement storage agreement = _agreements[agreementId];
        require(
            agreement.status == AgreementStatus.Active,
            "Agreement not active"
        );

        // Verify compliance for termination
        (bool compliant,) = complianceVerifier.verifyContractCompliance(agreementId);
        require(compliant, "Failed compliance check");

        agreement.status = AgreementStatus.Terminated;
        emit AgreementStatusUpdated(agreementId, uint8(AgreementStatus.Terminated));
    }

    /**
     * @inheritdoc IRentalCore
     */
    function updateAgreementStatus(uint256 agreementId, uint8 status)
        external
        override
        whenNotPaused
        nonReentrant
        agreementExists(agreementId)
    {
        require(
            accessManager.hasPermission(msg.sender, keccak256("UPDATE_AGREEMENT")),
            "No permission"
        );
        require(
            status <= uint8(AgreementStatus.Disputed),
            "Invalid status"
        );

        Agreement storage agreement = _agreements[agreementId];
        agreement.status = AgreementStatus(status);
        emit AgreementStatusUpdated(agreementId, status);
    }

    /**
     * @inheritdoc IRentalCore
     */
    function getPropertyDetails(uint256 propertyId)
        external
        view
        override
        propertyExists(propertyId)
        returns (address owner, bytes32 dataHash, bool isActive)
    {
        Property storage property = _properties[propertyId];
        return (property.owner, property.dataHash, property.isActive);
    }

    /**
     * @inheritdoc IRentalCore
     */
    function getAgreementDetails(uint256 agreementId)
        external
        view
        override
        agreementExists(agreementId)
        returns (
            uint256 propertyId,
            address landlord,
            address tenant,
            uint256 startDate,
            uint256 endDate,
            uint256 rentAmount,
            uint256 depositAmount,
            uint8 status,
            bytes32 termsHash
        )
    {
        Agreement storage agreement = _agreements[agreementId];
        return (
            agreement.propertyId,
            agreement.landlord,
            agreement.tenant,
            agreement.startDate,
            agreement.endDate,
            agreement.rentAmount,
            agreement.depositAmount,
            uint8(agreement.status),
            agreement.termsHash
        );
    }

    /**
     * @notice Emergency shutdown of the contract
     * @dev Only callable by system admin
     */
    function emergencyShutdown() external {
        require(
            accessManager.hasRole(msg.sender, keccak256("SYSTEM_ADMIN")),
            "Not system admin"
        );
        _pause();
        emit EmergencyShutdown(msg.sender, block.timestamp);
    }

    /**
     * @notice Resumes the contract after emergency shutdown
     * @dev Only callable by system admin
     */
    function resumeOperation() external {
        require(
            accessManager.hasRole(msg.sender, keccak256("SYSTEM_ADMIN")),
            "Not system admin"
        );
        _unpause();
    }
}