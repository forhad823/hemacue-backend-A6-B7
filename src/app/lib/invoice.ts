import path from "node:path";
import ejs from "ejs";
import PDFDocument from "pdfkit";
import type { BloodRequest, Payment } from "../../../generated/prisma/client";
import config from "../config";
import { transporter } from "./nodemailer";
import { prisma } from "./prisma";

const formatDateTime = (value: Date | string): string => {
	const date = typeof value === "string" ? new Date(value) : value;

	return date.toLocaleString("en-GB", {
		day: "2-digit",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: true,
	});
};

/**
 * generateInvoicePdf - streams invoice content into an in-memory Buffer.
 * The buffer is attached directly to the email, nothing is written to disk.
 */
export const generateInvoicePdf = async (
	payment: Payment,
	request: BloodRequest,
): Promise<Buffer> => {
	return new Promise((resolve, reject) => {
		const doc = new PDFDocument({ margin: 50, size: "A4" });
		const chunks: Buffer[] = [];

		doc.on("data", (chunk: Uint8Array) => chunks.push(Buffer.from(chunk)));
		doc.on("end", () => resolve(Buffer.concat(chunks)));
		doc.on("error", reject);

		// Header
		doc.fontSize(24).fillColor("#c0392b").text("HEMACUE", { align: "center" });
		doc
			.fontSize(10)
			.fillColor("#666666")
			.text("Blood Donation & Emergency Service Platform", { align: "center" });
		doc.moveDown();

		doc
			.fontSize(16)
			.fillColor("#222222")
			.text("Payment Invoice", { align: "center" });
		doc.moveDown(0.5);

		doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#dddddd").stroke();
		doc.moveDown();

		// Invoice / reference details
		doc.fontSize(11).fillColor("#333333");
		doc.text(`Invoice / Reference Number: ${payment.id}`);
		doc.text(
			`Issue Date & Time: ${formatDateTime(payment.paidAt ?? new Date())}`,
		);
		doc.moveDown(0.5);

		// Payment details
		doc.text(`Payment ID (bKash): ${payment.paymentID}`, {
			lineBreak: true,
		});
		doc.text(`Transaction ID (bKash): ${payment.trxID ?? "N/A"}`);
		doc.text(`Payment Type: ${payment.paymentType.replaceAll("_", " ")}`);
		doc.text(
			`Amount: ${payment.amount.toFixed(2)} ${payment.currency ?? "BDT"}`,
		);
		doc.text(`Payer Reference: ${payment.payerReference ?? "N/A"}`);
		doc.text(`Status: ${payment.status}`);
		doc.moveDown(0.5);

		// Patient / request summary
		doc.fontSize(12).fillColor("#c0392b").text("Patient / Request Summary");
		doc.fontSize(11).fillColor("#333333");
		doc.text(`Patient Name: ${request.patientName}`);
		doc.text(`Patient Age: ${request.patientAge}`);
		doc.text(`Blood Group: ${request.bloodGroup}`);
		doc.text(`Hospital: ${request.hospitalName}`);
		doc.text(`Hospital Address: ${request.hospitalAddress}`);
		doc.text(`District / City: ${request.district} / ${request.city}`);
		doc.text(`Request Status: ${request.status}`);
		doc.moveDown();

		doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#dddddd").stroke();
		doc.moveDown();

		doc
			.fontSize(9)
			.fillColor("#888888")
			.text(
				"This is a system-generated invoice from the Hemacue platform. " +
					"Thank you for using Hemacue.",
				{ align: "center" },
			);

		doc.end();
	});
};

/**
 * sendInvoiceEmail - renders the EJS invoice template and sends it with the
 * generated PDF attached. Failures are logged to AuditLog
 * (action: "INVOICE_EMAIL_FAILED") but never thrown: an email failure must not
 * roll back or fail a payment that already succeeded.
 */
export const sendInvoiceEmail = async (
	toEmail: string,
	payment: Payment,
	pdfBuffer: Buffer,
	patientName?: string,
): Promise<void> => {
	try {
		const templatePath = path.join(
			process.cwd(),
			"src/app/templates/invoice.ejs",
		);

		const html = await ejs.renderFile(templatePath, {
			payment,
			issuedAt: formatDateTime(new Date()),
			paymentTypeLabel: payment.paymentType.replaceAll("_", " "),
			patientName: patientName ?? "N/A",
		});

		await transporter.sendMail({
			from: config.email_sender,
			to: toEmail,
			subject: `Hemacue Payment Invoice - ${payment.paymentType.replaceAll("_", " ")}`,
			html,
			attachments: [
				{
					filename: `invoice-${payment.paymentID}.pdf`,
					content: pdfBuffer,
					contentType: "application/pdf",
				},
			],
		});
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown email error";

		console.error("Invoice email failed:", errorMessage);

		await prisma.auditLog
			.create({
				data: {
					userId: payment.userId,
					action: "INVOICE_EMAIL_FAILED",
					entity: "Payment",
					entityId: payment.id,
					details: {
						paymentID: payment.paymentID,
						error: errorMessage,
					},
				},
			})
			.catch((logError) => {
				console.error("Failed to log invoice email error:", logError);
			});
	}
};
