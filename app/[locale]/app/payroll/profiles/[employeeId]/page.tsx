export const dynamic = "force-dynamic";

import { PayProfileView } from "@/components/features/pay-profile";

export default function PayProfilePage({ params }: { params: { employeeId: string } }) {
  return <PayProfileView employeeId={params.employeeId} />;
}
