-- CreateTable
CREATE TABLE "TicketCollaborator" (
    "ticketId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketCollaborator_pkey" PRIMARY KEY ("ticketId","userId")
);

-- CreateIndex
CREATE INDEX "TicketCollaborator_userId_idx" ON "TicketCollaborator"("userId");

-- AddForeignKey
ALTER TABLE "TicketCollaborator" ADD CONSTRAINT "TicketCollaborator_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketCollaborator" ADD CONSTRAINT "TicketCollaborator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
