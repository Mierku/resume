CREATE TABLE "AIConversation" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "resumeId" TEXT,
  "title" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AIConversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AIConversationMessage" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "card" JSONB,
  "meta" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AIConversationMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AIConversation_userId_updatedAt_idx"
  ON "AIConversation"("userId", "updatedAt");

CREATE INDEX "AIConversation_userId_resumeId_updatedAt_idx"
  ON "AIConversation"("userId", "resumeId", "updatedAt");

CREATE INDEX "AIConversationMessage_conversationId_createdAt_idx"
  ON "AIConversationMessage"("conversationId", "createdAt");

ALTER TABLE "AIConversation"
  ADD CONSTRAINT "AIConversation_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AIConversation"
  ADD CONSTRAINT "AIConversation_resumeId_fkey"
  FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AIConversationMessage"
  ADD CONSTRAINT "AIConversationMessage_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "AIConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
