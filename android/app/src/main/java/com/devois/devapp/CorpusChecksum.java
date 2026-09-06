package com.devois.devapp;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InterruptedIOException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.function.LongConsumer;

final class CorpusChecksum {
    static String sha256(File file, LongConsumer onProgress) throws IOException, NoSuchAlgorithmException {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] buffer = new byte[64 * 1024];
        long totalBytes = file.length();
        long completedBytes = 0;
        long lastPercent = 0;

        try (FileInputStream input = new FileInputStream(file)) {
            int bytesRead;
            while ((bytesRead = input.read(buffer)) != -1) {
                if (Thread.currentThread().isInterrupted()) {
                    throw new InterruptedIOException("Corpus verification interrupted.");
                }
                digest.update(buffer, 0, bytesRead);
                completedBytes += bytesRead;
                long percent = totalBytes == 0 ? 100 : completedBytes * 100 / totalBytes;
                if (percent > lastPercent) {
                    lastPercent = percent;
                    onProgress.accept(completedBytes);
                }
            }
        }

        StringBuilder result = new StringBuilder(64);
        for (byte value : digest.digest()) {
            result.append(Character.forDigit((value & 0xff) >>> 4, 16));
            result.append(Character.forDigit(value & 0x0f, 16));
        }
        return result.toString();
    }
}