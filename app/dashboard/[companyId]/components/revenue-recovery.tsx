import { Button } from "@whop/react/components";

interface RevenueRecoveryProps {
  payments: {
    count: number;
    potentialRevenue: number;
    rawPotential: number;
  };
  companyId: string;
}

export function RevenueRecovery({ payments, companyId }: RevenueRecoveryProps) {
  const recoveryRate = 0.25; // 25% estimated recovery rate
  const estimatedRecovered = Math.round(payments.rawPotential * recoveryRate);
  
  const recoveryStrategies = [
    {
      id: 'automated_emails',
      title: 'Otomatik Email Takibi',
      description: 'Ödeme tamamlamayan müşterilere kişiselleştirilmiş hatırlatmalar',
      successRate: '35-45%',
      timeframe: '24-48 saat',
      ready: payments.count > 0
    },
    {
      id: 'sms_reminders',
      title: 'SMS Hatırlatmalar',
      description: 'Acil durumlar için doğrudan SMS yoluyla ulaşım',
      successRate: '25-35%',
      timeframe: '1-2 saat',
      ready: payments.count > 0
    },
    {
      id: 'personal_outreach',
      title: 'Kişisel Ulaşım',
      description: 'Yüksek değerli müşteriler için doğrudan iletişim',
      successRate: '50-70%',
      timeframe: '1-3 gün',
      ready: payments.count > 0 && payments.potentialRevenue > 100
    }
  ];

  return (
    <div className="bg-white dark:bg-gray-950 border border-gray-a4 rounded-[2rem] p-8">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-bold">
          $
        </div>
        <h2 className="text-7 font-bold text-gray-12">Revenue Recovery - Gelir Kurtarma</h2>
      </div>
      
      <div className="space-y-6">
        {/* Revenue Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-500/5 p-6 rounded-2xl border border-blue-500/20">
            <p className="text-2 text-gray-10 uppercase tracking-wider mb-2">Bekleyen Ödemeler</p>
            <p className="text-8 font-black text-blue-600">{payments.count}</p>
          </div>
          
          <div className="bg-orange-500/5 p-6 rounded-2xl border border-orange-500/20">
            <p className="text-2 text-gray-10 uppercase tracking-wider mb-2">Potansiyel Gelir</p>
            <p className="text-8 font-black text-orange-600">${payments.rawPotential}</p>
          </div>
          
          <div className="bg-emerald-500/5 p-6 rounded-2xl border border-emerald-500/20">
            <p className="text-2 text-gray-10 uppercase tracking-wider mb-2">Tahmini Kurtarım</p>
            <p className="text-8 font-black text-emerald-600">${estimatedRecovered}</p>
          </div>
        </div>

        {/* Recovery Strategies */}
        <div>
          <h3 className="font-bold text-gray-12 mb-4">Kurtarma Stratejileri</h3>
          <div className="space-y-3">
            {recoveryStrategies.map((strategy) => (
              <div 
                key={strategy.id}
                className={`p-4 rounded-2xl border transition-all ${
                  strategy.ready 
                    ? 'border-gray-a3 hover:border-emerald-500/50 bg-white dark:bg-gray-900' 
                    : 'border-gray-a4 bg-gray-50 dark:bg-gray-950 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-12">{strategy.title}</h4>
                    <p className="text-sm text-gray-10 mt-1">{strategy.description}</p>
                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex items-center gap-1">
                        <span className="text-green-500">✓</span>
                        <span className="text-xs text-gray-11">
                          Başarı Oranı: {strategy.successRate}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-blue-500">⏱️</span>
                        <span className="text-xs text-gray-11">
                          Süre: {strategy.timeframe}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div>
                    {strategy.ready ? (
                      <Button 
                        variant="classic" 
                        size="2"
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        Başlat
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
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              disabled={payments.count === 0}
            >
              Otomatik Kurtarma Başlat
            </Button>
            <Button variant="ghost" size="3" className="flex-1">
              Detaylı Analiz
            </Button>
          </div>
          <p className="text-xs text-gray-10 text-center mt-3">
            Bu işlemle ~${estimatedRecovered} gelir kurtarabilirsiniz
          </p>
        </div>

        {/* Performance Metrics */}
        <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-2xl">
          <h3 className="font-bold text-gray-12 mb-4">Performans Metrikleri</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-10">Kurtarma Oranı</p>
              <p className="text-2xl font-bold text-emerald-600">25%</p>
            </div>
            <div>
              <p className="text-sm text-gray-10">Ortalama Süre</p>
              <p className="text-2xl font-bold text-blue-600">3.2 gün</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}