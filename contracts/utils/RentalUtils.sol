// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title RentalUtils
 * @notice Utility functions for Polish real estate rental calculations and validations
 * @dev Library of pure functions that can be used by other contracts
 */
library RentalUtils {
    // Constants for Polish rental market specifics
    uint256 public constant MAX_DEPOSIT_MONTHS = 3;
    uint256 public constant MIN_RENTAL_PERIOD_DAYS = 30;
    uint256 public constant MAX_RENTAL_PERIOD_YEARS = 10;
    uint256 public constant SECONDS_PER_DAY = 86400;
    uint256 public constant DAYS_PER_YEAR = 365;
    uint256 public constant DEFAULT_NOTICE_PERIOD_DAYS = 30;
    
    /**
     * @notice Validates rental period according to Polish law
     * @param startDate Start date of the rental
     * @param endDate End date of the rental
     * @return valid Whether the rental period is valid
     * @return reason Reason code if invalid (0 if valid)
     */
    function validateRentalPeriod(uint256 startDate, uint256 endDate) public pure returns (bool valid, uint8 reason) {
        if (startDate >= endDate) {
            return (false, 1); // End date must be after start date
        }

        uint256 durationDays = (endDate - startDate) / SECONDS_PER_DAY;
        
        if (durationDays < MIN_RENTAL_PERIOD_DAYS) {
            return (false, 2); // Duration too short
        }

        if (durationDays > MAX_RENTAL_PERIOD_YEARS * DAYS_PER_YEAR) {
            return (false, 3); // Duration too long
        }

        return (true, 0);
    }

    /**
     * @notice Validates deposit amount according to Polish law
     * @param rentAmount Monthly rent amount
     * @param depositAmount Security deposit amount
     * @return valid Whether the deposit amount is valid
     * @return reason Reason code if invalid (0 if valid)
     */
    function validateDeposit(uint256 rentAmount, uint256 depositAmount) public pure returns (bool valid, uint8 reason) {
        if (depositAmount == 0) {
            return (false, 1); // Deposit required
        }

        if (depositAmount > rentAmount * MAX_DEPOSIT_MONTHS) {
            return (false, 2); // Deposit exceeds maximum allowed
        }

        return (true, 0);
    }

    /**
     * @notice Calculates notice period based on rental duration
     * @param startDate Start date of the rental
     * @param currentTimestamp Current timestamp
     * @return noticePeriodDays Required notice period in days
     */
    function calculateNoticePeriod(uint256 startDate, uint256 currentTimestamp) public pure returns (uint256 noticePeriodDays) {
        uint256 rentalDuration = (currentTimestamp - startDate) / SECONDS_PER_DAY;
        
        // Polish law specifics for notice periods
        if (rentalDuration < 90) { // Less than 3 months
            return 7; // 7 days notice
        } else if (rentalDuration < 180) { // Less than 6 months
            return 14; // 14 days notice
        } else {
            return DEFAULT_NOTICE_PERIOD_DAYS; // 30 days notice
        }
    }

    /**
     * @notice Calculates late payment fees according to Polish regulations
     * @param amount Original payment amount
     * @param daysLate Number of days payment is late
     * @return lateFee Amount of late fee to charge
     */
    function calculateLateFee(uint256 amount, uint256 daysLate) public pure returns (uint256 lateFee) {
        // Polish statutory interest rate for late payments (current as of 2024)
        uint256 annualRate = 1185; // 11.85% represented as 1185
        
        // Daily rate = Annual rate / 36500 (365 days * 100 for percentage)
        uint256 dailyFee = (amount * annualRate * daysLate) / 36500;
        
        return dailyFee;
    }

    /**
     * @notice Validates a rental price according to market standards
     * @param rentAmount Monthly rent amount
     * @param propertySize Property size in square meters
     * @return valid Whether the rent amount is valid
     * @return reason Reason code if invalid (0 if valid)
     */
    function validateRentAmount(uint256 rentAmount, uint256 propertySize) public pure returns (bool valid, uint8 reason) {
        if (rentAmount == 0) {
            return (false, 1); // Rent cannot be zero
        }

        if (propertySize == 0) {
            return (false, 2); // Invalid property size
        }

        // Minimum rent per square meter (in wei)
        uint256 minRentPerMeter = 10 ether; // Example threshold
        
        if (rentAmount < minRentPerMeter * propertySize) {
            return (false, 3); // Rent too low for property size
        }

        return (true, 0);
    }

    /**
     * @notice Calculates utility costs distribution
     * @param totalCost Total utility cost
     * @param propertySize Total property size
     * @param unitSize Size of specific unit
     * @return unitCost Cost allocated to specific unit
     */
    function calculateUtilityCost(
        uint256 totalCost,
        uint256 propertySize,
        uint256 unitSize
    ) public pure returns (uint256 unitCost) {
        require(propertySize > 0, "Invalid property size");
        require(unitSize <= propertySize, "Unit size exceeds property");
        
        return (totalCost * unitSize) / propertySize;
    }

    /**
     * @notice Validates agreement termination conditions
     * @param startDate Agreement start date
     * @param endDate Agreement end date
     * @param currentTimestamp Current timestamp
     * @return allowed Whether termination is allowed
     * @return penaltyAmount Penalty amount if applicable
     */
    function validateTermination(
        uint256 startDate,
        uint256 endDate,
        uint256 currentTimestamp
    ) public pure returns (bool allowed, uint256 penaltyAmount) {
        if (currentTimestamp < startDate) {
            return (false, 0); // Agreement not yet started
        }

        if (currentTimestamp > endDate) {
            return (false, 0); // Agreement already ended
        }

        uint256 remainingDays = (endDate - currentTimestamp) / SECONDS_PER_DAY;
        
        // Allow termination with different penalties based on remaining time
        if (remainingDays > 180) { // More than 6 months remaining
            return (true, 2); // 2 months rent penalty
        } else if (remainingDays > 90) { // More than 3 months remaining
            return (true, 1); // 1 month rent penalty
        } else {
            return (true, 0); // No penalty
        }
    }

    /**
     * @notice Validates and formats a Polish postal code
     * @param postalCode Postal code as uint
     * @return valid Whether the postal code is valid
     */
    function validatePostalCode(uint256 postalCode) public pure returns (bool valid) {
        // Polish postal codes are in format XX-XXX
        // Here we expect it as uint XXXXX
        if (postalCode < 10000 || postalCode > 99999) {
            return false;
        }
        
        uint256 prefix = postalCode / 1000;
        uint256 suffix = postalCode % 1000;
        
        // Valid Polish postal code prefixes are 00-99
        if (prefix < 0 || prefix > 99) {
            return false;
        }
        
        // Valid suffixes are 000-999
        if (suffix < 0 || suffix > 999) {
            return false;
        }
        
        return true;
    }
}