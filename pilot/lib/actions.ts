import { whopsdk } from "./whop-sdk";

export async function getCompanyExperiences(companyId: string) {
    const experiences = [];
    for await (const experience of whopsdk.experiences.list({ company_id: companyId })) {
        experiences.push(experience);
    }
    return experiences;
}

export async function getExperienceForumPosts(experienceId: string) {
    const posts = [];
    for await (const post of whopsdk.forumPosts.list({ experience_id: experienceId })) {
        posts.push(post);
    }
    return posts;
}

export async function getCourseStudents(companyId: string) {
    try {
        const students = [];
        // @ts-ignore - The SDK might have slightly different names for courses/students
        for await (const student of whopsdk.courses.students.list({ company_id: companyId })) {
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

    for await (const payment of whopsdk.payments.list({
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

    const context = `
  - Topluluk: ${posts.length} yeni post/yorum var. Öne çıkanlar: ${posts.slice(0, 2).map(p => p.title).join(", ")}
  - Öğrenciler: Toplam ${students.total} öğrenci. ${students.inactiveCount} tanesi henüz hiç ders izlemedi.
  - Satış: Sepette kalan/açıkta bekleyen ${payments.count} ödeme var. Bunları kazanırsak ~$${payments.potentialRevenue} ciro artabilir.
  `;

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.1-8b-instant",
                messages: [
                    {
                        role: "system",
                        content: "Sen 'Whop Pilot' isimli bir asistansın. Whop dükkan sahiplerine (Hocam diye hitap ederek) günlük rapor veriyorsun. Samimi, proaktif ve aksiyon odaklı olmalısın. Gelen verilere bakarak 'Hocam durum şu...' diyerek 3 maddelik bir aksiyon planı sun. Çok teknik terim kullanma, dükkanı nasıl büyütebileceğine odaklan."
                    },
                    { role: "user", content: `Hocam dükkanın son verileri geldi, analiz eder misin?\n${context}` }
                ],
                temperature: 0.8,
            })
        });

        const data = await response.json();
        return data.choices?.[0]?.message?.content || "Hocam bugünlük bir rapor çıkaramadım, verileri kontrol edelim.";
    } catch (error) {
        console.error("AI Generation Error:", error);
        return "AI Raporu hazırlanırken bir hata oluştu Hocam.";
    }
}
