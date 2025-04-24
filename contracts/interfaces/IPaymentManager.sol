// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IPaymentManager
 * @notice Interface for handling rental payments and deposits
 */
interface IPaymentManager {
    /**
     * @notice Emitted when a rent payment is processed
     * @param agreementId ID of the rental agreement
     * @param amount Amount paid
     * @param paidBy Address that made the payment
     * @param timestamp Time of payment
     */
    event RentPaymentProcessed(
        uint256 indexed agreementId,
        uint256 amount,
        address indexed paidBy,
        uint256 timestamp
    );

    /**
     * @notice Emitted when a security deposit is processed
     * @param agreementId ID of the rental agreement
     * @param amount Deposit amount
     * @param paidBy Address that paid the deposit
     */
    event DepositProcessed(
        uint256 indexed agreementId,
        uint256 amount,
        address indexed paidBy
    );

    /**
     * @notice Emitted when a deposit is released
     * @param agreementId ID of the rental agreement
     * @param amount Amount released
     * @param recipient Address receiving the deposit
     */
    event DepositReleased(
        uint256 indexed agreementId,
        uint256 amount,
        address indexed recipient
    );

    /**
     * @notice Emitted when late fees are charged
     * @param agreementId ID of the rental agreement
     * @param amount Late fee amount
     */
    event LateFeeCharged(uint256 indexed agreementId, uint256 amount);

    /**
     * @notice Processes a rent payment for an agreement
     * @param agreementId ID of the agreement
     * @return success Whether the payment was processed successfully
     */
    function processRentPayment(uint256 agreementId) external payable returns (bool success);

    /**
     * @notice Processes a security deposit for an agreement
     * @param agreementId ID of the agreement
     * @return success Whether the deposit was processed successfully
     */
    function processDeposit(uint256 agreementId) external payable returns (bool success);

    /**
     * @notice Releases a deposit to the specified recipient
     * @param agreementId ID of the agreement
     * @param amount Amount to release
     * @param recipient Address to receive the deposit
     * @return success Whether the deposit was released successfully
     */
    function releaseDeposit(
        uint256 agreementId,
        uint256 amount,
        address payable recipient
    ) external returns (bool success);

    /**
     * @notice Retrieves payment history for an agreement
     * @param agreementId ID of the agreement
     * @return timestamps Array of payment timestamps
     * @return amounts Array of payment amounts
     * @return types Array of payment types (1: Rent, 2: Deposit, 3: Late Fee)
     */
    function getPaymentHistory(uint256 agreementId) external view returns (
        uint256[] memory timestamps,
        uint256[] memory amounts,
        uint8[] memory types
    );

    /**
     * @notice Calculates outstanding rent for an agreement
     * @param agreementId ID of the agreement
     * @return amount Outstanding rent amount
     * @return lateFees Accumulated late fees
     */
    function calculateOutstandingRent(uint256 agreementId) external view returns (
        uint256 amount,
        uint256 lateFees
    );

    /**
     * @notice Handles late fees for overdue payments
     * @param agreementId ID of the agreement
     * @return feeAmount Amount of late fees charged
     */
    function handleLateFees(uint256 agreementId) external returns (uint256 feeAmount);

    /**
     * @notice Gets the current deposit balance for an agreement
     * @param agreementId ID of the agreement
     * @return amount Current deposit balance
     */
    function getDepositBalance(uint256 agreementId) external view returns (uint256 amount);
}