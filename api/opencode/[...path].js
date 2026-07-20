export default async function handler(req, res) {
  try {
    const urlPath = Array.isArray(req.query.path) ? req.query.path.join('/') : (req.query.path || '');
    const targetUrl = `https://opencode.ai/${urlPath}`;
    
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Cookie': 'ext_name=98B976E3G5; auth=Fe26.2**5c4e58cbb87e1a05432606c6475c01df150b6529c2c899685d144470b3472fb5*UiO8lkkP_TsACQVY2JEh0g*6A6vZGC-H3VZXyKewl6n9qY0e43bkEg3ts8HRrWpaOQfrCIyCYq4emxTfO7haUxNE_heiQy5mCuTcx2V4UhgeLgyLisGtuXK5vnzatMVC7O26ce_II1GCdFkt7wqmlE9XOPp8IhAF55fXSeyfjl4L2kBmUlzc6NncNpTsSz_cf1YOyG_Xpn_FJTxRLCM-XNKMYrl5qYL8WwAYVkK3hzBWXRCw4SrkKPKhh7gVA04DV0MzV8UieKT_Zt59bHrHTsDDTakC_BsmTxKPnElxZmRelpYnLbWEWpiFulj4YaFfkiAHHEau5HQZcnkoAbtM2zjB6HSSQLh0-Oa4NMEZ0qnbQ*1815995064814*27a8f7f129c64a04949d1a4245c182ed4b514c288cc87a5b67609e3c9f6d2c55*pjeXaqM9_bQI3daohjmi60ukKlIhCwzqKE-nCK77mVY; desktop_promo_dismissed=1; oc_locale=en',
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Mobile/15E148 Safari/604.1',
        'Referer': 'https://accounts.google.com/',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    const text = await response.text();
    res.status(response.status).send(text);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
