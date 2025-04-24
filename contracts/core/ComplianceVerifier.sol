// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../interfaces/IComplianceVerifier.sol";
import "../interfaces/IRentalCore.sol";
import "../interfaces/IAccessControlManager.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title ComplianceVerifier
 * @notice Ensures compliance with Polish real estate laws and regulations
 * @dev Integrates with oracles for external data verification
 */
contract ComplianceVerifier is IComplianceVerifier, ReentrancyGuard, Pausable {
    // State variables
    IRentalCore public rentalCore;
    IAccessControlManager public accessManager;

    // Structs
    struct ComplianceCheck {
        bool passed;
        uint256 timestamp;
        bytes32 detailsHash;
        address verifier;
    }

    struct ComplianceParameters {
        bytes32 parametersHash;
        uint256 lastUpdateTime;
        bool active;
    }

    // Mappings
    mapping(uint256 => mapping(uint8 => ComplianceCheck)) private _complianceChecks; // entityId => entityType => ComplianceCheck
    mapping(address => bool) private _authorizedVerifiers;
    mapping(bytes32 => address) private _oracles; // oracleType => oracleAddress
    ComplianceParameters private _currentParameters;

    // Events (in addition to interface events)
    event OracleRegistered(bytes32 indexed oracleType, address indexed oracleAddress);
    event VerifierAuthorized(address indexed verifier);
    event VerifierRevoked(address indexed verifier);
    event ComplianceCheckFailed(uint256 indexed entityId, uint8 entityType, bytes32 reason);

    // Constants
    uint8 public constant AGREEMENT_TYPE = 1;
    uint8 public constant PROPERTY_TYPE = 2;
    uint8 public constant LANDLORD_TYPE = 3;
    uint8 public constant TENANT_TYPE = 4;

    // Modifiers
    modifier onlyAuthorizedVerifier() {
        require(_authorizedVerifiers[msg.sender], "Not authorized verifier");
        _;
    }

    modifier onlyAdmin() {
        require(
            accessManager.hasRole(msg.sender, keccak256("SYSTEM_ADMIN")),
            "Not admin"
        );
        _;
    }

    /**
     * @notice Contract constructor
     * @param rentalCoreAddress Address of the RentalCore contract
     * @param accessManagerAddress Address of the AccessControlManager contract
     */
    constructor(address rentalCoreAddress, address accessManagerAddress) {
        require(rentalCoreAddress != address(0), "Invalid rental core");
        require(accessManagerAddress != address(0), "Invalid access manager");
        
        rentalCore = IRentalCore(rentalCoreAddress);
        accessManager = IAccessControlManager(accessManagerAddress);
    }

    /**
     * @inheritdoc IComplianceVerifier
     */
    function verifyContractCompliance(uint256 agreementId)
        external
        override
        whenNotPaused
        nonReentrant
        returns (bool passed, bytes32 detailsHash)
    {
        require(_currentParameters.active, "Compliance parameters not set");

        // Get agreement details
        (uint256 propertyId, address landlord, address tenant,,,,,,,) = rentalCore.getAgreementDetails(agreementId);

        // Verify all parties
        (bool landlordCompliant, bytes32 landlordDetails) = _verifyPartyCompliance(landlord, LANDLORD_TYPE);
        (bool tenantCompliant, bytes32 tenantDetails) = _verifyPartyCompliance(tenant, TENANT_TYPE);
        (bool propertyCompliant, bytes32 propertyDetails) = _verifyPropertyCompliance(propertyId);

        bool allCompliant = landlordCompliant && tenantCompliant && propertyCompliant;
        bytes32 finalHash = keccak256(abi.encodePacked(
            landlordDetails,
            tenantDetails,
            propertyDetails
        ));

        _recordComplianceCheck(agreementId, AGREEMENT_TYPE, allCompliant, finalHash);

        if (!allCompliant) {
            emit ComplianceCheckFailed(agreementId, AGREEMENT_TYPE, finalHash);
        }

        return (allCompliant, finalHash);
    }

    /**
     * @inheritdoc IComplianceVerifier
     */
    function verifyLandlordCompliance(address landlordAddress)
        external
        override
        whenNotPaused
        nonReentrant
        returns (bool passed, bytes32 detailsHash)
    {
        return _verifyPartyCompliance(landlordAddress, LANDLORD_TYPE);
    }

    /**
     * @inheritdoc IComplianceVerifier
     */
    function verifyTenantCompliance(address tenantAddress)
        external
        override
        whenNotPaused
        nonReentrant
        returns (bool passed, bytes32 detailsHash)
    {
        return _verifyPartyCompliance(tenantAddress, TENANT_TYPE);
    }

    /**
     * @inheritdoc IComplianceVerifier
     */
    function updateComplianceParameters(bytes32 parametersHash)
        external
        override
        onlyAdmin
        returns (bool)
    {
        require(parametersHash != bytes32(0), "Invalid parameters");

        _currentParameters = ComplianceParameters({
            parametersHash: parametersHash,
            lastUpdateTime: block.timestamp,
            active: true
        });

        emit ComplianceParametersUpdated(parametersHash, block.timestamp);
        return true;
    }

    /**
     * @inheritdoc IComplianceVerifier
     */
    function getComplianceStatus(uint256 entityId, uint8 entityType)
        external
        view
        override
        returns (bool passed, uint256 lastCheckTime, bytes32 detailsHash)
    {
        require(entityType <= TENANT_TYPE, "Invalid entity type");

        ComplianceCheck storage check = _complianceChecks[entityId][entityType];
        return (check.passed, check.timestamp, check.detailsHash);
    }

    /**
     * @inheritdoc IComplianceVerifier
     */
    function isAuthorizedVerifier(address verifier)
        external
        view
        override
        returns (bool)
    {
        return _authorizedVerifiers[verifier];
    }

    /**
     * @inheritdoc IComplianceVerifier
     */
    function getCurrentParameters()
        external
        view
        override
        returns (bytes32 parametersHash, uint256 lastUpdateTime)
    {
        return (_currentParameters.parametersHash, _currentParameters.lastUpdateTime);
    }

    /**
     * @notice Authorizes a new compliance verifier
     * @param verifier Address to authorize
     */
    function authorizeVerifier(address verifier) external onlyAdmin {
        require(verifier != address(0), "Invalid verifier address");
        _authorizedVerifiers[verifier] = true;
        emit VerifierAuthorized(verifier);
    }

    /**
     * @notice Revokes a verifier's authorization
     * @param verifier Address to revoke
     */
    function revokeVerifier(address verifier) external onlyAdmin {
        require(_authorizedVerifiers[verifier], "Not authorized verifier");
        _authorizedVerifiers[verifier] = false;
        emit VerifierRevoked(verifier);
    }

    /**
     * @notice Registers an oracle for external data verification
     * @param oracleType Type of oracle
     * @param oracleAddress Address of the oracle contract
     */
    function registerOracle(bytes32 oracleType, address oracleAddress) external onlyAdmin {
        require(oracleAddress != address(0), "Invalid oracle address");
        _oracles[oracleType] = oracleAddress;
        emit OracleRegistered(oracleType, oracleAddress);
    }

    /**
     * @notice Verifies compliance for a party (landlord or tenant)
     * @param partyAddress Address of the party
     * @param partyType Type of party (LANDLORD_TYPE or TENANT_TYPE)
     */
    function _verifyPartyCompliance(address partyAddress, uint8 partyType)
        private
        returns (bool passed, bytes32 detailsHash)
    {
        require(partyAddress != address(0), "Invalid party address");
        require(partyType == LANDLORD_TYPE || partyType == TENANT_TYPE, "Invalid party type");

        // Here we would integrate with oracles to verify:
        // - Legal status
        // - Tax compliance
        // - Background checks
        // - Other regulatory requirements

        // For now, we'll implement a basic check
        bytes32 checkHash = keccak256(abi.encodePacked(
            partyAddress,
            partyType,
            block.timestamp
        ));

        bool checkPassed = true; // In production, this would be based on oracle data
        _recordComplianceCheck(uint256(uint160(partyAddress)), partyType, checkPassed, checkHash);

        return (checkPassed, checkHash);
    }

    /**
     * @notice Verifies compliance for a property
     * @param propertyId ID of the property
     */
    function _verifyPropertyCompliance(uint256 propertyId)
        private
        returns (bool passed, bytes32 detailsHash)
    {
        // Here we would integrate with oracles to verify:
        // - Property registration status
        // - Building permits
        // - Safety certificates
        // - Zoning compliance

        // For now, we'll implement a basic check
        bytes32 checkHash = keccak256(abi.encodePacked(
            propertyId,
            block.timestamp
        ));

        bool checkPassed = true; // In production, this would be based on oracle data
        _recordComplianceCheck(propertyId, PROPERTY_TYPE, checkPassed, checkHash);

        return (checkPassed, checkHash);
    }

    /**
     * @notice Records a compliance check result
     * @param entityId ID of the entity
     * @param entityType Type of entity
     * @param passed Whether the check passed
     * @param detailsHash Hash of check details
     */
    function _recordComplianceCheck(
        uint256 entityId,
        uint8 entityType,
        bool passed,
        bytes32 detailsHash
    ) private {
        _complianceChecks[entityId][entityType] = ComplianceCheck({
            passed: passed,
            timestamp: block.timestamp,
            detailsHash: detailsHash,
            verifier: msg.sender
        });

        emit ComplianceCheckCompleted(entityId, entityType, passed, detailsHash);
    }
}