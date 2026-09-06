<?php

namespace App\Services;

class WhatsAppNotificationService
{
    public static function formatPhoneNumber(?string $phone): string
    {
        if (! $phone) {
            return '';
        }

        // Clean non-numeric characters
        $cleaned = preg_replace('/[^0-9]/', '', $phone);

        if (empty($cleaned)) {
            return '';
        }

        // Convert leading 0 to 62 (Indonesia)
        if (str_starts_with($cleaned, '0')) {
            return '62'.substr($cleaned, 1);
        }

        return $cleaned;
    }

    public static function generateUrl(?string $phone, string $message): ?string
    {
        $formattedPhone = self::formatPhoneNumber($phone);
        if (empty($formattedPhone)) {
            return null;
        }

        return 'https://wa.me/'.$formattedPhone.'?text='.rawurlencode($message);
    }

    public static function reportAcceptedMessage(string $contactName, string $publicId, float $estimateKg): string
    {
        return "Halo {$contactName},\n\nLaporan sisa sayuran Anda (ID: {$publicId}) sebesar {$estimateKg} kg telah DITERIMA oleh SayCle.\n\nKurir kami akan segera dijadwalkan untuk penjemputan. Terima kasih telah mendukung pengelolaan sirkular sisa sayur!";
    }

    public static function driverEnRouteMessage(string $contactName, string $publicId, string $driverName, string $vehicleName, ?string $address): string
    {
        $addressText = $address ? " (Lokasi: {$address})" : '';
        return "Halo {$contactName},\n\nKurir SayCle ({$driverName} - armada {$vehicleName}) sedang DALAM PERJALANAN menuju lokasi Anda{$addressText} untuk penjemputan/pengiriman (ID: {$publicId}).\n\nMohon persiapkan lokasi. Terima kasih!";
    }
}
