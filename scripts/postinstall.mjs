/**
 * Post-install hook for Hostinger and local dev.
 *
 * Default (production / Hostinger): prisma generate + next build
 * Local fast install: SKIP_NEXT_BUILD=1 npm install
 */
import { execSync } from "child_process";

execSync("npx prisma generate", { stdio: "inherit" });

if (process.env.SKIP_NEXT_BUILD === "1") {
  console.log("[postinstall] Skipping next build (SKIP_NEXT_BUILD=1)");
} else {
  console.log("[postinstall] Running next build…");
  execSync("npx next build", { stdio: "inherit" });
}
