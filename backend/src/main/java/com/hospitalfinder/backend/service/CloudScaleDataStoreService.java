package com.hospitalfinder.backend.service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.hospitalfinder.backend.config.CloudScaleConfig;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Implements DataStoreService using Zoho Catalyst Data Store REST API.
 * No Java SDK dependency — pure HTTP calls with RestTemplate.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CloudScaleDataStoreService implements DataStoreService {

    private final CloudScaleConfig config;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${zoho.environment:Development}")
    private String environment;

    // ── CRUD Operations ──────────────────────────────────────────

    @Override
    public JsonNode insertRecord(String tableName, Map<String, Object> data) {
        String url = config.getBaseUrl() + "/table/" + tableName + "/row";
        String jsonBody = null;
        try {
            // Zoho expects a JSON array of row objects: [{...}]
            jsonBody = objectMapper.writeValueAsString(java.util.List.of(data));
            log.debug("INSERT into '{}' url={} body={}", tableName, url, jsonBody);
            HttpEntity<String> request = new HttpEntity<>(jsonBody, authHeaders());
            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);
            log.info("Insert response status={}, body={}", response.getStatusCode(), response.getBody());
            JsonNode body = parseResponse(response);
            // Response is an array; return the first inserted row
            if (body != null && body.isArray() && body.size() > 0) {
                return body.get(0);
            }
            return body;
        } catch (org.springframework.web.client.HttpStatusCodeException e) {
            log.error("Failed to insert record into '{}'. Status: {} Response: {}", tableName,
                    e.getRawStatusCode(), e.getResponseBodyAsString());
            if (e.getRawStatusCode() == 401) {
                log.warn("Insert unauthorized for '{}'. Refreshing token and retrying once.", tableName);
                try {
                    if (jsonBody == null) {
                        throw new IllegalStateException("Insert request body was not initialized");
                    }
                    config.forceRefreshAccessToken();
                    HttpEntity<String> retryRequest = new HttpEntity<>(jsonBody, authHeaders());
                    ResponseEntity<String> retryResponse = restTemplate.postForEntity(url, retryRequest, String.class);
                    log.info("Insert retry response status={}, body={}", retryResponse.getStatusCode(),
                            retryResponse.getBody());
                    JsonNode retryBody = parseResponse(retryResponse);
                    if (retryBody != null && retryBody.isArray() && retryBody.size() > 0) {
                        return retryBody.get(0);
                    }
                    return retryBody;
                } catch (Exception retryEx) {
                    log.error("Insert retry failed for '{}': {}", tableName, retryEx.getMessage(), retryEx);
                }
            }
            throw new RuntimeException("Failed to insert record into " + tableName + ": " + e.getResponseBodyAsString(),
                    e);
        } catch (Exception e) {
            log.error("Failed to insert record into '{}': {}", tableName, e.getMessage());
            throw new RuntimeException("Failed to insert record into " + tableName, e);
        }
    }

    @Override
    public JsonNode updateRecord(String tableName, Long rowId, Map<String, Object> data) {
        String url = config.getBaseUrl() + "/table/" + tableName + "/row";
        String jsonBody = null;
        try {
            // Zoho expects a JSON array of objects for updates as well, containing ROWID
            Map<String, Object> updateData = new HashMap<>(data);
            updateData.put("ROWID", rowId);
            jsonBody = objectMapper.writeValueAsString(java.util.List.of(updateData));

            log.info("UPDATE '{}' rowId={} url={} body={}", tableName, rowId, url, jsonBody);
            HttpEntity<String> request = new HttpEntity<>(jsonBody, authHeaders());
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.PUT, request, String.class);
            log.info("Update response status={}, body={}", response.getStatusCode(), response.getBody());
            JsonNode body = parseResponse(response);

            // Response is usually an array
            if (body != null && body.isArray() && body.size() > 0) {
                return body.get(0);
            }
            return body;
        } catch (org.springframework.web.client.HttpStatusCodeException e) {
            log.error("Failed to update record in '{}', rowId={}. Status: {} Response: {}", tableName, rowId,
                    e.getRawStatusCode(), e.getResponseBodyAsString());
            if (e.getRawStatusCode() == 401) {
                log.warn("Update unauthorized for '{}'. Refreshing token and retrying once.", tableName);
                try {
                    if (jsonBody == null) {
                        throw new IllegalStateException("Update request body was not initialized");
                    }
                    config.forceRefreshAccessToken();
                    HttpEntity<String> retryRequest = new HttpEntity<>(jsonBody, authHeaders());
                    ResponseEntity<String> retryResponse = restTemplate.exchange(url, HttpMethod.PUT, retryRequest,
                            String.class);
                    log.info("Update retry response status={}, body={}", retryResponse.getStatusCode(),
                            retryResponse.getBody());
                    JsonNode retryBody = parseResponse(retryResponse);
                    if (retryBody != null && retryBody.isArray() && retryBody.size() > 0) {
                        return retryBody.get(0);
                    }
                    return retryBody;
                } catch (Exception retryEx) {
                    log.error("Update retry failed for '{}': {}", tableName, retryEx.getMessage(), retryEx);
                }
            }
            throw new RuntimeException("Failed to update record in " + tableName + ": " + e.getResponseBodyAsString(),
                    e);
        } catch (Exception e) {
            log.error("Error updating record in '{}', rowId={}", tableName, rowId, e);
            throw new RuntimeException("Failed to update record in " + tableName, e);
        }
    }

    @Override
    public void deleteRecord(String tableName, Long rowId) {
        String url = config.getBaseUrl() + "/table/" + tableName + "/row/" + rowId;
        try {
            HttpEntity<Void> request = new HttpEntity<>(authHeaders());
            restTemplate.exchange(url, HttpMethod.DELETE, request, String.class);
            log.debug("Deleted record from '{}', rowId={}", tableName, rowId);
        } catch (org.springframework.web.client.HttpStatusCodeException e) {
            log.error("Failed to delete record from '{}', rowId={}. Status: {} Response: {}",
                    tableName, rowId, e.getRawStatusCode(), e.getResponseBodyAsString());

            if (e.getRawStatusCode() == 401) {
                log.warn("Delete unauthorized for '{}'. Refreshing token and retrying once.", tableName);
                try {
                    config.forceRefreshAccessToken();
                    HttpEntity<Void> retryRequest = new HttpEntity<>(authHeaders());
                    restTemplate.exchange(url, HttpMethod.DELETE, retryRequest, String.class);
                    log.debug("Deleted record from '{}' on retry, rowId={}", tableName, rowId);
                    return;
                } catch (Exception retryEx) {
                    log.error("Delete retry failed for '{}', rowId={}: {}", tableName, rowId,
                            retryEx.getMessage(), retryEx);
                }
            }
            throw new RuntimeException("Failed to delete record from " + tableName + ": " + e.getResponseBodyAsString(),
                    e);
        } catch (Exception e) {
            log.error("Failed to delete record from '{}', rowId={}", tableName, rowId, e);
            throw new RuntimeException("Failed to delete record from " + tableName, e);
        }
    }

    @Override
    public JsonNode findById(String tableName, Long rowId) {
        String url = config.getBaseUrl() + "/table/" + tableName + "/row/" + rowId;
        try {
            HttpEntity<Void> request = new HttpEntity<>(authHeaders());
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, request, String.class);
            return parseResponse(response);
        } catch (Exception e) {
            log.error("Failed to find record in '{}', rowId={}", tableName, rowId, e);
            return null;
        }
    }

    @Override
    public JsonNode findByField(String tableName, String fieldName, String fieldValue) {
        // Use ZCQL for field-based lookup
        String zcql = "SELECT * FROM " + tableName + " WHERE " + fieldName + " = '" + escapeZcql(fieldValue) + "'";
        try {
            JsonNode results = executeZcql(zcql);
            if (results != null && results.isArray() && results.size() > 0) {
                JsonNode first = results.get(0);
                // ZCQL wraps rows like { "tableName": { ...fields... } }
                return first.has(tableName) ? first.get(tableName) : first;
            }
            return null;
        } catch (Exception e) {
            log.error("Failed to find record in '{}' where {}={}", tableName, fieldName, fieldValue, e);
            return null;
        }
    }

    // ── Query Execution ──────────────────────────────────────────

    @Override
    public JsonNode executeQuery(String query) {
        try {
            log.debug("Executing ZCQL: {}", query);
            String upperQuery = query.trim().toUpperCase();

            if (upperQuery.startsWith("SELECT")) {
                JsonNode results = executeZcql(query);
                return results != null ? results : objectMapper.createArrayNode();
            } else if (upperQuery.startsWith("DELETE")) {
                return handleDeleteQuery(query);
            } else {
                throw new RuntimeException("Unsupported query: " + query);
            }
        } catch (Exception e) {
            log.error("Failed to execute query: {}", query, e);
            throw new RuntimeException("Failed to execute query: " + query, e);
        }
    }

    // ── Internal Helpers ─────────────────────────────────────────

    /**
     * Execute a ZCQL query via the Zoho Data Store REST API.
     */
    private JsonNode executeZcql(String query) {
        String url = config.getBaseUrl() + "/query";
        try {
            String jsonBody = objectMapper.writeValueAsString(Collections.singletonMap("query", query));
            log.debug("ZCQL url={} body={}", url, jsonBody);
            HttpEntity<String> request = new HttpEntity<>(jsonBody, authHeaders());
            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);
            return parseResponse(response);
        } catch (Exception e) {
            log.error("ZCQL query failed: {} - {}", query, e.getMessage());
            throw new RuntimeException("ZCQL query failed: " + query, e);
        }
    }

    /**
     * Handle DELETE queries by first finding matching rows via ZCQL SELECT,
     * then deleting each row by ROWID.
     */
    private JsonNode handleDeleteQuery(String query) {
        // Convert "DELETE FROM table WHERE ..." to "SELECT * FROM table WHERE ..."
        String selectQuery = query.replaceFirst("(?i)DELETE\\s+FROM", "SELECT * FROM");
        String tableName = extractTableName(query);

        JsonNode rows = executeZcql(selectQuery);
        int deleted = 0;

        if (rows != null && rows.isArray()) {
            for (JsonNode row : rows) {
                JsonNode data = row.has(tableName) ? row.get(tableName) : row;
                Long rowId = extractRowId(data);
                if (rowId != null) {
                    deleteRecord(tableName, rowId);
                    deleted++;
                }
            }
        }

        log.debug("Deleted {} rows from '{}'", deleted, tableName);
        ObjectNode result = objectMapper.createObjectNode();
        result.put("deleted", deleted);
        return result;
    }

    private String extractTableName(String query) {
        String upper = query.toUpperCase();
        int fromIdx = upper.indexOf("FROM");
        if (fromIdx == -1)
            throw new RuntimeException("Cannot parse table name from: " + query);
        String afterFrom = query.substring(fromIdx + 4).trim();
        int endIdx = afterFrom.indexOf(' ');
        return endIdx == -1 ? afterFrom.trim() : afterFrom.substring(0, endIdx).trim();
    }

    private Long extractRowId(JsonNode data) {
        if (data.has("ROWID") && !data.get("ROWID").isNull()) {
            return data.get("ROWID").asLong();
        }
        if (data.has("_id") && !data.get("_id").isNull()) {
            return data.get("_id").asLong();
        }
        return null;
    }

    private HttpHeaders authHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Zoho-oauthtoken " + config.getAccessToken());
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Environment", environment);
        return headers;
    }

    private HttpHeaders authHeadersWithoutContentType() {
        HttpHeaders headers = authHeaders();
        headers.remove(HttpHeaders.CONTENT_TYPE);
        return headers;
    }

    private JsonNode parseResponse(ResponseEntity<String> response) {
        try {
            if (response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                // Zoho wraps results in a "data" field for some endpoints
                if (root.has("data")) {
                    return root.get("data");
                }
                return root;
            }
            return null;
        } catch (Exception e) {
            log.warn("Failed to parse response body: {}", response.getBody(), e);
            return null;
        }
    }

    private String escapeZcql(String value) {
        return value != null ? value.replace("'", "\\'") : "";
    }

    // ── File Store Operations ────────────────────────────────────

    /**
     * Store a file in Zoho File Store.
     * 
     * @param folder Folder name (e.g., "clinic-images")
     * @param fileName File name to store as
     * @param fileContent File bytes
     * @param contentType MIME type
     * @return JsonNode with file store response
     */
    public JsonNode storeFile(String folder, String fileName, byte[] fileContent, String contentType) {
        String url = config.getBaseUrl() + "/file";
        try {
            log.debug("Storing file to Zoho File Store: folder={}, fileName={}, size={} bytes", 
                    folder, fileName, fileContent.length);

            HttpHeaders headers = authHeadersWithoutContentType();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            org.springframework.http.client.MultipartBodyBuilder builder = new org.springframework.http.client.MultipartBodyBuilder();
            builder.part("file", new org.springframework.core.io.ByteArrayResource(fileContent) {
                @Override
                public String getFilename() {
                    return fileName;
                }
            });
            builder.part("folder", folder);

            HttpEntity<?> request = new HttpEntity<>(builder.build(), headers);
            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);

            log.info("File store response status={}, body={}", response.getStatusCode(), response.getBody());
            return parseResponse(response);
        } catch (Exception e) {
            log.error("Failed to store file in Zoho File Store: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to store file in Zoho File Store: " + e.getMessage(), e);
        }
    }

    /**
     * Retrieve a file from Zoho File Store.
     * 
     * @param folder Folder name
     * @param fileName File name to retrieve
     * @return File bytes
     */
    public byte[] retrieveFile(String folder, String fileName) {
        String url = config.getBaseUrl() + "/file?folder=" + folder + "&name=" + fileName;
        try {
            log.debug("Retrieving file from Zoho File Store: folder={}, fileName={}", folder, fileName);

            HttpEntity<Void> request = new HttpEntity<>(authHeadersWithoutContentType());
            ResponseEntity<byte[]> response = restTemplate.exchange(url, HttpMethod.GET, request, byte[].class);
            byte[] responseBody = response.getBody();

            if (response.getStatusCode().is2xxSuccessful() && responseBody != null) {
                log.debug("Retrieved file from Zoho File Store: size={} bytes", responseBody.length);
                return responseBody;
            }

            throw new RuntimeException("Failed to retrieve file: " + response.getStatusCode());
        } catch (Exception e) {
            log.error("Failed to retrieve file from Zoho File Store: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to retrieve file from Zoho File Store: " + e.getMessage(), e);
        }
    }

    /**
     * Delete a file from Zoho File Store.
     * 
     * @param folder Folder name
     * @param fileName File name to delete
     */
    public void deleteFile(String folder, String fileName) {
        String url = config.getBaseUrl() + "/file?folder=" + folder + "&name=" + fileName;
        try {
            log.debug("Deleting file from Zoho File Store: folder={}, fileName={}", folder, fileName);

            HttpEntity<Void> request = new HttpEntity<>(authHeadersWithoutContentType());
            restTemplate.exchange(url, HttpMethod.DELETE, request, Void.class);

            log.debug("Deleted file from Zoho File Store");
        } catch (Exception e) {
            log.error("Failed to delete file from Zoho File Store: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to delete file from Zoho File Store: " + e.getMessage(), e);
        }
    }

    // ── Stratus Object Storage Operations ───────────────────────

    /**
     * Store an object in Zoho Stratus bucket.
     */
    public void putStratusObject(String bucketName, String objectKey, byte[] content, String contentType) {
        String url = buildStratusObjectUrl(bucketName, objectKey);
        try {
            HttpHeaders headers = authHeadersWithoutContentType();
            headers.setContentType(contentType != null && !contentType.isBlank()
                    ? MediaType.parseMediaType(contentType)
                    : MediaType.APPLICATION_OCTET_STREAM);

            HttpEntity<byte[]> request = new HttpEntity<>(content, headers);
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.PUT, request, String.class);

            if (!response.getStatusCode().is2xxSuccessful()) {
                throw new RuntimeException("Unexpected status while storing Stratus object: " + response.getStatusCode());
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to store object in Stratus: " + e.getMessage(), e);
        }
    }

    /**
     * Retrieve an object from Zoho Stratus bucket.
     */
    public byte[] getStratusObject(String bucketName, String objectKey) {
        String url = buildStratusObjectUrl(bucketName, objectKey);
        try {
            HttpEntity<Void> request = new HttpEntity<>(authHeadersWithoutContentType());
            ResponseEntity<byte[]> response = restTemplate.exchange(url, HttpMethod.GET, request, byte[].class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return response.getBody();
            }
            throw new RuntimeException("Unexpected status while retrieving Stratus object: " + response.getStatusCode());
        } catch (Exception e) {
            throw new RuntimeException("Failed to retrieve object from Stratus: " + e.getMessage(), e);
        }
    }

    /**
     * Delete an object from Zoho Stratus bucket.
     */
    public void deleteStratusObject(String bucketName, String objectKey) {
        String url = buildStratusObjectUrl(bucketName, objectKey);
        try {
            HttpEntity<Void> request = new HttpEntity<>(authHeadersWithoutContentType());
            ResponseEntity<Void> response = restTemplate.exchange(url, HttpMethod.DELETE, request, Void.class);

            if (!response.getStatusCode().is2xxSuccessful()) {
                throw new RuntimeException("Unexpected status while deleting Stratus object: " + response.getStatusCode());
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to delete object from Stratus: " + e.getMessage(), e);
        }
    }

    private String buildStratusObjectUrl(String bucketName, String objectKey) {
        String safeBucket = bucketName == null ? "" : bucketName.trim();
        String safeKey = objectKey == null ? "" : objectKey.trim();
        String encodedKey = URLEncoder.encode(safeKey, StandardCharsets.UTF_8).replace("+", "%20");
        return config.getBaseUrl() + "/bucket/" + safeBucket + "/object/" + encodedKey;
    }
}
