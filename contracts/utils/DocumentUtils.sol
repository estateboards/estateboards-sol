// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title DocumentUtils
 * @notice Utility functions for document hashing and verification
 * @dev Library of pure functions for handling document-related operations
 */
library DocumentUtils {
    /**
     * @notice Generates a hash for rental agreement terms
     * @param propertyId ID of the property
     * @param landlord Address of the landlord
     * @param tenant Address of the tenant
     * @param startDate Start date of the rental
     * @param endDate End date of the rental
     * @param rentAmount Monthly rent amount
     * @param depositAmount Security deposit amount
     * @param additionalTerms Hash of additional terms document
     * @return termsHash Hash of the complete rental terms
     */
    function generateAgreementHash(
        uint256 propertyId,
        address landlord,
        address tenant,
        uint256 startDate,
        uint256 endDate,
        uint256 rentAmount,
        uint256 depositAmount,
        bytes32 additionalTerms
    ) public pure returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                propertyId,
                landlord,
                tenant,
                startDate,
                endDate,
                rentAmount,
                depositAmount,
                additionalTerms
            )
        );
    }

    /**
     * @notice Generates a hash for property details
     * @param owner Property owner address
     * @param postalCode Property postal code
     * @param size Property size in square meters
     * @param roomCount Number of rooms
     * @param features Property features hash
     * @param documents Array of document hashes
     * @return propertyHash Hash of the property details
     */
    function generatePropertyHash(
        address owner,
        uint256 postalCode,
        uint256 size,
        uint256 roomCount,
        bytes32 features,
        bytes32[] memory documents
    ) public pure returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                owner,
                postalCode,
                size,
                roomCount,
                features,
                keccak256(abi.encodePacked(documents))
            )
        );
    }

    /**
     * @notice Generates a hash for an agreement amendment
     * @param agreementId Original agreement ID
     * @param amendmentType Type of amendment
     * @param timestamp Amendment timestamp
     * @param changes Hash of the changes
     * @return amendmentHash Hash of the amendment
     */
    function generateAmendmentHash(
        uint256 agreementId,
        uint8 amendmentType,
        uint256 timestamp,
        bytes32 changes
    ) public pure returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                agreementId,
                amendmentType,
                timestamp,
                changes
            )
        );
    }

    /**
     * @notice Generates a hash for inspection reports
     * @param propertyId ID of the property
     * @param inspector Address of the inspector
     * @param timestamp Inspection timestamp
     * @param condition Property condition code
     * @param notes Hash of inspection notes
     * @param images Array of image hashes
     * @return reportHash Hash of the inspection report
     */
    function generateInspectionHash(
        uint256 propertyId,
        address inspector,
        uint256 timestamp,
        uint8 condition,
        bytes32 notes,
        bytes32[] memory images
    ) public pure returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                propertyId,
                inspector,
                timestamp,
                condition,
                notes,
                keccak256(abi.encodePacked(images))
            )
        );
    }

    /**
     * @notice Generates a hash for payment records
     * @param agreementId ID of the agreement
     * @param amount Payment amount
     * @param paymentType Type of payment
     * @param timestamp Payment timestamp
     * @param metadata Additional payment metadata
     * @return paymentHash Hash of the payment record
     */
    function generatePaymentHash(
        uint256 agreementId,
        uint256 amount,
        uint8 paymentType,
        uint256 timestamp,
        bytes32 metadata
    ) public pure returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                agreementId,
                amount,
                paymentType,
                timestamp,
                metadata
            )
        );
    }

    /**
     * @notice Generates a hash for dispute records
     * @param agreementId ID of the agreement
     * @param disputeType Type of dispute
     * @param timestamp Dispute creation timestamp
     * @param parties Involved parties' addresses
     * @param evidence Array of evidence document hashes
     * @return disputeHash Hash of the dispute record
     */
    function generateDisputeHash(
        uint256 agreementId,
        uint8 disputeType,
        uint256 timestamp,
        address[] memory parties,
        bytes32[] memory evidence
    ) public pure returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                agreementId,
                disputeType,
                timestamp,
                keccak256(abi.encodePacked(parties)),
                keccak256(abi.encodePacked(evidence))
            )
        );
    }

    /**
     * @notice Verifies if a document hash matches the original
     * @param originalHash Original hash of the document
     * @param currentHash Current hash to verify
     * @return matches Whether the hashes match
     */
    function verifyDocument(
        bytes32 originalHash,
        bytes32 currentHash
    ) public pure returns (bool) {
        return originalHash == currentHash;
    }

    /**
     * @notice Combines multiple document hashes into a single hash
     * @param documentHashes Array of document hashes
     * @return combinedHash Combined hash of all documents
     */
    function combineDocumentHashes(
        bytes32[] memory documentHashes
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(documentHashes));
    }

    /**
     * @notice Generates a unique identifier for a document
     * @param documentType Type of document
     * @param creator Address of document creator
     * @param timestamp Creation timestamp
     * @param contentHash Hash of document content
     * @return documentId Unique identifier for the document
     */
    function generateDocumentId(
        uint8 documentType,
        address creator,
        uint256 timestamp,
        bytes32 contentHash
    ) public pure returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                documentType,
                creator,
                timestamp,
                contentHash
            )
        );
    }
}