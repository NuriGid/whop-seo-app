import { Card, CardContent, CardHeader, CardTitle } from "@whop/react/components";
import { AlertTriangle, Users, TrendingDown, Clock } from "lucide-react";

interface RetentionAlertsProps {
  studentPulse: {
    total: number;
    inactiveCount: number;
    avgProgress: number;
  };
  payments: {
    count: number;
    potentialRevenue: number;
  };
}

export function RetentionAlerts({ studentPulse, payments }: RetentionAlertsProps) {
  const inactiveRate = studentPulse.total > 0 
    ? Math.round((studentPulse.inactiveCount / studentPulse.total) * 100) 
    : 0;
  
  const alerts = [
    {
      id: 'inactive_students',
      title: 'Sessizleşen Öğrenciler',
      description: `${studentPulse.inactiveCount} öğrenci henüz hiç ders izlemedi`,
      severity: inactiveRate > 30 ? 'high' : inactiveRate > 15 ? 'medium' : 'low',
      icon: Users,
      value: `${inactiveRate}%`,
      color: inactiveRate > 30 ? 'text-red-600' : inactiveRate > 15 ? 'text-orange-500' : 'text-green-600'
    },
    {
      id: 'abandoned_carts',
      title: 'Terk Edilmiş Sepetler',
      description: `${payments.count} açık ödeme bekliyor`,
      severity: payments.count > 5 ? 'high' : payments.count > 2 ? 'medium' : 'low',
      icon: Clock,
      value: `$${payments.potentialRevenue}`,
      color: payments.count > 5 ? 'text-red-600' : payments.count > 2 ? 'text-orange-500' : 'text-green-600'
    },
    {
      id: 'low_engagement',
      title: 'Düşük Katılım Oranı',
      description: `Ortalama ilerleme %${studentPulse.avgProgress}`,
      severity: studentPulse.avgProgress < 30 ? 'high' : studentPulse.avgProgress < 50 ? 'medium' : 'low',
      icon: TrendingDown,
      value: `${studentPulse.avgProgress}%`,
      color: studentPulse.avgProgress < 30 ? 'text-red-600' : studentPulse.avgProgress < 50 ? 'text-orange-500' : 'text-green-600'
    }
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-orange-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card className="bg-white dark:bg-gray-950 border border-gray-a4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-12">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          Retention Uyarıları
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {alerts.map((alert) => {
            const Icon = alert.icon;
            return (
              <div 
                key={alert.id} 
                className="p-4 rounded-2xl border border-gray-a3 hover:border-blue-500/50 transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-xl ${getSeverityColor(alert.severity)} bg-opacity-10`}>
                      <Icon className={`w-5 h-5 ${alert.color}`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-12">{alert.title}</h3>
                      <p className="text-sm text-gray-10 mt-1">{alert.description}</p>
                    </div>
                  </div>
                  <div className={`text-lg font-bold ${alert.color}`}>
                    {alert.value}
                  </div>
                </div>
                
                {alert.severity === 'high' && (
                  <div className="mt-3 p-3 bg-red-500/5 rounded-xl border border-red-500/10">
                    <p className="text-sm text-red-700 dark:text-red-300">
                      <span className="font-bold">Acil Eylem:</span> Bu durum dükkanınızın büyümesini ciddi şekilde etkileyebilir. Hemen müdahale etmeniz önerilir.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        <div className="mt-6 pt-4 border-t border-gray-a4">
          <div className="text-center">
            <p className="text-sm text-gray-10">
              Son 24 saat içindeki veriler analiz edildi
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}