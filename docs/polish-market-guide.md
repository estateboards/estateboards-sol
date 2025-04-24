# Polish Real Estate Rental Market Guide

## Table of Contents
1. [Legal Framework](#legal-framework)
2. [Market Requirements](#market-requirements)
3. [Compliance Features](#compliance-features)
4. [Document Requirements](#document-requirements)
5. [Payment Regulations](#payment-regulations)

## Legal Framework

### Key Legislation
- Civil Code (Kodeks cywilny)
- Real Estate Management Act (Ustawa o gospodarce nieruchomościami)
- Tenant Rights Protection Act (Ustawa o ochronie praw lokatorów)

### Regulatory Bodies
- Ministry of Justice (Ministerstwo Sprawiedliwości)
- Office of Competition and Consumer Protection (UOKiK)
- Local Housing Authorities

## Market Requirements

### Rental Agreement Requirements
- Written form requirement
- Mandatory agreement elements
- Maximum deposit limitations (3 months rent)
- Notice period regulations
- Termination conditions

### Property Standards
- Minimum habitability requirements
- Safety regulations
- Technical inspections
- Energy certification

### Tenant Rights
- Right to peaceful enjoyment
- Maintenance and repairs
- Rent increase limitations
- Termination protection

## Compliance Features

### System Implementation
- Automated compliance checks
- Regulatory updates handling
- Document verification
- Legal requirement validation

### Smart Contract Validations
```solidity
// Example from RentalUtils
uint256 public constant MAX_DEPOSIT_MONTHS = 3;
uint256 public constant MIN_RENTAL_PERIOD_DAYS = 30;
uint256 public constant MAX_RENTAL_PERIOD_YEARS = 10;
```

### Compliance Checks
- Property registration verification
- Agreement terms validation
- Payment limits enforcement
- Notice period calculations

## Document Requirements

### Required Documentation
1. **Property Documents**
   - Property deed or ownership proof
   - Land and mortgage register excerpt
   - Building permits and certificates
   - Energy performance certificate

2. **Rental Agreement**
   - Main agreement document
   - Property condition protocol
   - Handover protocol
   - Additional terms and conditions

3. **Compliance Documents**
   - Tax declarations
   - Insurance certificates
   - Safety inspection reports
   - Building management approvals

### Document Management
- Digital signature support
- Document hashing and verification
- Secure storage
- Access control

## Payment Regulations

### Rent Payments
- Payment schedule requirements
- Late payment regulations
- Interest rate calculations
- Payment evidence requirements

### Security Deposits
- Maximum deposit amount (3 months rent)
- Deposit handling requirements
- Return conditions and timeframes
- Interest on deposits

### Late Fees
```solidity
// Example from RentalUtils
function calculateLateFee(uint256 amount, uint256 daysLate) public pure returns (uint256) {
    // Polish statutory interest rate for late payments
    uint256 annualRate = 1185; // 11.85%
    uint256 dailyFee = (amount * annualRate * daysLate) / 36500;
    return dailyFee;
}
```

## System Features for Compliance

### Automated Validations
1. **Agreement Creation**
   - Validates terms against legal requirements
   - Ensures compliant deposit amounts
   - Verifies notice periods
   - Checks rental duration limits

2. **Payment Processing**
   - Enforces payment schedules
   - Calculates legal late fees
   - Manages deposit limits
   - Tracks payment history

3. **Document Management**
   - Ensures required documentation
   - Validates document authenticity
   - Maintains compliance records
   - Manages access permissions

### Compliance Reporting
- Regulatory compliance status
- Document validity tracking
- Payment compliance monitoring
- Inspection and maintenance records

## Best Practices

### For Property Owners
- Regular compliance checks
- Timely documentation updates
- Proper payment processing
- Maintenance record keeping

### For Property Managers
- Regular system audits
- Compliance monitoring
- Document verification
- Tenant communication

### For Tenants
- Rights awareness
- Payment obligations
- Documentation requirements
- Communication procedures

## Regulatory Updates

### System Maintenance
- Regular compliance updates
- Parameter adjustments
- Documentation requirements
- Legal requirement tracking

### Change Management
- Update implementation
- User notification
- Documentation updates
- Training requirements