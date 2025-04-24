// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../interfaces/IPaymentManager.sol";
import "../interfaces/IRentalCore.sol";
import "../interfaces/IAccessControlManager.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title PaymentManager
 * @notice Manages all payment-related functionality for the rental system
 * @dev Handles rent payments, deposits, and late fees with secure transaction handling
 */
contract PaymentManager is IPaymentManager, ReentrancyGuard, Pausable {
    using SafeMath for uint256;

    // State variables
    IRentalCore public rentalCore;
    IAccessControlManager public accessManager;

    // Constants
    uint256 public constant LATE_FEE_PERCENTAGE = 10; // 10% late fee
    uint256 public constant GRACE_PERIOD_DAYS = 5; // 5 days grace period
    uint256 public constant SECONDS_PER_DAY = 86400;

    // Structs
    struct PaymentRecord {
        uint256 timestamp;
        uint256 amount;
        PaymentType paymentType;
        bool confirmed;
    }

    enum PaymentType {
        Rent,
        Deposit,
        LateFee
    }

    // Mappings
    mapping(uint256 => PaymentRecord[]) private _paymentHistory; // agreementId => PaymentRecord[]
    mapping(uint256 => uint256) private _depositBalances; // agreementId => balance
    mapping(uint256 => uint256) private _lastPaymentDate; // agreementId => timestamp
    mapping(uint256 => uint256) private _outstandingBalance; // agreementId => balance

    // Events (in addition to interface events)
    event PaymentConfirmed(uint256 indexed agreementId, uint256 amount, PaymentType paymentType);
    event PaymentFailed(uint256 indexed agreementId, uint256 amount, string reason);
    event BalanceUpdated(uint256 indexed agreementId, uint256 newBalance);

    // Modifiers
    modifier onlyValidAgreement(uint256 agreementId) {
        (,,,,,,,uint8 status,) = rentalCore.getAgreementDetails(agreementId);
        require(status == 1, "Agreement not active"); // 1 = Active status
        _;
    }

    modifier onlyAuthorized() {
        require(
            accessManager.hasRole(msg.sender, keccak256("PAYMENT_MANAGER")) ||
            accessManager.hasRole(msg.sender, keccak256("SYSTEM_ADMIN")),
            "Not authorized"
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
     * @inheritdoc IPaymentManager
     */
    function processRentPayment(uint256 agreementId)
        external
        payable
        override
        whenNotPaused
        nonReentrant
        onlyValidAgreement(agreementId)
        returns (bool)
    {
        (,,,,,uint256 rentAmount,,,,) = rentalCore.getAgreementDetails(agreementId);
        require(msg.value >= rentAmount, "Insufficient payment");

        PaymentRecord memory newPayment = PaymentRecord({
            timestamp: block.timestamp,
            amount: msg.value,
            paymentType: PaymentType.Rent,
            confirmed: true
        });

        _paymentHistory[agreementId].push(newPayment);
        _lastPaymentDate[agreementId] = block.timestamp;
        _updateOutstandingBalance(agreementId);

        emit RentPaymentProcessed(agreementId, msg.value, msg.sender, block.timestamp);
        emit PaymentConfirmed(agreementId, msg.value, PaymentType.Rent);

        return true;
    }

    /**
     * @inheritdoc IPaymentManager
     */
    function processDeposit(uint256 agreementId)
        external
        payable
        override
        whenNotPaused
        nonReentrant
        onlyValidAgreement(agreementId)
        returns (bool)
    {
        (,,,,,, uint256 depositAmount,,) = rentalCore.getAgreementDetails(agreementId);
        require(msg.value >= depositAmount, "Insufficient deposit");

        PaymentRecord memory newPayment = PaymentRecord({
            timestamp: block.timestamp,
            amount: msg.value,
            paymentType: PaymentType.Deposit,
            confirmed: true
        });

        _paymentHistory[agreementId].push(newPayment);
        _depositBalances[agreementId] = _depositBalances[agreementId].add(msg.value);

        emit DepositProcessed(agreementId, msg.value, msg.sender);
        emit PaymentConfirmed(agreementId, msg.value, PaymentType.Deposit);

        return true;
    }

    /**
     * @inheritdoc IPaymentManager
     */
    function releaseDeposit(
        uint256 agreementId,
        uint256 amount,
        address payable recipient
    )
        external
        override
        whenNotPaused
        nonReentrant
        onlyAuthorized
        returns (bool)
    {
        require(recipient != address(0), "Invalid recipient");
        require(amount <= _depositBalances[agreementId], "Insufficient deposit balance");

        _depositBalances[agreementId] = _depositBalances[agreementId].sub(amount);
        
        (bool success, ) = recipient.call{value: amount}("");
        require(success, "Transfer failed");

        emit DepositReleased(agreementId, amount, recipient);
        return true;
    }

    /**
     * @inheritdoc IPaymentManager
     */
    function getPaymentHistory(uint256 agreementId)
        external
        view
        override
        returns (
            uint256[] memory timestamps,
            uint256[] memory amounts,
            uint8[] memory types
        )
    {
        PaymentRecord[] storage records = _paymentHistory[agreementId];
        uint256 length = records.length;

        timestamps = new uint256[](length);
        amounts = new uint256[](length);
        types = new uint8[](length);

        for (uint256 i = 0; i < length; i++) {
            timestamps[i] = records[i].timestamp;
            amounts[i] = records[i].amount;
            types[i] = uint8(records[i].paymentType);
        }

        return (timestamps, amounts, types);
    }

    /**
     * @inheritdoc IPaymentManager
     */
    function calculateOutstandingRent(uint256 agreementId)
        external
        view
        override
        returns (uint256 amount, uint256 lateFees)
    {
        amount = _outstandingBalance[agreementId];
        lateFees = _calculateLateFees(agreementId);
        return (amount, lateFees);
    }

    /**
     * @inheritdoc IPaymentManager
     */
    function handleLateFees(uint256 agreementId)
        external
        override
        whenNotPaused
        nonReentrant
        onlyAuthorized
        returns (uint256)
    {
        uint256 lateFees = _calculateLateFees(agreementId);
        if (lateFees > 0) {
            _outstandingBalance[agreementId] = _outstandingBalance[agreementId].add(lateFees);
            emit LateFeeCharged(agreementId, lateFees);
        }
        return lateFees;
    }

    /**
     * @inheritdoc IPaymentManager
     */
    function getDepositBalance(uint256 agreementId)
        external
        view
        override
        returns (uint256)
    {
        return _depositBalances[agreementId];
    }

    /**
     * @notice Calculates late fees for an agreement
     * @param agreementId ID of the agreement
     * @return Late fee amount
     */
    function _calculateLateFees(uint256 agreementId) private view returns (uint256) {
        (,,, uint256 startDate,,uint256 rentAmount,,,) = rentalCore.getAgreementDetails(agreementId);
        
        uint256 lastPayment = _lastPaymentDate[agreementId];
        if (lastPayment == 0) {
            lastPayment = startDate;
        }

        uint256 daysLate = (block.timestamp.sub(lastPayment)).div(SECONDS_PER_DAY);
        if (daysLate <= GRACE_PERIOD_DAYS) {
            return 0;
        }

        return rentAmount.mul(LATE_FEE_PERCENTAGE).div(100);
    }

    /**
     * @notice Updates the outstanding balance for an agreement
     * @param agreementId ID of the agreement
     */
    function _updateOutstandingBalance(uint256 agreementId) private {
        (,,, uint256 startDate,, uint256 rentAmount,,,) = rentalCore.getAgreementDetails(agreementId);
        
        uint256 monthsSinceStart = (block.timestamp.sub(startDate)).div(30 days);
        uint256 expectedTotal = rentAmount.mul(monthsSinceStart.add(1));
        
        uint256 totalPaid = 0;
        PaymentRecord[] storage records = _paymentHistory[agreementId];
        for (uint256 i = 0; i < records.length; i++) {
            if (records[i].paymentType == PaymentType.Rent && records[i].confirmed) {
                totalPaid = totalPaid.add(records[i].amount);
            }
        }

        _outstandingBalance[agreementId] = expectedTotal > totalPaid ? 
            expectedTotal.sub(totalPaid) : 0;
        
        emit BalanceUpdated(agreementId, _outstandingBalance[agreementId]);
    }

    /**
     * @notice Emergency withdrawal of funds
     * @dev Only callable by system admin
     * @param recipient Address to receive the funds
     */
    function emergencyWithdraw(address payable recipient) external onlyAuthorized {
        require(recipient != address(0), "Invalid recipient");
        uint256 balance = address(this).balance;
        (bool success, ) = recipient.call{value: balance}("");
        require(success, "Transfer failed");
    }

    // Function to receive ETH
    receive() external payable {}
}