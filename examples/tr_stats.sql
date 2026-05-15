-- Sales statistics query
-- creation date: 2024-01-15

-- Tüm bölgeler için aylık satış toplamlarını hesapla
SELECT
    b.bolge_adi,
    DATE_TRUNC('month', s.tarih) AS ay,   -- Satış ayı
    COUNT(*) AS siparis_sayisi,            -- Toplam sipariş adedi
    SUM(s.tutar) AS toplam_tutar,          -- Aylık toplam satış tutarı
    AVG(s.tutar) AS ortalama_tutar         -- Ortalama sipariş değeri
FROM siparisler s
-- Bölge bilgilerini birleştir
JOIN bolgeler b ON s.bolge_id = b.id
-- Yalnızca tamamlanan siparişleri dahil et
WHERE s.durum = 'tamamlandi'
    AND s.tarih >= '2024-01-01'
GROUP BY b.bolge_adi, DATE_TRUNC('month', s.tarih)
-- Tutara göre büyükten küçüğe sırala
ORDER BY toplam_tutar DESC;

-- Ürün bazlı performans özeti
SELECT
    u.urun_kodu,
    u.urun_adi,
    -- Toplam satış miktarı ve geliri
    SUM(si.miktar) AS satilan_adet,
    SUM(si.miktar * si.birim_fiyat) AS toplam_gelir
FROM urunler u
JOIN siparis_kalemleri si ON u.id = si.urun_id
-- Sadece aktif ürünleri göster
WHERE u.aktif = TRUE
GROUP BY u.urun_kodu, u.urun_adi
HAVING SUM(si.miktar) > 0
ORDER BY toplam_gelir DESC;
