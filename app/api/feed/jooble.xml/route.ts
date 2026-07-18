import { feedResponse } from "../_shared";

export async function GET(req: Request) {
  return feedResponse(req, "jooble");
}
