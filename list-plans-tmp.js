"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const adapter_pg_1 = require("@prisma/adapter-pg");
const client_1 = require("./src/generated/prisma/client");
const adapter = new adapter_pg_1.PrismaPg({ connectionString: process.env.DATABASE_URL });
const p = new client_1.PrismaClient({ adapter });
async function main() {
    const plans = await p.plan.findMany({
        select: { code: true, name: true, price_cents: true, interval: true },
    });
    console.log(JSON.stringify(plans, null, 2));
    await p.$disconnect();
}
main().catch((e) => {
    console.error(e.message);
    process.exit(1);
});
//# sourceMappingURL=list-plans-tmp.js.map