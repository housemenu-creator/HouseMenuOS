# Tier 2 Skill: Reporting & Documentation Specialist

## 🎯 Meta Data
- **Name:** Reporting & Documentation Specialist
- **Description:** Expert in generating business artifacts (Invoices, Sales Reports, Inventory Sheets).
- **Tools:** Node.js, jsPDF, ExcelJS.

---

## 📄 Standard Report Templates

### 1. Invoice / Order Ticket (PDF)
- **Header:** House Almuerzos Logo + Date.
- **Body:** Itemized list of products, individual prices, and packaging costs.
- **Footer:** Total amount + Payment method + Delivery instructions.

### 2. Daily Sales Summary (Excel)
- **Columns:** OrderID, Category, Items, Total, PaymentMethod, Timestamp.

---

## 🛠️ Implementation Logic (Tier 4)
When a report is requested, this specialist calls:
`node scripts/generate-report.js --data <JSON_STRING> --type <PDF|EXCEL>`

---

## 🛡️ Validation Rules
- Never expose sensitive customer data in public-facing reports.
- Ensure all prices match the `src/data/menuData.js` source of truth.
- Verify file system permissions before writing to `/reports` directory.

---
*Skill status: ACTIVE. Domain: Business Intelligence.*
