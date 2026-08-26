import { buildStatus } from "@/lib/hive";
import { HiveBoard } from "./HiveBoard";

export const dynamic = "force-dynamic";

export default function HivePage() {
  const status = buildStatus();
  return <HiveBoard initial={status} />;
}
