import dotenv from "dotenv";
import pkg from "pg";

dotenv.config();

//
console.log("DATABASE_URL =", process.env.DATABASE_URL);

const { Pool, types } = pkg;

types.setTypeParser(1082, (val) => val);

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

pool.on("error", (err) => {
    console.error("Unexpected Postgres error:", err);
    process.exit(-1);
});

export default pool;
