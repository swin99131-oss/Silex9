import { performance } from 'node:perf_hooks'

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

const seeded = (index, salt = 0) => {
  const x = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453
  return x - Math.floor(x)
}

const nowIso = (offsetMinutes = 0) => { 
  const d = new Date()
  d.setMinutes(d.getMinutes() + offsetMinutes)
  return d.toISOString()
}

const alpha = 'abcdefghijklmnopqrstuvwxyz'
const makeId = (prefix) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`

const createProfiles = (count = 500) => {
  const roles = ['customer', 'merchant']
  const names = ['أحمد', 'سارة', 'محمود', 'ليلى', 'نور', 'عبدالله', 'رنا', 'يوسف', 'دلال', 'عمر', 'سلمان', 'فاطمة']
  const stores = ['سوق المدينة', 'الريحان', 'دار الذهب', 'ريفك', 'نخبة', 'منة', 'عطر الندى', 'ألوان', 'حرف', 'قهوة الريح', 'ستايل مكس']
  const cities = ['الرياض', 'جدة', 'الدمام', 'دبي', 'الكويت', 'بيروت', 'القاهرة', 'عمان', 'دوالة', 'المدينة']

  return Array.from({ length: count }, (_, i) => {
    const isMerchant = i % 3 === 0
    const baseIndex = i + 1
    return {
      id: `user_${baseIndex}`,
      username: `user${baseIndex}`,
      full_name: names[i % names.length] + ' ' + (i + 1),
      role: isMerchant ? 'merchant' : 'customer',
      store_name: isMerchant ? stores[i % stores.length] : null,
      whatsapp: `9665${String((i * 7) % 100000000).padStart(8, '0')}`,
      city: cities[i % cities.length],
      avatar_url: `https://images.example.com/avatar/${baseIndex}.jpg`,
      is_verified: seeded(i, 1) > 0.15,
      created_at: nowIso(-i),
      blocked: false,
    }
  })
}

const createProducts = (merchants, count = 1500) => {
  const categories = ['ملابس', 'إلكترونيات', 'مستحضرات', 'أجهزة', 'أزياء', 'مكسرات', 'منزل', 'مكتبات', 'عناية', 'ملحقات']
  const titles = ['قميص رجالي', 'حقيبة سفر', 'سماعات لاسلكية', 'مكياج فاخر', 'ساعة ذكية', 'خزانة تنظيم', 'حذاء رياضي', 'بطارية Power Bank', 'مسدس شحن', 'شوكة', 'مقلاة', 'كوفي']

  return Array.from({ length: count }, (_, i) => {
    const merchant = merchants[i % merchants.length]
    const price = 15 + ((i * 17) % 1800)
    const stock = (i * 3) % 40 + 1
    const category = categories[i % categories.length]
    return {
      id: `product_${i + 1}`,
      merchant_id: merchant.id,
      title: `${pick(titles)} ${i + 1}`,
      description: `وصف منتج وهمي رقم ${i + 1} مناسب للاختبار ومعالجة المحتوى في التطبيق.`,
      category,
      price,
      old_price: price + 25,
      stock,
      cover_url: `https://images.example.com/products/${i + 1}.jpg`,
      is_active: seeded(i, 2) > 0.12,
      promoted: seeded(i, 3) > 0.7,
      views: 100 + ((i * 29) % 25000),
      rating: Number((3.5 + seeded(i, 5) * 1.5).toFixed(1)),
      reviews: 10 + ((i * 7) % 98),
      created_at: nowIso(-((i * 6) % 2400)),
    }
  })
}

const createStories = (merchants, products, count = 350) => {
  const storyTexts = ['خصم اليوم', 'منتج جديد', 'إعلان سريع', 'أفضل عرض', 'جديدنا', 'تخفيضات', 'قطعة حديثة', 'اقفز الآن']
  const surfaces = ['#111827', '#7c2d12', '#0f766e', '#4f46e5', '#6b21a8', '#be123c']

  return Array.from({ length: count }, (_, i) => {
    const merchant = merchants[(i * 3) % merchants.length]
    const product = products[(i * 7) % products.length]
    return {
      id: `story_${i + 1}`,
      merchant_id: merchant.id,
      text: `${pick(storyTexts)} ${i + 1}`,
      product_id: product.id,
      bg_color: pick(surfaces),
      created_at: nowIso(-(i * 9)),
      expires_at: nowIso(24 + (i % 12)),
      media_url: `https://images.example.com/stories/${i + 1}.jpg`,
    }
  })
}

const createChats = (profiles, count = 250) => {
  const merchants = profiles.filter((p) => p.role === 'merchant')
  const customers = profiles.filter((p) => p.role === 'customer')

  return Array.from({ length: count }, (_, i) => {
    const customer = customers[i % customers.length]
    const merchant = merchants[(i * 5) % merchants.length]
    const conversationId = `conv_${i + 1}`
    return {
      id: conversationId,
      customer_id: customer.id,
      merchant_id: merchant.id,
      status: i % 5 === 0 ? 'reported' : 'active',
      last_message_at: nowIso(-(i % 90)),
      unread_count: (i % 9) + 1,
      ai_muted: i % 7 === 0,
      bot_paused: i % 11 === 0,
    }
  })
}

const createMessages = (conversations, countPerConversation = 18) => {
  const messages = []
  for (const conversation of conversations) {
    for (let j = 0; j < countPerConversation; j += 1) {
      const sender = j % 2 === 0 ? conversation.customer_id : conversation.merchant_id
      const isBot = j % 5 === 0
      messages.push({
        id: `msg_${messages.length + 1}`,
        conversation_id: conversation.id,
        sender_id: sender,
        content: isBot
          ? 'مرحبًا، يمكنني مساعدتك في تفاصيل المنتج.'
          : `رسالة وهمية ${j + 1} في المحادثة ${conversation.id}`,
        media_type: j % 4 === 0 ? 'image' : null,
        created_at: nowIso(-(j * 6 + (conversation.id.length % 12))),
        deleted_at: null,
      })
    }
  }
  return messages
}

const createReports = (profiles, conversations, count = 180) => {
  return Array.from({ length: count }, (_, i) => {
    const reporter = profiles[i % profiles.length]
    const conversation = conversations[(i * 3) % conversations.length]
    return {
      id: `report_${i + 1}`,
      reporter_id: reporter.id,
      reported_id: conversation.merchant_id,
      conversation_id: conversation.id,
      reason: pick(['spam', 'harassment', 'fraud', 'fake_sale', 'scam', 'offensive_content']),
      details: `بلاغ وهمي رقم ${i + 1} لاختبار قائمة البلاغات وتحديد حالات الاستجابة.`,
      status: pick(['pending', 'reviewing', 'resolved', 'dismissed']),
      admin_note: i % 3 === 0 ? 'تمت المراجعة الأولية.' : null,
      created_at: nowIso(-(i * 12)),
    }
  })
}

const createAds = (merchants, count = 120) => {
  const types = ['banner', 'featured', 'boost', 'spotlight']
  const statuses = ['pending', 'active', 'paused', 'rejected']
  return Array.from({ length: count }, (_, i) => {
    const merchant = merchants[i % merchants.length]
    return {
      id: `ad_${i + 1}`,
      merchant_id: merchant.id,
      title: `إعلان وهمي ${i + 1}`,
      type: pick(types),
      status: pick(statuses),
      daily_budget: 15 + (i % 40) * 10,
      total_budget: 150 + (i % 20) * 50,
      duration_days: 3 + (i % 9),
      target_city: pick(['الرياض', 'جدة', 'الدمام', 'المدينة', 'دبي']),
      created_at: nowIso(-(i * 18)),
      updated_at: nowIso(-(i % 14)),
      payment_status: i % 3 === 0 ? 'paid' : 'pending',
    }
  })
}

const createBlocks = (profiles, count = 200) => {
  return Array.from({ length: count }, (_, i) => {
    const user = profiles[i % profiles.length]
    const target = profiles[(i * 7 + 3) % profiles.length]
    return {
      id: `block_${i + 1}`,
      blocker_id: user.id,
      blocked_id: target.id,
      created_at: nowIso(-(i * 10)),
    }
  })
}

const createViolations = (profiles, count = 150) => {
  return Array.from({ length: count }, (_, i) => {
    const actor = profiles[i % profiles.length]
    return {
      id: `violation_${i + 1}`,
      user_id: actor.id,
      reason: pick(['spam', 'misleading_ad', 'duplicate_products', 'abuse', 'fraudulent_claim']),
      notes: `تجاوز وهمي ${i + 1} لاختبار التتبع والتصنيف.`,
      severity: pick(['low', 'medium', 'high']),
      status: pick(['open', 'reviewed', 'resolved']),
      created_at: nowIso(-(i * 13)),
    }
  })
}

const baseProfiles = createProfiles(500)
const products = createProducts(baseProfiles, 1800)
const stories = createStories(baseProfiles, products, 400)
const conversations = createChats(baseProfiles, 280)
const messages = createMessages(conversations, 16)
const reports = createReports(baseProfiles, conversations, 220)
const ads = createAds(baseProfiles, 120)
const blocks = createBlocks(baseProfiles, 250)
const violations = createViolations(baseProfiles, 180)

const stressBundle = {
  profiles: baseProfiles,
  products,
  stories,
  conversations,
  messages,
  reports,
  ads,
  blocks,
  violations,
  generated_at: new Date().toISOString(),
}

const perf = performance.now()

function runSyntheticLoad(bundle) {
  const start = performance.now()

  const merchantCount = bundle.profiles.filter((p) => p.role === 'merchant').length
  const customerCount = bundle.profiles.filter((p) => p.role === 'customer').length
  const activeAds = bundle.ads.filter((a) => a.status === 'active').length
  const openReports = bundle.reports.filter((r) => r.status === 'pending' || r.status === 'reviewing').length
  const blockedPairs = bundle.blocks.length
  const storyCount = bundle.stories.length

  const feed = bundle.products.slice(0, 120).map((product) => ({
    id: product.id,
    merchant: bundle.profiles.find((p) => p.id === product.merchant_id)?.store_name ?? 'مخزن',
    title: product.title,
    price: product.price,
    category: product.category,
    isActive: product.is_active,
  }))

  const chatsSummary = bundle.conversations.map((c) => ({
    id: c.id,
    unread: c.unread_count,
    merchant: bundle.profiles.find((p) => p.id === c.merchant_id)?.store_name ?? 'متجر',
    customer: bundle.profiles.find((p) => p.id === c.customer_id)?.full_name ?? 'عميل',
  }))

  const load = {
    merchantCount,
    customerCount,
    activeAds,
    openReports,
    blockedPairs,
    storyCount,
    productsCount: bundle.products.length,
    messagesCount: bundle.messages.length,
    feedPreview: feed.length,
    chatPreview: chatsSummary.length,
    avgProductPrice: (bundle.products.reduce((sum, p) => sum + p.price, 0) / bundle.products.length).toFixed(2),
  }

  const elapsed = performance.now() - start
  return { ...load, elapsedMs: Number(elapsed.toFixed(2)) }
}

const summary = runSyntheticLoad(stressBundle)

console.log('=== MOCK STRESS DATASET ===')
console.table({
  profiles: stressBundle.profiles.length,
  products: stressBundle.products.length,
  stories: stressBundle.stories.length,
  conversations: stressBundle.conversations.length,
  messages: stressBundle.messages.length,
  reports: stressBundle.reports.length,
  ads: stressBundle.ads.length,
  blocks: stressBundle.blocks.length,
  violations: stressBundle.violations.length,
})

console.log('=== SIMULATED LOAD SUMMARY ===')
console.table(summary)

console.log('=== NOTES ===')
console.log('هذه بيانات وهمية 100% — لا تمس قاعدة البيانات أو الملفات الداخلية.')
console.log('يمكنك استخدام هذا السكربت لاختبار حجم البيانات وتجميع التحميل على الواجهة أو أي قائمة/Feed.')
console.log(`total_script_ms: ${(performance.now() - perf).toFixed(2)}`)

export { stressBundle, runSyntheticLoad }
