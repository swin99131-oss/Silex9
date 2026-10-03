import { redirect } from "next/navigation";

// الطلبات تظهر في لوحة التاجر فقط
export default function Page() {
  redirect("/profile");
}
