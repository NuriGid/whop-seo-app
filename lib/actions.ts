import { getWhopClient } from "./whop-sdk";

export async function getCompanyExperiences(companyId: string) {
    const experiences = [];
    for await (const experience of getWhopClient()!.experiences.list({ company_id: companyId })) {
        experiences.push(experience);
    }
    return experiences;
}

export async function getExperienceForumPosts(experienceId: string) {
    const posts = [];
    for await (const post of getWhopClient()!.forumPosts.list({ experience_id: experienceId })) {
        posts.push(post);
    }
    return posts;
}

export async function getCourseStudents(companyId: string) {
    try {
        // Validate companyId
        if (!companyId) {
            console.error("Invalid companyId provided");
            return [];
        }
        
        const students = [];
        // @ts-ignore - The SDK might have slightly different names for courses/students
        for await (const student of getWhopClient()!.courses.students.list({ company_id: companyId })) {
            students.push(student);
        }
        return students;
    } catch (e) {
        console.error("Error fetching course students:", e);
        return [];
    }
}

export async function getPaymentsReport(companyId: string) {
    const openPayments = [];
    let potentialRevenue = 0;

    for await (const payment of getWhopClient()!.payments.list({
        company_id: companyId,
        statuses: ["open"] // Focus on open payments (potentially abandoned or awaiting action)
    })) {
        openPayments.push(payment);
        potentialRevenue += payment.amount_after_fees / 100; // Whop returns amounts in cents
    }

    return {
        count: openPayments.length,
        potentialRevenue: Math.round(potentialRevenue * 0.2), // 20% recovery estimate
        rawPotential: potentialRevenue
    };
}

export async function getStudentPulse(companyId: string) {
    const students = await getCourseStudents(companyId);
    const inactiveStudents = students.filter((s: any) => s.completed_lessons_count === 0);

    return {
        total: students.length,
        inactiveCount: inactiveStudents.length,
        avgProgress: students.length > 0
            ? Math.round(students.reduce((acc: number, s: any) => acc + (s.completion_rate || 0), 0) / students.length)
            : 0
    };
}

export async function generateDailyInsights(posts: any[], students: any, payments: any) {
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY) return "Hocam, AI anahtarı eksik olduğu için rapor hazırlayamıyorum.";

    const inactiveRate = students.total > 0 
        ? Math.round((students.inactiveCount / students.total) * 100) 
        : 0;
    
    const churnRisk = inactiveRate > 40 || students.avgProgress < 20 
        ? 'yüksek' 
        : inactiveRate > 20 || students.avgProgress < 40 
        ? 'orta' 
        : 'düşük';

    const context = `
  DÜKKAN DURUM RAPORU (CEO Dashboard Analizi)
  
  📊 TOPLULUK ANALİZİ:
  - ${posts.length} yeni forum aktivitesi
  - Öne çıkan tartışmalar: ${posts.slice(0, 2).map(p => p.title || "İsimsiz").join(", ")}
  
  👥 ÖĞRENCİ PERFORMANSI:
  - Toplam öğrenci: ${students.total}
  - Sessizleşen öğrenciler: ${students.inactiveCount} (%${inactiveRate})
  - Ortalama ilerleme: %${students.avgProgress}
  - Churn riski: ${churnRisk} seviye
  
  💰 SATIŞ & GELİR:
  - Bekleyen ödemeler: ${payments.count} adet
  - Potansiyel kurtarılacak gelir: $${payments.potentialRevenue}
  - Tahmini gerçek kurtarım: $${Math.round(payments.rawPotential * 0.25)}
  
  ⚠️ KRİTİK UYARILAR:
  ${inactiveRate > 30 ? '- Yüksek öğrenci kaybı riski tespit edildi' : ''}
  ${payments.count > 3 ? '- Ciddi gelir kaçırma riski var' : ''}
  ${students.avgProgress < 30 ? '- Düşük katılım oranları dikkat çekiyor' : ''}
  `;

    try {
        const response = await fetch("https://api.x.ai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "grok-beta",
                messages: [
                    {
                        role: "system",
                        content: "Sen profesyonel bir dükkan yöneticisisin. Whop dükkan sahiplerine (Hocam diye hitap ederek) günlük işletme raporu veriyorsun. Samimi, proaktif ve aksiyon odaklı olmalısın. Gelen verilere bakarak sadece 3 maddelik net, uygulanabilir aksiyon planı sun. Çok teknik terim kullanma, dükkanı nasıl büyütebileceğine odaklan. Her maddeyi emoji ile başlat ve net aksiyon çağrısı yap."
                    },
                    { 
                        role: "user", 
                        content: `Hocam, dükkanın son 24 saatlik performans raporu geldi. Lütfen sadece 3 maddelik acil aksiyon planı ver:
${context}` 
                    }
                ],
                temperature: 0.8,
                max_tokens: 500
            })
        });

        const data = await response.json();
        return data.choices?.[0]?.message?.content || "Hocam bugünlük bir rapor çıkaramadım, verileri kontrol edelim.";
    } catch (error) {
        console.error("AI Generation Error:", error);
        return "AI Raporu hazırlanırken bir hata oluştu Hocam. Manuel analiz: \n\n📊 Hemen şu adımları uygulayın:\n1️⃣ Sessizleşen öğrencilere kişisel mesaj atın\n2️⃣ Bekleyen ödemeler için otomatik hatırlatma başlatın\n3️⃣ Forumdaki yeni aktivitelere cevap verin";
    }
}
