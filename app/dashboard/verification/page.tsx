import { Header } from "@/components/dashboard/header";
import { VerificationCard } from "@/components/settings/verification-card";

export default function VerificationPage() {
  return (
    <>
      <Header title="توثيق المتجر" description="قدّم طلب التوثيق وتابع حالته ومدة الشارة." search={false} />
      <div className="mt-6 max-w-2xl">
        <VerificationCard />
      </div>
    </>
  );
}