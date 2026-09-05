<?php

/**
 * One-shot icon generator for the PWA manifest (Fase 9).
 * Renders the SayCle wordmark ("S.") in canvas-on-ink.
 * Run: php scripts/generate-pwa-icons.php
 */

$size = (int) ($argv[1] ?? 0);
if ($size < 16) {
    fwrite(STDERR, "Usage: php generate-pwa-icons.php <size>\n");
    exit(1);
}

$outFile = __DIR__."/../public/icons/pwa-{$size}x{$size}.png";
if (! is_dir(dirname($outFile))) {
    mkdir(dirname($outFile), 0755, true);
}

// Design tokens (DESIGN.md): ink + canvas.
$ink = [24, 53, 42];     // #18352a
$canvas = [244, 243, 237]; // #f4f3ed

$im = imagecreatetruecolor($size, $size);

// Solid ink background (no alpha flattening issues on resize).
$bg = imagecolorallocate($im, ...$ink);
imagefilledrectangle($im, 0, 0, $size, $size, $bg);

// Wordmark "S." sized relative to the canvas, vertically centered.
$text = 'S.';
$fontSize = (int) ($size * 0.52);
$canvasColor = imagecolorallocate($im, ...$canvas);

$bounds = imagettfbbox($fontSize, 0, 'C:\Windows\Fonts\arialbd.ttf', $text);
$textW = $bounds[2] - $bounds[0];
$textH = $bounds[1] - $bounds[7];
$x = (int) (($size - $textW) / 2 - $bounds[0]);
$y = (int) (($size - $textH) / 2 - $bounds[7]);

imagettftext($im, $fontSize, 0, $x, $y, $canvasColor, 'C:\Windows\Fonts\arialbd.ttf', $text);

imagepng($im, $outFile);
imagedestroy($im);

$bytes = filesize($outFile);
echo "OK {$outFile} ({$bytes} bytes)\n";
