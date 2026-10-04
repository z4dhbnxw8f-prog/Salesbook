ALTER TABLE "Item" ADD COLUMN "employeePercentageBps" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Item" ADD CONSTRAINT "Item_employeePercentageBps_check" CHECK ("employeePercentageBps" BETWEEN 0 AND 10000);
ALTER TABLE "Sale" ADD COLUMN "employeePercentageBps" INTEGER NOT NULL DEFAULT 0, ADD COLUMN "commissionMinor" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_employeePercentageBps_check" CHECK ("employeePercentageBps" BETWEEN 0 AND 10000), ADD CONSTRAINT "Sale_commissionMinor_check" CHECK ("commissionMinor" BETWEEN 0 AND "totalMinor");
