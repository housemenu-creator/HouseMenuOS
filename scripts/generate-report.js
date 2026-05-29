const { jsPDF } = require("jspdf");
const fs = require("fs");
const path = require("path");

/**
 * Tier 4 Implementation Script: PDF Report Generator
 * Usage: node generate-report.js '{"orderId": "123", "items": [...], "total": 25.5}'
 */

async function generateOrderPDF() {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.error("No data provided.");
        process.exit(1);
    }

    try {
        const data = JSON.parse(args[0]);
        const doc = new jsPDF();

        // Styles
        const primaryColor = [251, 191, 36]; // Amber-400
        
        // Header
        doc.setFillColor(7, 9, 18); // Dark background
        doc.rect(0, 0, 210, 40, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.text("HOUSE ALMUERZOS", 105, 20, { align: "center" });
        
        doc.setFontSize(10);
        doc.text("TICKET DE PEDIDO PREMIUM", 105, 30, { align: "center" });

        // Body
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.text(`ID Pedido: #${data.orderId || '001'}`, 20, 50);
        doc.text(`Fecha: ${new Date().toLocaleString()}`, 20, 60);
        
        doc.setDrawColor(...primaryColor);
        doc.line(20, 65, 190, 65);

        // Items Table
        let yPos = 75;
        doc.setFont("helvetica", "bold");
        doc.text("Producto / Detalle", 20, yPos);
        doc.text("Precio", 170, yPos);
        doc.setFont("helvetica", "normal");
        
        yPos += 10;
        data.items.forEach(item => {
            doc.text(item.name, 20, yPos);
            doc.text(`S/ ${item.price.toFixed(2)}`, 170, yPos);
            yPos += 7;
            if (item.details) {
                doc.setFontSize(8);
                doc.setTextColor(100, 100, 100);
                doc.text(item.details.join(" • "), 25, yPos);
                doc.setTextColor(0, 0, 0);
                doc.setFontSize(12);
                yPos += 7;
            }
        });

        doc.line(20, yPos, 190, yPos);
        yPos += 15;

        // Total
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("TOTAL A PAGAR:", 120, yPos);
        doc.setTextColor(...primaryColor);
        doc.text(`S/ ${data.total.toFixed(2)}`, 170, yPos);

        // Footer
        yPos += 30;
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text("¡Gracias por elegir House Almuerzos!", 105, yPos, { align: "center" });
        doc.text("Síguenos en Instagram: @house.menu.pe", 105, yPos + 5, { align: "center" });

        // Save
        const fileName = `order_${data.orderId || Date.now()}.pdf`;
        const filePath = path.join(__dirname, "..", "reports", fileName);
        
        const pdfOutput = doc.output();
        fs.writeFileSync(filePath, pdfOutput, 'binary');

        console.log(`Reporte generado exitosamente en: ${filePath}`);
    } catch (error) {
        console.error("Error generating PDF:", error.message);
        process.exit(1);
    }
}

generateOrderPDF();
