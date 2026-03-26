DELETE FROM "Session"
WHERE NOT EXISTS (
  SELECT 1
  FROM "AuthAccount"
  WHERE "AuthAccount"."userId" = "Session"."userId"
);

DELETE FROM "User"
WHERE NOT EXISTS (
  SELECT 1
  FROM "AuthAccount"
  WHERE "AuthAccount"."userId" = "User"."id"
);
