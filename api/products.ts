export default async function handler(req: any, res: any) {
    // CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        // 1. KULLANICI TOKEN'INI AL (Admin Key YOK!)
        const userToken = req.headers.authorization;

        if (!userToken) {
            console.error("❌ Token yok.");
            return res.status(401).json({ error: 'Token eksik. Whop üzerinden açın.' });
        }

        // 2. PASS-THROUGH (KÖPRÜ)
        // Token'ı direkt Whop'a iletiyoruz. 
        // Whop API, bu token kime aitse SADECE onun verisini döner. Filtreye gerek kalmaz.
        const response = await fetch('https://api.whop.com/api/v5/company/products', {
            method: 'GET',
            headers: {
                'Authorization': userToken,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 401) return res.status(401).json({ error: 'Token geçersiz.' });
            const errorText = await response.text();
            return res.status(response.status).json({ error: `Whop API Hatası`, details: errorText });
        }

        const data = await response.json();
        return res.status(200).json(data);

    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
}
