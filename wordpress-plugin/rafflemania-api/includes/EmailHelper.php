<?php
namespace RaffleMania;

class EmailHelper {
    const LOGO_URL = 'https://www.rafflemania.it/wp-content/uploads/2026/02/logo-scaled.png';

    /**
     * Wrap email content in HTML template with RaffleMania logo header
     */
    public static function wrap($body_html) {
        $year = date('Y');
        $logo = self::LOGO_URL;

        return "<!DOCTYPE html>
<html lang='it' xmlns='http://www.w3.org/1999/xhtml'>
<head>
<meta charset='UTF-8'>
<meta name='viewport' content='width=device-width, initial-scale=1.0'>
<meta http-equiv='X-UA-Compatible' content='IE=edge'>
<meta name='x-apple-disable-message-reformatting'>
<meta name='format-detection' content='telephone=no,address=no,email=no,date=no,url=no'>
<title>RaffleMania</title>
<!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
<style>body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}table,td{mso-table-lspace:0;mso-table-rspace:0}img{-ms-interpolation-mode:bicubic;border:0;height:auto;line-height:100%;outline:none;text-decoration:none}</style>
</head>
<body style='margin:0;padding:0;background-color:#f4f4f4;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;'>
<table role='presentation' cellspacing='0' cellpadding='0' border='0' width='100%' style='background-color:#f4f4f4;'>
<tr><td align='center' style='padding:20px 10px;'>
<table role='presentation' cellspacing='0' cellpadding='0' border='0' width='600' style='max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;'>
<tr><td align='center' style='padding:0;line-height:0;font-size:0;'>
<img src='{$logo}' alt='RaffleMania' width='600' height='auto' style='display:block;width:100%;max-width:600px;height:auto;border:0;outline:none;' />
</td></tr>
{$body_html}
<tr><td style='background-color:#fafafa;padding:20px 40px;text-align:center;border-top:1px solid #eee;'>
<p style='color:#aaa;font-size:13px;margin:0;'>&copy; {$year} RaffleMania. Tutti i diritti riservati.</p>
</td></tr>
</table></td></tr></table>
</body></html>";
    }

    /**
     * Get standard HTML email headers
     */
    public static function headers($reply_to = false) {
        $headers = [
            'Content-Type: text/html; charset=UTF-8',
            'From: RaffleMania <noreply@rafflemania.it>',
        ];
        if ($reply_to) {
            $headers[] = 'Reply-To: supporto@rafflemania.it';
        }
        return $headers;
    }

    /**
     * Send an HTML email with logo template
     */
    public static function send($to, $subject, $body_html, $reply_to = false) {
        $message = self::wrap($body_html);
        $headers = self::headers($reply_to);
        return wp_mail($to, $subject, $message, $headers);
    }
}
