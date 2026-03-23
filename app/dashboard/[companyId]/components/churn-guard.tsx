import { Button } from "@whop/react/components";

interface ChurnGuardProps {
  studentPulse: {
    total: number;
    inactiveCount: number;
    avgProgress: number;
  };
  companyId: string;
}

export function ChurnGuard({ studentPulse, companyId }: ChurnGuardProps) {
  const churnRisk = calculateChurnRisk(studentPulse);
  const interventionReady = studentPulse.inactiveCount > 0;
  
  const interventionStrategies = [
    {
      id: 'email_campaign',
      title: 'Otomatik Email Kampanyası',
      description: 'İlk dersi izlemeyen öğrencilere kişiselleştirilmiş hatırlatmalar',
      estimatedImpact: '25-40% dönüşüm',
      ready: interventionReady
    },
    {
      id: 'sms_reminders',
      title: 'SMS Bildirimleri',
      description: 'Acil hatırlatmalar için SMS yoluyla ulaşım',
      estimatedImpact: '15-25% dönüşüm',
      ready: interventionReady
    },
    {
      id: 'community_engagement',
      title: 'Topluluk Etkileşimi',
      description: 'Forum aktivitesi ile öğrenci motivasyonunu artırma',
      estimatedImpact: '20-35% dönüşüm',
      ready: true
    }
  ];

  function calculateChurnRisk(studentData: any) {
    const inactiveRate = studentData.total > 0 
      ? (studentData.inactiveCount / studentData.total) * 100 
      : 0;
    
    if (inactiveRate > 40 || studentData.avgProgress < 20) return 'high';
    if (inactiveRate > 20 || studentData.avgProgress < 40) return 'medium';
    return 'low';
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'text-red-600 bg-red-500/10 border-red-500/20';
      case 'medium': return 'text-orange-600 bg-orange-500/10 border-orange-500/20';
      case 'low': return 'text-green-600 bg-green-500/10 border-green-500/20';
      default: return 'text-gray-600 bg-gray-500/10 border-gray-500/20';
    }
  };

  const getRiskLabel = (risk: string) => {
    switch (risk) {
      case 'high': return 'Yüksek Risk';
      case 'medium': return 'Orta Risk';
      case 'low': return 'Düşük Risk';
      default: return 'Bilinmiyor';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-950 border border-gray-a4 rounded-[2rem] p-8">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold">
          CG
        </div>
        <h2 className="text-7 font-bold text-gray-12">Churn Guard - Öğrenci Tutma Sistemi</h2>
      </div>
      
      <div className="space-y-6">
        {/* Risk Assessment */}
        <div className="p-4 rounded-2xl border bg-gradient-to-r from-blue-500/5 to-purple-500/5 border-blue-500/20">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-12">Churn Risk Değerlendirmesi</h3>
              <p className="text-sm text-gray-10 mt-1">
                Dükkanınızın mevcut öğrenci tutma durumu
              </p>
            </div>
            <div className={`px-4 py-2 rounded-full font-bold border ${getRiskColor(churnRisk)}`}>
              {getRiskLabel(churnRisk)}
            </div>
          </div>
          
          {churnRisk === 'high' && (
            <div className="mt-4 p-4 bg-red-500/5 rounded-xl border border-red-500/10">
              <p className="text-sm text-red-700 dark:text-red-300">
                <span className="font-bold">Kritik Durum:</span> Yüksek churn riski tespit edildi. 
                Hemen müdahale stratejileri uygulanmalı.
              </p>
            </div>
          )}
        </div>

        {/* Intervention Strategies */}
        <div>
          <h3 className="font-bold text-gray-12 mb-4">Otomatik Müdahale Stratejileri</h3>
          <div className="space-y-3">
            {interventionStrategies.map((strategy) => (
              <div 
                key={strategy.id}
                className={`p-4 rounded-2xl border transition-all ${
                  strategy.ready 
                    ? 'border-gray-a3 hover:border-blue-500/50 bg-white dark:bg-gray-900' 
                    : 'border-gray-a4 bg-gray-50 dark:bg-gray-950 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-gray-12">{strategy.title}</h4>
                    <p className="text-sm text-gray-10 mt-1">{strategy.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-yellow-500">⚡</span>
                      <span className="text-xs text-gray-11">
                        Tahmini Etki: {strategy.estimatedImpact}
                      </span>
                    </div>
                  </div>
                  <div>
                    {strategy.ready ? (
                      <Button 
                        variant="classic" 
                        size="2"
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Aktif Et
                      </Button>
                    ) : (
                      <Button variant="ghost" size="2" disabled>
                        Hazır Değil
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="pt-4 border-t border-gray-a4">
          <div className="flex gap-3">
            <Button 
              variant="classic" 
              size="3" 
              className="flex-1 bg-green-600 hover:bg-green-700"
              disabled={!interventionReady}
            >
              Müdahaleyi Başlat
            </Button>
            <Button variant="ghost" size="3" className="flex-1">
              Detaylı Rapor
            </Button>
          </div>
          <p className="text-xs text-gray-10 text-center mt-3">
            {studentPulse.inactiveCount} öğrenci için otomatik müdahale başlatılabilir
          </p>
        </div>
      </div>
    </div>
  );
}