import { Dashboard } from "@/components/dashboard";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
export default async function DashboardPage(){
  const session=(await cookies()).get("futonic_session");
  if(!session) redirect("/login");
  return <Dashboard/>;
}
