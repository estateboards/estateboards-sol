# Quick Start Guide - Polish Real Estate Rental System

## Getting Started

This guide provides quick steps to start using the Polish Real Estate Rental Management System, with examples for common scenarios.

## Table of Contents
1. [System Access](#system-access)
2. [Common Workflows](#common-workflows)
3. [Code Examples](#code-examples)
4. [Troubleshooting](#troubleshooting)

## System Access

### For Users

1. **Access the Web Interface**
   ```
   https://your-system-domain.com
   ```

2. **Connect Wallet**
   - Use MetaMask or compatible Web3 wallet
   - Connect to the appropriate network
   - Ensure sufficient ETH for transactions

3. **Request Role Assignment**
   - Contact system administrator
   - Provide required credentials
   - Await role confirmation

### For Developers

1. **Local Setup**
   ```bash
   # Clone repository
   git clone [repository-url]
   cd real-estates-rental

   # Install dependencies
   npm install

   # Setup environment
   cp .env.example .env
   # Edit .env with your values

   # Start local node
   npx hardhat node

   # Deploy contracts
   npx hardhat run scripts/deploy.ts --network localhost
   ```

2. **Contract Addresses (Testnet)**
   ```javascript
   const RENTAL_CORE = "0x...";
   const PAYMENT_MANAGER = "0x...";
   const COMPLIANCE_VERIFIER = "0x...";
   const ACCESS_CONTROL = "0x...";
   ```

## Common Workflows

### 1. Register a Property

```javascript
// Web3 example
const dataHash = ethers.utils.keccak256(
  ethers.utils.defaultAbiCoder.encode(
    ["string", "uint256", "uint256", "uint256"],
    ["ul. Warszawska 1", 12345, 75, 3] // address, postal code, size, rooms
  )
);

const tx = await rentalCore.registerProperty(dataHash);
await tx.wait();
const propertyId = tx.events[0].args.propertyId;
```

### 2. Create Rental Agreement

```javascript
// Web3 example
const agreement = {
  propertyId: 1,
  tenant: "0x...",
  startDate: Math.floor(Date.now() / 1000) + 86400, // tomorrow
  endDate: Math.floor(Date.now() / 1000) + (86400 * 365), // 1 year
  rentAmount: ethers.utils.parseEther("1000"),
  depositAmount: ethers.utils.parseEther("2000"),
  terms: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("Agreement Terms"))
};

const tx = await rentalCore.createAgreement(
  agreement.propertyId,
  agreement.tenant,
  agreement.terms,
  agreement.startDate,
  agreement.endDate,
  agreement.rentAmount,
  agreement.depositAmount
);
```

### 3. Process Payments

```javascript
// Web3 example
// Process rent payment
const tx = await paymentManager.processRentPayment(
  agreementId,
  { value: ethers.utils.parseEther("1000") }
);

// Process deposit
const tx = await paymentManager.processDeposit(
  agreementId,
  { value: ethers.utils.parseEther("2000") }
);
```

### 4. Verify Compliance

```javascript
// Web3 example
const [passed, detailsHash] = await complianceVerifier.verifyContractCompliance(
  agreementId
);

if (passed) {
  console.log("Agreement is compliant");
} else {
  console.log("Compliance issues found");
}
```

## Code Examples

### Event Monitoring

```javascript
// Monitor rental events
rentalCore.on("AgreementCreated", (agreementId, propertyId, landlord, tenant) => {
  console.log(`New agreement ${agreementId} created for property ${propertyId}`);
});

paymentManager.on("RentPaymentProcessed", (agreementId, amount, payer) => {
  console.log(`Rent payment of ${amount} received for agreement ${agreementId}`);
});
```

### Error Handling

```javascript
try {
  const tx = await rentalCore.createAgreement(...);
  await tx.wait();
} catch (error) {
  if (error.message.includes("Not property owner")) {
    console.error("Only property owner can create agreements");
  } else if (error.message.includes("Invalid dates")) {
    console.error("Invalid rental period dates");
  } else {
    console.error("Transaction failed:", error);
  }
}
```

### Utility Functions

```javascript
// Calculate late fees
const calculateLateFee = async (agreementId) => {
  const [amount, lateFees] = await paymentManager.calculateOutstandingRent(
    agreementId
  );
  return { amount, lateFees };
};

// Check user permissions
const checkPermissions = async (address) => {
  const hasPermission = await accessManager.hasPermission(
    address,
    ethers.utils.keccak256("CREATE_AGREEMENT")
  );
  return hasPermission;
};
```

## Troubleshooting

### Common Issues

1. **Transaction Failures**
   ```javascript
   // Check if user has correct role
   const hasRole = await accessManager.hasRole(userAddress, LANDLORD_ROLE);
   if (!hasRole) {
     console.error("User does not have required role");
   }
   ```

2. **Compliance Checks**
   ```javascript
   // Verify all compliance aspects
   const [propertyCompliant] = await complianceVerifier.verifyPropertyCompliance(propertyId);
   const [landlordCompliant] = await complianceVerifier.verifyLandlordCompliance(landlordAddress);
   const [tenantCompliant] = await complianceVerifier.verifyTenantCompliance(tenantAddress);
   ```

3. **Payment Issues**
   ```javascript
   // Check payment status
   const [amount, fees] = await paymentManager.calculateOutstandingRent(agreementId);
   if (amount.gt(0)) {
     console.log(`Outstanding payment: ${ethers.utils.formatEther(amount)} ETH`);
   }
   ```

### Error Messages

| Error Code | Message | Solution |
|------------|---------|----------|
| NOT_AUTHORIZED | "Not authorized" | Check user roles and permissions |
| INVALID_DATES | "Invalid rental period" | Verify date ranges |
| INSUFFICIENT_FUNDS | "Insufficient payment" | Check payment amount |
| COMPLIANCE_FAILED | "Failed compliance check" | Review compliance requirements |

### Support Contacts

- Technical Support: support@system.com
- Compliance Help: compliance@system.com
- Emergency: emergency@system.com