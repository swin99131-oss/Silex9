# Salix — واجهات الزبون

سوق إلكتروني (Next.js 14 App Router + TypeScript + Tailwind CSS)، بالعربية
وباتجاه RTL كامل.

## التشغيل

npm install
npm run dev

## خريطة الشاشات

/ → Splash | /onboarding → الترحيب | /home → الرئيسية | /category → التصنيفات
/search → البحث | /product/[id] → تفاصيل المنتج | /cart → السلة
/checkout → الدفع | /favorites → المفضلة | /profile → الحساب

## إشعارات OneSignal

إشعارات التطبيق الداخلية تقرأ من جدول `public.notifications` الحالي، وتحتاج إضافته إلى Supabase Realtime (وهو مفعّل في قاعدة البيانات الحالية). لا يلزم إنشاء جدول جديد.

اضبط متغيرات البيئة التالية:

```env
NEXT_PUBLIC_ONESIGNAL_APP_ID=
ONESIGNAL_APP_ID=
ONESIGNAL_REST_API_KEY=
ONESIGNAL_WEBHOOK_SECRET=
```

`NEXT_PUBLIC_ONESIGNAL_APP_ID` هو معرّف تطبيق الويب في OneSignal. يمكن ضبط `ONESIGNAL_APP_ID` كنسخة خادمية من المعرّف، وإلا يستخدم المسار القيمة العامة. `ONESIGNAL_REST_API_KEY` و`ONESIGNAL_WEBHOOK_SECRET` أسرار خادمية، ولا تضع بادئة `NEXT_PUBLIC_` عليهما.

من Supabase أنشئ Database Webhook على `public.notifications` لحدث `INSERT`، بعنوان `https://<نطاق-التطبيق>/api/onesignal/notifications`. إذا ضبطت `ONESIGNAL_WEBHOOK_SECRET` فأرسلها في ترويسة `x-onesignal-webhook-secret`. إن لم تضبطها، استخدم ترويسة `Authorization: Bearer <ONESIGNAL_REST_API_KEY>`؛ لا تضع المفتاح داخل عنوان URL. يرسل المسار إشعار OneSignal إلى External ID المطابق لـ `user_id`. يستخدم المتصفح زر «تفعيل إشعارات الجهاز» لطلب إذن Push من المستخدم، وملف `public/OneSignalSDKWorker.js` لخدمة الويب.

يرسل الـWebhook أي صف جديد يُضاف إلى جدول الإشعارات. الدالة الحالية `admin_review_campaign` تنشئ إشعارات قرارات الحملات؛ أما الإعجابات والمتابعات والرسائل وغيرها فتحتاج مساراتها أو تريغرات قاعدة البيانات إلى إدخال صفوف في الجدول حتى تصل كإشعارات Push.
