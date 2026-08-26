import fs from "node:fs";
import path from "node:path";

const apiRoot = path.join(process.cwd(), "src", "app", "api");

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (entry.name === "route.ts") files.push(full);
  }
  return files;
}

function migrateFile(file) {
  if (file.includes(`${path.sep}auth${path.sep}`)) return false;

  let content = fs.readFileSync(file, "utf8");
  if (!content.includes("getServerSession")) return false;

  content = content.replace(
    /import \{ getServerSession \} from "next-auth";\r?\nimport \{ authOptions \} from "@backend\/lib\/auth";\r?\n/g,
    'import { requireApiUser } from "@backend/lib/requestAuth";\n'
  );

  content = content.replace(
    /const session = await getServerSession\(authOptions\);\r?\n\s*if \(!session\?\.user\) return unauthorized\(\);/g,
    "const user = requireApiUser(req);\n    if (!user) return unauthorized();"
  );

  content = content.replace(/session\.user\./g, "user.");

  if (content.includes("getServerSession") || content.includes("authOptions")) {
    console.warn(`Skipped (unhandled pattern): ${file}`);
    return false;
  }

  if (!content.includes("requireApiUser(req)")) {
    console.warn(`Skipped (no replacement): ${file}`);
    return false;
  }

  if (!/\breq\b/.test(content.split("export async function")[1] ?? "")) {
    // Ensure handlers use `req` param name for requireApiUser(req)
    content = content.replace(/export async function (GET|POST|PUT|PATCH|DELETE)\(\)/g, "export async function $1(req: Request)");
    content = content.replace(/export async function (GET|POST|PUT|PATCH|DELETE)\(_req: Request\)/g, "export async function $1(req: Request)");
  }

  fs.writeFileSync(file, content);
  return true;
}

const files = walk(apiRoot);
let count = 0;
for (const file of files) {
  if (migrateFile(file)) {
    count++;
    console.log("Migrated:", path.relative(process.cwd(), file));
  }
}
console.log(`Done. Migrated ${count} route files.`);
