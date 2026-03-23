import { Button } from "@whop/react/components";
import { headers } from "next/headers";
import Link from "next/link";
import { whopsdk } from "@/lib/whop-sdk";
import {
	getCompanyExperiences,
	getExperienceForumPosts,
	getCourseStudents,
	getPaymentsReport,
	getStudentPulse,
	generateDailyInsights
} from "@/lib/actions";

export default async function DashboardPage({
	params,
}: {
	params: Promise<{ companyId: string }>;
}) {
	// Add comprehensive error boundary
	try {
        console.log("Dashboard Page rendering started for companyId:", (await params).companyId);
		const { companyId } = await params;
		
		// Validate required parameters
		if (!companyId) {
			return (
				<div className="flex items-center justify-center h-screen bg-gray-50">
					<div className="text-center p-8 bg-white rounded-2xl shadow-xl border border-red-100 max-w-md">
						<h1 className="text-2xl font-bold text-red-600 mb-2">Invalid Request</h1>
						<p className="text-gray-600">Company ID is required to access this dashboard.</p>
					</div>
				</div>
			);
		}
		
		// Add proper authentication error handling
		let userId: string;
		try {
			if (!whopsdk) {
				throw new Error("Whop SDK config is missing (Check Vercel env vars)");
			}
			const tokenResult = await whopsdk.verifyUserToken(await headers());
			userId = tokenResult.userId;
		} catch (error) {
			console.error("Authentication failed:", error);
			return (
				<div className="flex items-center justify-center h-screen bg-gray-50">
					<div className="text-center p-8 bg-white rounded-2xl shadow-xl border border-red-100 max-w-md">
						<h1 className="text-2xl font-bold text-red-600 mb-2">Authentication Required</h1>
						<p className="text-gray-600 mb-4">Please ensure you're accessing this from Whop dashboard</p>
						<div className="text-xs text-gray-500 bg-gray-100 p-3 rounded-lg">
							{error instanceof Error ? error.message : "Unknown authentication error"}
						</div>
					</div>
				</div>
			);
		}

	// 1. Fetch Core Data
	// 1. Fetch Core Data with Error Handling - SAFETY FIRST 🛡️
	let company, user, experiences, payments, studentPulse;
	try {
		[company, user, experiences, payments, studentPulse] = await Promise.all([
			whopsdk.companies.retrieve(companyId).catch(e => { console.error("Company fetch error:", e); return null; }),
			whopsdk.users.retrieve(userId).catch(e => { console.error("User fetch error:", e); return { name: "User", username: "unknown" }; }),
			getCompanyExperiences(companyId).catch(e => { console.error("Experiences fetch error:", e); return []; }),
			getPaymentsReport(companyId).catch(e => { console.error("Payments fetch error:", e); return { count: 0, potentialRevenue: 0 }; }),
			getStudentPulse(companyId).catch(e => { console.error("Student pulse fetch error:", e); return { total: 0, inactiveCount: 0, avgProgress: 0 }; }),
		]);
	} catch (error) {
		console.error("Critical Dashboard Load Error:", error);
		// Return a friendly error UI instead of a white screen
		return (
			<div className="flex flex-col items-center justify-center p-12 text-center h-screen bg-gray-50">
				<div className="bg-white p-8 rounded-2xl shadow-xl border border-red-100 max-w-lg">
					<div className="text-4xl mb-4">🌪️</div>
					<h1 className="text-xl font-bold text-red-600 mb-2">Veri Bağlantısında Sorun Var</h1>
					<p className="text-gray-600 mb-6">
						Hocam, dükkan verilerini çekerken bir engelle karşılaştım. 
						Bu genellikle <strong>Eksik API Anahtarı</strong> veya <strong>Yetkisiz Erişim</strong> kaynaklıdır.
					</p>
					<div className="bg-gray-100 p-4 rounded-lg text-left text-xs font-mono text-gray-700 overflow-auto max-h-40">
						{error instanceof Error ? error.message : JSON.stringify(error)}
					</div>
					<div className="mt-6 text-2 text-gray-400">
						Lütfen Vercel Environment Variables ayarlarını kontrol et.
					</div>
				</div>
			</div>
		);
	}

	if (!company) {
		return (
			<div className="flex flex-col items-center justify-center p-12 h-screen">
				<h1 className="text-2xl font-bold text-gray-800">Şirket Bulunamadı 🤷‍♂️</h1>
				<p className="text-gray-500 mt-2">ID: {companyId}</p>
				<p className="text-sm text-gray-400 mt-4">API Key'in bu şirket için yetkisi olduğundan emin misin?</p>
			</div>
		);
	}

	// 2. Fetch Engagement Signals (from the first experience for now)
	const firstExperience = experiences[0];
	const posts = firstExperience ? await getExperienceForumPosts(firstExperience.id) : [];

	// 3. Generate AI Insights (Mentoring Mode)
	const insights = await generateDailyInsights(posts, studentPulse, payments);

	const displayName = user.name || `@${user.username}`;

	return (
		<div className="flex flex-col p-8 gap-8 max-w-6xl mx-auto">
			{/* HEADER & STATUS BAR */}
			<div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-gray-a2 p-8 rounded-[2rem] border border-gray-a4 gap-4">
				<div>
					<h1 className="text-10 font-bold text-gray-12 tracking-tight">
						Whop Pilot <span className="text-gray-9 font-normal">/ Görev Kontrol</span>
					</h1>
					<p className="text-4 text-gray-10 mt-1">
						Hoş geldin Hocam, <strong>{displayName}</strong>. Dükkanın durumunu analiz ettim.
					</p>
				</div>
				<div className="flex gap-2">
					<div className="px-4 py-2 bg-green-500/10 text-green-600 rounded-full text-2 font-bold border border-green-500/20">
						● Canlı Analiz Aktif
					</div>
				</div>
			</div>

			{/* ACTIONABLE STATUS GRID */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-6">
				{/* AI MENTOR CARD */}
				<div className="md:col-span-3 bg-blue-600 p-1 rounded-[2rem] shadow-xl shadow-blue-500/10">
					<div className="bg-white dark:bg-gray-950 p-8 rounded-[1.9rem] h-full flex flex-col">
						<div className="flex items-center gap-3 mb-6">
							<div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold">
								AI
							</div>
							<h2 className="text-7 font-bold text-gray-12 tracking-tight">Hocam Durum Şöyle...</h2>
						</div>
						<div className="prose dark:prose-invert max-w-none text-gray-11 text-5 leading-relaxed whitespace-pre-wrap flex-grow">
							{insights}
						</div>
						<div className="mt-8 flex gap-3">
							<Button variant="classic" size="4" className="bg-blue-600 hover:bg-blue-700">Aksiyonu Başlat</Button>
							<Button variant="ghost" size="4">Kopyala</Button>
						</div>
					</div>
				</div>

				{/* REVENUE IMPACT CARD */}
				<div className="bg-emerald-600 text-white p-8 rounded-[2rem] flex flex-col justify-between shadow-xl shadow-emerald-500/10 relative overflow-hidden group">
					<div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />
					<div>
						<h3 className="text-4 font-bold opacity-80 uppercase tracking-widest mb-1">Kurtarılabilir Gelir</h3>
						<p className="text-11 font-black leading-none mt-2 text-emerald-50">
							${payments.potentialRevenue}
						</p>
						<p className="text-2 opacity-90 mt-4 leading-snug">
							{payments.count} açık/başarısız ödeme bulundu. AI destekli takip ile bu tutarı geri kazanabiliriz.
						</p>
					</div>
					<Button className="w-full bg-white text-emerald-600 hover:bg-emerald-50 mt-6 border-none font-bold" size="3">
						Takibi Başlat
					</Button>
				</div>
			</div>

			{/* SECONDARY DASHBOARD GRID */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				{/* STORE HEALTH */}
				<div className="bg-gray-a2 p-8 rounded-[2rem] border border-gray-a4">
					<h3 className="text-5 font-bold mb-6 text-gray-12">Dükkan Sağlığı</h3>
					<div className="space-y-6">
						<div>
							<div className="flex justify-between mb-2">
								<span className="text-3 text-gray-10 italic">Öğrenci İlerlemesi</span>
								<span className="text-3 font-bold text-gray-12">%{studentPulse.avgProgress}</span>
							</div>
							<div className="w-full bg-gray-a4 h-2 rounded-full overflow-hidden">
								<div className="bg-blue-600 h-full transition-all duration-1000" style={{ width: `${studentPulse.avgProgress}%` }} />
							</div>
						</div>
						<div className="pt-4 border-t border-gray-a4 grid grid-cols-2 gap-4">
							<div>
								<p className="text-2 text-gray-10">Toplam Öğrenci</p>
								<p className="text-6 font-bold text-gray-12">{studentPulse.total}</p>
							</div>
							<div>
								<p className="text-2 text-gray-10">Sessizleşenler</p>
								<p className="text-6 font-bold text-orange-500">{studentPulse.inactiveCount}</p>
							</div>
						</div>
					</div>
				</div>

				{/* COMMUNITY PULSE feed - REFINED */}
				<div className="md:col-span-2 bg-gray-a2 p-8 rounded-[2rem] border border-gray-a4">
					<div className="flex justify-between items-center mb-6">
						<h3 className="text-6 font-bold text-gray-12">Topluluk Nabzı</h3>
						<span className="text-2 px-3 py-1 bg-gray-a4 rounded-lg text-gray-10 font-bold">{posts.length} Post</span>
					</div>
					{posts.length > 0 ? (
						<div className="space-y-3">
							{posts.slice(0, 3).map((post: any) => (
								<div key={post.id} className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-a3 flex justify-between items-center group cursor-pointer hover:border-blue-500/50 transition-all">
									<div>
										<h4 className="font-bold text-gray-12 group-hover:text-blue-600 transition-colors">{post.title || "İsimsiz Post"}</h4>
										<p className="text-2 text-gray-9 mt-0.5">{post.user.name} • {post.comment_count} yorum</p>
									</div>
									<div className="opacity-0 group-hover:opacity-100 transition-opacity">
										<Button variant="ghost" size="2">Cevapla</Button>
									</div>
								</div>
							))}
						</div>
					) : (
						<div className="h-32 flex items-center justify-center border-2 border-dashed border-gray-a4 rounded-3xl">
							<p className="text-gray-9 italic">Henüz bir tartışma yok.</p>
						</div>
					)}
				</div>
			</div>

			{/* DEBUG SECTION */}
			<details className="mt-8 group">
				<summary className="text-2 text-gray-8 cursor-pointer opacity-30 group-hover:opacity-100 transition-opacity list-none text-center underline">
					Teknik Verileri Göster (Debug)
				</summary>
				<div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
					<JsonViewer data={studentPulse} label="Öğrenci Verisi" />
					<JsonViewer data={payments} label="Finansal Veri" />
				</div>
			</details>
		</div>
	);
	} catch (error) {
		console.error("Dashboard Page Error:", error);
		return (
			<div className="flex items-center justify-center h-screen bg-gray-50">
				<div className="text-center p-8 bg-white rounded-2xl shadow-xl border border-red-100 max-w-lg">
					<div className="text-4xl mb-4">🌪️</div>
					<h1 className="text-xl font-bold text-red-600 mb-2">Server Error Occurred</h1>
					<p className="text-gray-600 mb-6">
						An unexpected error occurred while loading your dashboard.
					</p>
					<div className="bg-gray-100 p-4 rounded-lg text-left text-xs font-mono text-gray-700 overflow-auto max-h-40">
						{error instanceof Error ? error.message : "Unknown server error"}
					</div>
					<div className="mt-6 text-sm text-gray-500">
						Please try refreshing the page or contact support.
					</div>
				</div>
			</div>
		);
	}
}

function JsonViewer({ data, label }: { data: any; label?: string }) {
	return (
		<div className="space-y-2">
			{label && <h4 className="text-2 font-bold text-gray-10">{label}</h4>}
			<pre className="text-2 border border-gray-a4 rounded-2xl p-6 bg-gray-a2 max-h-60 overflow-y-auto w-full transition-all">
				<code className="text-gray-11 font-mono leading-relaxed">{JSON.stringify(data, null, 2)}</code>
			</pre>
		</div>
	);
}
