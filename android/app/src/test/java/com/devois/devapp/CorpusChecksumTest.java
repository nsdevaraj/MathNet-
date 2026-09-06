package com.devois.devapp;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertThrows;
import static org.junit.Assert.assertTrue;

import java.io.File;
import java.io.IOException;
import java.io.InterruptedIOException;
import java.io.RandomAccessFile;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.List;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;

public class CorpusChecksumTest {
    @Rule
    public TemporaryFolder temporaryFolder = new TemporaryFolder();

    @Test
    public void hashesKnownInput() throws Exception {
        File file = temporaryFolder.newFile();
        Files.write(file.toPath(), "abc".getBytes(StandardCharsets.UTF_8));
        List<Long> progress = new ArrayList<>();

        assertEquals(
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
            CorpusChecksum.sha256(file, progress::add)
        );
        assertEquals(List.of(3L), progress);
    }

    @Test
    public void verifiesFullSizeCorpusWithBoundedMemoryAndProgress() throws Exception {
        File file = temporaryFolder.newFile();
        long totalBytes = 214_937_600;
        try (RandomAccessFile fixture = new RandomAccessFile(file, "rw")) {
            fixture.setLength(totalBytes);
        }
        List<Long> progress = new ArrayList<>();

        assertEquals(
            "6dfa8ed78e42683316135b9c5f6cd2411d16b08cb1ba508249a614e11747fdee",
            CorpusChecksum.sha256(file, progress::add)
        );
        assertTrue(progress.size() <= 100);
        assertEquals(totalBytes, progress.get(progress.size() - 1).longValue());
        long previous = 0;
        for (long completedBytes : progress) {
            assertTrue(completedBytes > previous);
            previous = completedBytes;
        }
    }

    @Test
    public void reportsMissingFiles() {
        File file = new File(temporaryFolder.getRoot(), "missing.sqlite3");
        assertThrows(IOException.class, () -> CorpusChecksum.sha256(file, completedBytes -> {}));
    }

    @Test
    public void stopsWhenWorkerIsInterrupted() throws Exception {
        File file = temporaryFolder.newFile();
        Files.write(file.toPath(), new byte[1]);
        Thread.currentThread().interrupt();
        try {
            assertThrows(InterruptedIOException.class, () -> CorpusChecksum.sha256(file, completedBytes -> {}));
        } finally {
            Thread.interrupted();
        }
    }
}