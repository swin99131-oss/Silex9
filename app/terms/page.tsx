import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/LegalPage";

export const metadata: Metadata = { title: "شروط الاستخدام" };

const email = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;

export default function TermsPage() {
  return (
    <LegalPage title="شروط الاستخدام" updated="29 سبتمبر 2026">
      <LegalSection title="القبول">
        <p>باستخدامك ساليكس فإنك توافق على هذه الشروط. إذا لم توافق عليها فلا تستخدم المنصة.</p>
      </LegalSection>

      <LegalSection title="الحساب">
        <p>أنت مسؤول عن حسابك وعن صحة المعلومات التي تدخلها، وعن كل نشاط يتم من خلاله.</p>
      </LegalSection>

      <LegalSection title="المحتوى المسموح">
        <p>يمنع نشر محتوى مخالف للقانون أو مسيء أو احتيالي أو ينتهك حقوق الآخرين، ويمنع عرض منتجات محظورة قانوناً. تبقى حقوق محتواك ملكاً لك، وتمنحنا حق عرضه داخل المنصة لتشغيل الخدمة.</p>
      </LegalSection>

      <LegalSection title="التجار">
        <p>التاجر مسؤول عن دقة بيانات منتجاته وأسعارها وجودتها وتسليمها والاتفاق مع الزبون. المنصة وسيلة للعرض والتواصل، وليست طرفاً في البيع بين الزبون والتاجر ما لم يُذكر خلاف ذلك.</p>
      </LegalSection>

      <LegalSection title="الإعلانات">
        <p>تخضع الإعلانات للمراجعة قبل ظهورها، ويحق لنا رفضها أو إيقافها إذا خالفت الشروط.</p>
      </LegalSection>

      <LegalSection title="الإبلاغ والحظر">
        <p>يحق لنا إزالة أي محتوى وإيقاف أي حساب يخالف هذه الشروط. ويمكنك حظر أي مستخدم أو الإبلاغ عن محتوى من داخل التطبيق.</p>
      </LegalSection>

      <LegalSection title="إخلاء المسؤولية">
        <p>تُقدَّم المنصة كما هي، ولا نضمن أن تعمل دون انقطاع أو أخطاء. لا نتحمل مسؤولية الخلافات بين المستخدمين.</p>
      </LegalSection>

      <LegalSection title="تعديل الشروط">
        <p>قد نعدّل هذه الشروط من وقت لآخر، واستمرارك في الاستخدام يعني موافقتك على النسخة المحدّثة.</p>
      </LegalSection>

      <LegalSection title="التواصل">
        <p>لأي استفسار{email ? <>: <a href={`mailto:${email}`} className="underline">{email}</a></> : " تواصل معنا عبر التطبيق."}</p>
      </LegalSection>
    </LegalPage>
  );
}
