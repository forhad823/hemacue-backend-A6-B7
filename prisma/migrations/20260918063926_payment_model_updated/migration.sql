-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "gatewayResponse" JSONB,
ADD COLUMN     "paidAt" TEXT,
ADD COLUMN     "payerReference" TEXT,
ADD COLUMN     "paymentGateway" TEXT NOT NULL DEFAULT 'bkash',
ADD COLUMN     "refundAmount" DECIMAL(10,2),
ADD COLUMN     "refundReason" TEXT,
ADD COLUMN     "refundTrxId" TEXT,
ADD COLUMN     "refundedAt" TEXT;
