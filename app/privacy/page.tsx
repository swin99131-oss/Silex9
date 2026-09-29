import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/LegalPage";

export const metadata: Metadata = { title: "سياسة الخصوصية" };

const email = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;

export default function PrivacyPage() {
  return (
    <LegalPage title="سياسة الخصوصية" updated="29 سبتمبر 2026">
      <LegalSection title="مقدمة">
        <p>ساليكس سوق إلكتروني يربط الزبائن بالتجار. توضح هذه السياسة ما نجمعه من بيانات وكيف نستخدمها وما هي خياراتك.</p>
      </LegalSection>

      <LegalSection title="البيانات التي نجمعها">
        <ul className="list-disc space-y-1 pr-5">
          <li>بيانات الحساب: الاسم والبريد الإلكتروني، أو بيانات حساب Google عند التسجيل به.</li>
          <li>بيانات الملف الشخصي: اسم المستخدم والصورة والنبذة وروابط التواصل، وبيانات المتجر للتجار.</li>
          <li>المحتوى الذي تنشره: المنشورات والقصص والتعليقات والصور ومقاطع الفيديو.</li>
          <li>المحادثات بينك وبين المستخدمين الآخرين.</li>
          <li>بيانات التجار في لوحة التحكم: المنتجات والمخزون والطلبات ودفتر الديون.</li>
          <li>سلة التسوق والمفضلة.</li>
        </ul>
      </LegalSection>

      <LegalSection title="كيف نستخدم بياناتك">
        <p>نستخدمها لتشغيل حسابك، وعرض المنشورات والمنتجات، وتمكين التواصل بين الزبائن والتجار، وتحسين الخدمة، وحماية المنصة من إساءة الاستخدام.</p>
      </LegalSection>

      <LegalSection title="المشاركة">
        <p>لا نبيع بياناتك الشخصية لأي طرف. المحتوى العام مثل المنشورات والملف الشخصي يظهر لمستخدمي المنصة. نستعين بمزودي خدمات تقنية للاستضافة وقاعدة البيانات والتخزين وتسجيل الدخول من أجل تشغيل المنصة فقط.</p>
      </LegalSection>

      <LegalSection title="الاحتفاظ والحذف">
        <p>نحتفظ ببياناتك ما دام حسابك قائماً. يمكنك طلب حذف حسابك وبياناتك من الإعدادات أو بالتواصل معنا.</p>
      </LegalSection>

      <LegalSection title="الأمان">
        <p>نستخدم اتصالاً مشفراً وضوابط وصول على مستوى قاعدة البيانات لحماية بياناتك، ومع ذلك لا توجد وسيلة حماية مضمونة بالكامل.</p>
      </LegalSection>

      <LegalSection title="الأطفال">
        <p>المنصة غير موجهة لمن تقل أعمارهم عن 13 سنة.</p>
      </LegalSection>

      <LegalSection title="التواصل">
        <p>لأي استفسار عن الخصوصية{email ? <>: <a href={`mailto:${email}`} className="underline">{email}</a></> : " تواصل معنا عبر التطبيق."}</p>
      </LegalSection>

      <LegalSection title="تعديل السياسة">
        <p>قد نحدّث هذه السياسة من وقت لآخر، وسنذكر تاريخ آخر تحديث أعلى الصفحة.</p>
      </LegalSection>
    </LegalPage>
  );
}
