-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "client" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "colorId" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "uwagi" TEXT NOT NULL DEFAULT '',
    "notatki" TEXT NOT NULL DEFAULT '',
    "completedAt" DATETIME,
    "totalOfficeTime" REAL,
    "totalFactoryTime" REAL,
    "totalCost" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_colorId_fkey" FOREIGN KEY ("colorId") REFERENCES "Color" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "Stage" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("categoryId", "client", "colorId", "completedAt", "createdAt", "id", "name", "price", "stageId", "status", "totalCost", "totalFactoryTime", "totalOfficeTime", "updatedAt") SELECT "categoryId", "client", "colorId", "completedAt", "createdAt", "id", "name", "price", "stageId", "status", "totalCost", "totalFactoryTime", "totalOfficeTime", "updatedAt" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
