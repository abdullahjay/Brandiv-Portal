-- CreateEnum
CREATE TYPE "UpsellBillingMode" AS ENUM ('one_time', 'recurring');

-- CreateEnum
CREATE TYPE "UpsellStatus" AS ENUM ('pending', 'approved', 'active', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "ProjectValueChangeType" AS ENUM ('initial_value', 'value_correction', 'upsell_added', 'upsell_cancelled', 'manual_adjustment');

-- AlterTable
ALTER TABLE "invoice_line_items" ADD COLUMN     "upsellId" TEXT;

-- AlterTable
ALTER TABLE "commissions" ADD COLUMN     "upsellId" TEXT;

-- CreateTable
CREATE TABLE "project_upsells" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "billingMode" "UpsellBillingMode" NOT NULL,
    "status" "UpsellStatus" NOT NULL DEFAULT 'pending',
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "amountOriginal" BIGINT NOT NULL DEFAULT 0,
    "amountPkr" BIGINT NOT NULL,
    "commissionRatePct" DECIMAL(5,2) NOT NULL,
    "managingCommissionRatePct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "projectId" TEXT NOT NULL,
    "earnerAccountId" TEXT NOT NULL,
    "managingPartnerId" TEXT,
    "createdById" TEXT,
    "approvedById" TEXT,

    CONSTRAINT "project_upsells_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_value_changes" (
    "id" TEXT NOT NULL,
    "changeType" "ProjectValueChangeType" NOT NULL,
    "oldValuePkr" BIGINT NOT NULL,
    "newValuePkr" BIGINT NOT NULL,
    "deltaPkr" BIGINT NOT NULL,
    "oldValueOriginal" BIGINT,
    "newValueOriginal" BIGINT,
    "currency" VARCHAR(3) NOT NULL,
    "reason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT NOT NULL,
    "relatedUpsellId" TEXT,
    "createdById" TEXT,

    CONSTRAINT "project_value_changes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_upsells_projectId_idx" ON "project_upsells"("projectId");

-- CreateIndex
CREATE INDEX "project_upsells_earnerAccountId_idx" ON "project_upsells"("earnerAccountId");

-- CreateIndex
CREATE INDEX "project_upsells_managingPartnerId_idx" ON "project_upsells"("managingPartnerId");

-- CreateIndex
CREATE INDEX "project_upsells_status_idx" ON "project_upsells"("status");

-- CreateIndex
CREATE INDEX "project_value_changes_projectId_idx" ON "project_value_changes"("projectId");

-- CreateIndex
CREATE INDEX "project_value_changes_relatedUpsellId_idx" ON "project_value_changes"("relatedUpsellId");

-- CreateIndex
CREATE INDEX "invoice_line_items_upsellId_idx" ON "invoice_line_items"("upsellId");

-- CreateIndex
CREATE INDEX "commissions_upsellId_idx" ON "commissions"("upsellId");

-- AddForeignKey
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_upsellId_fkey" FOREIGN KEY ("upsellId") REFERENCES "project_upsells"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_upsellId_fkey" FOREIGN KEY ("upsellId") REFERENCES "project_upsells"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_upsells" ADD CONSTRAINT "project_upsells_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_upsells" ADD CONSTRAINT "project_upsells_earnerAccountId_fkey" FOREIGN KEY ("earnerAccountId") REFERENCES "crm_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_upsells" ADD CONSTRAINT "project_upsells_managingPartnerId_fkey" FOREIGN KEY ("managingPartnerId") REFERENCES "crm_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_upsells" ADD CONSTRAINT "project_upsells_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_upsells" ADD CONSTRAINT "project_upsells_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_value_changes" ADD CONSTRAINT "project_value_changes_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_value_changes" ADD CONSTRAINT "project_value_changes_relatedUpsellId_fkey" FOREIGN KEY ("relatedUpsellId") REFERENCES "project_upsells"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_value_changes" ADD CONSTRAINT "project_value_changes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

