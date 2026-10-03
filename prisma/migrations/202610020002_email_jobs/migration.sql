CREATE TABLE "EmailJob" (
 "id" TEXT PRIMARY KEY, "key" TEXT NOT NULL UNIQUE, "bookingId" TEXT NOT NULL,
 "recipient" TEXT NOT NULL, "subject" TEXT NOT NULL, "body" TEXT NOT NULL,
 "dueAt" TIMESTAMPTZ(3) NOT NULL, "sentAt" TIMESTAMPTZ(3),
 "attempts" INTEGER NOT NULL DEFAULT 0, "lastError" TEXT,
 "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "EmailJob_sentAt_dueAt_idx" ON "EmailJob"("sentAt", "dueAt");
ALTER TABLE "EmailJob" ADD CONSTRAINT "EmailJob_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE;
