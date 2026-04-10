package com.hospitalfinder.backend.service;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.fasterxml.jackson.databind.JsonNode;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ReviewProofStorageService {

    private static final long MAX_FILE_SIZE_BYTES = 5L * 1024 * 1024;
    private static final int BASE64_CHUNK_SIZE = 7000;
    private static final DateTimeFormatter DATETIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final DataStoreService dataStoreService;

    @Getter
    @AllArgsConstructor
    public static class ProofUploadResult {
        private final Long proofId;
        private final String proofUrl;
    }

    @AllArgsConstructor
    private static class ParsedChunk {
        private final String token;
        private final int index;
        private final String payload;
    }

    public ProofUploadResult uploadProof(MultipartFile file, String proofType, Long reviewId, Long userId) throws IOException {
        String normalizedProofType = normalizeProofType(proofType);
        validateProofFile(file, normalizedProofType);

        String encoded = Base64.getEncoder().encodeToString(file.getBytes());
        String now = LocalDateTime.now().format(DATETIME_FORMATTER);

        String originalFilename = file.getOriginalFilename();
        String contentType = file.getContentType();

        String safeName = originalFilename == null || originalFilename.isBlank()
                ? "proof"
            : originalFilename;
        String safeType = contentType == null || contentType.isBlank()
                ? MediaType.APPLICATION_OCTET_STREAM_VALUE
            : contentType;

        Long firstProofId = null;
        int chunkCount = (encoded.length() + BASE64_CHUNK_SIZE - 1) / BASE64_CHUNK_SIZE;
        String uploadToken = UUID.randomUUID().toString().replace("-", "");
        for (int i = 0; i < chunkCount; i++) {
            int start = i * BASE64_CHUNK_SIZE;
            int end = Math.min(encoded.length(), start + BASE64_CHUNK_SIZE);
            String chunk = encoded.substring(start, end);

            Map<String, Object> values = new HashMap<>();
            values.put("review_id", reviewId);
            values.put("user_id", userId);
            values.put("proof_type", normalizedProofType);
            values.put("file_name", safeName);
            values.put("file_type", safeType);
            values.put("file_size", file.getSize());
            values.put("data", uploadToken + ":" + i + ":" + chunk);
            values.put("created_at", now);

            JsonNode inserted = dataStoreService.insertRecord("review_proofs", values);
            Long insertedId = extractId(inserted);
            if (firstProofId == null) {
                firstProofId = insertedId;
            }
        }

        Long proofId = firstProofId;
        if (proofId == null) {
            throw new IOException("Proof uploaded but could not resolve proof ID");
        }
        return new ProofUploadResult(proofId, "/api/reviews/proof/" + proofId);
    }

    public byte[] getProofData(Long proofId) {
        JsonNode row = resolveProofRow(proofId);
        String encodedData = resolveEncodedData(row);
        if (encodedData == null || encodedData.isBlank()) {
            return null;
        }
        return Base64.getDecoder().decode(encodedData);
    }

    public String getProofMimeType(Long proofId) {
        JsonNode row = resolveProofRow(proofId);
        JsonNode mimeNode = getField(row, "file_type", "FILE_TYPE", "fileType");
        if (mimeNode == null || mimeNode.isNull() || mimeNode.asText().isBlank()) {
            return MediaType.APPLICATION_OCTET_STREAM_VALUE;
        }
        return mimeNode.asText();
    }

    private JsonNode resolveProofRow(Long proofId) {
        JsonNode direct = dataStoreService.findById("review_proofs", proofId);
        JsonNode normalized = normalizeProofRow(direct);
        if (normalized != null) {
            return normalized;
        }

        JsonNode queryResult = dataStoreService.executeQuery("SELECT * FROM review_proofs WHERE ROWID = '" + proofId + "'");
        return normalizeProofRow(queryResult);
    }

    private JsonNode normalizeProofRow(JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }

        if (node.isArray()) {
            if (node.isEmpty()) {
                return null;
            }
            JsonNode first = node.get(0);
            if (first != null && first.has("review_proofs")) {
                return first.get("review_proofs");
            }
            return first;
        }

        if (node.has("review_proofs") && !node.get("review_proofs").isNull()) {
            JsonNode wrapped = node.get("review_proofs");
            if (wrapped.isArray()) {
                return wrapped.isEmpty() ? null : wrapped.get(0);
            }
            return wrapped;
        }

        return node;
    }

    private JsonNode getField(JsonNode row, String... fieldNames) {
        if (row == null || row.isNull()) {
            return null;
        }
        for (String name : fieldNames) {
            if (row.has(name) && !row.get(name).isNull()) {
                return row.get(name);
            }
        }
        return null;
    }

    private String resolveEncodedData(JsonNode row) {
        JsonNode encodedData = getField(row, "data", "DATA");
        String single = (encodedData == null || encodedData.isNull()) ? null : encodedData.asText();
        ParsedChunk firstChunk = parseChunkPayload(single);

        if (firstChunk == null) {
            return single;
        }

        String reviewId = getText(row, "review_id", "REVIEW_ID");
        String createdAt = getText(row, "created_at", "CREATED_AT");
        String fileName = getText(row, "file_name", "FILE_NAME");
        String fileType = getText(row, "file_type", "FILE_TYPE", "fileType");

        if (reviewId == null || createdAt == null || fileName == null) {
            return single;
        }

        String query = "SELECT * FROM review_proofs WHERE review_id = '" + escapeSql(reviewId)
                + "' AND created_at = '" + escapeSql(createdAt)
                + "' AND file_name = '" + escapeSql(fileName) + "'"
                + (fileType == null ? "" : " AND file_type = '" + escapeSql(fileType) + "'")
                + " ORDER BY ROWID ASC";

        JsonNode grouped = dataStoreService.executeQuery(query);
        if (grouped == null || !grouped.isArray() || grouped.isEmpty()) {
            return firstChunk.payload;
        }

        List<ParsedChunk> chunks = new ArrayList<>();
        for (JsonNode item : grouped) {
            JsonNode itemRow = item.has("review_proofs") ? item.get("review_proofs") : item;
            JsonNode chunkNode = getField(itemRow, "data", "DATA");
            if (chunkNode == null || chunkNode.isNull()) {
                continue;
            }
            ParsedChunk parsed = parseChunkPayload(chunkNode.asText());
            if (parsed != null && firstChunk.token.equals(parsed.token)) {
                chunks.add(parsed);
            }
        }

        if (chunks.isEmpty()) {
            return firstChunk.payload;
        }

        chunks.sort(Comparator.comparingInt(c -> c.index));
        StringBuilder builder = new StringBuilder();
        for (ParsedChunk chunk : chunks) {
            builder.append(chunk.payload);
        }

        return builder.toString();
    }

    private ParsedChunk parseChunkPayload(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        int firstColon = value.indexOf(':');
        if (firstColon <= 0) {
            return null;
        }
        int secondColon = value.indexOf(':', firstColon + 1);
        if (secondColon <= firstColon + 1 || secondColon >= value.length() - 1) {
            return null;
        }
        String token = value.substring(0, firstColon);
        String indexText = value.substring(firstColon + 1, secondColon);
        try {
            int index = Integer.parseInt(indexText);
            String payload = value.substring(secondColon + 1);
            return new ParsedChunk(token, index, payload);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private String getText(JsonNode row, String... fieldNames) {
        JsonNode field = getField(row, fieldNames);
        if (field == null || field.isNull()) {
            return null;
        }
        String value = field.asText();
        return value == null || value.isBlank() ? null : value;
    }

    private String escapeSql(String value) {
        return value == null ? "" : value.replace("'", "\\'");
    }

    public void validateProofFile(MultipartFile file, String proofType) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Proof file is required");
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new IllegalArgumentException("Proof file must be 5MB or smaller");
        }

        String fileContentType = file.getContentType();
        String contentType = fileContentType == null ? "" : fileContentType.toLowerCase();
        boolean allowedType = MediaType.IMAGE_JPEG_VALUE.equalsIgnoreCase(contentType)
                || MediaType.IMAGE_PNG_VALUE.equalsIgnoreCase(contentType)
                || MediaType.APPLICATION_PDF_VALUE.equalsIgnoreCase(contentType);
        if (!allowedType) {
            throw new IllegalArgumentException("Unsupported file type. Allowed: JPG, PNG, PDF");
        }

        String normalized = normalizeProofType(proofType);
        if (!("prescription".equals(normalized)
                || "opd slip".equals(normalized)
                || "lab report".equals(normalized)
                || "discharge summary".equals(normalized)
                || "consultation bill".equals(normalized)
                || "other".equals(normalized))) {
            throw new IllegalArgumentException("Invalid proof type");
        }
    }

    private String normalizeProofType(String proofType) {
        if (proofType == null || proofType.isBlank()) {
            return "other";
        }
        return proofType.trim().toLowerCase();
    }

    private Long extractId(JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }
        if (node.has("ROWID") && !node.get("ROWID").isNull()) {
            return node.get("ROWID").asLong();
        }
        if (node.has("id") && !node.get("id").isNull()) {
            return node.get("id").asLong();
        }
        return null;
    }
}
