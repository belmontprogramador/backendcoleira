-- CreateIndex
CREATE INDEX "payment_transactions_status_created_at_idx" ON "payment_transactions"("status", "created_at");

-- CreateIndex
CREATE INDEX "pets_created_at_idx" ON "pets"("created_at");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at");
