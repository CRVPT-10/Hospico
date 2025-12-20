package com.hospitalfinder.backend.controller;

import com.hospitalfinder.backend.dto.ChatRequest;
import com.hospitalfinder.backend.entity.Clinic;
import com.hospitalfinder.backend.repository.ClinicRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.HttpClientErrorException;

import java.util.*;
import java.util.regex.*;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "http://localhost:5173") // Vite default port
public class ChatController {

    @Value("${groq.api.key:}")
    private String apiKey;

    @Autowired
    private ClinicRepository clinicRepository;

    private final RestTemplate restTemplate = new RestTemplate();

    // Pattern to detect "hospital near X" or "hospitals in X" queries
    private static final Pattern HOSPITAL_QUERY_PATTERN = Pattern.compile(
            "(?:hospitals?|clinics?)\\s+(?:near|in|at|around)\\s+(.+)",
            Pattern.CASE_INSENSITIVE);

    @jakarta.annotation.PostConstruct
    public void init() {
        if (apiKey == null || apiKey.isEmpty()) {
            System.err.println("CRITICAL: Groq API Key is NOT loaded!");
        } else {
            System.out.println("Groq API Key loaded successfully. Length: " + apiKey.length());
        }
    }

    @PostMapping("/chat")
    public ResponseEntity<?> chat(@RequestBody ChatRequest request) {
        // Get the latest user message
        List<ChatRequest.Message> messages = request.getMessages();
        if (messages != null && !messages.isEmpty()) {
            ChatRequest.Message lastMessage = messages.get(messages.size() - 1);
            String content = lastMessage.getContent();

            if (content != null) {
                // Check if it's a hospital search query
                Matcher matcher = HOSPITAL_QUERY_PATTERN.matcher(content.trim());
                if (matcher.find()) {
                    String placeName = matcher.group(1).trim();
                    System.out.println("Hospital search detected for place: " + placeName);

                    // Search for clinics by city
                    List<Clinic> clinics = clinicRepository.findByCityIgnoreCase(placeName);

                    if (clinics.isEmpty()) {
                        // Try a broader search - maybe the place name is partial
                        // For now, return not found message
                        Map<String, Object> response = new HashMap<>();
                        response.put("type", "text");
                        response.put("reply",
                                "Sorry, couldn't find any place or hospital with that name. Try searching for a different city.");
                        return ResponseEntity.ok(response);
                    }

                    // Build hospital cards response
                    List<Map<String, Object>> hospitalList = new ArrayList<>();
                    for (Clinic clinic : clinics) {
                        Map<String, Object> hospital = new HashMap<>();
                        hospital.put("id", clinic.getId());
                        hospital.put("name", clinic.getName());
                        hospital.put("imageUrl", clinic.getImageUrl() != null ? clinic.getImageUrl() : "");
                        hospital.put("city", clinic.getCity());
                        hospital.put("rating", clinic.getRating() != null ? clinic.getRating() : 0.0);
                        hospital.put("address", clinic.getAddress() != null ? clinic.getAddress() : "");
                        hospitalList.add(hospital);
                    }

                    Map<String, Object> response = new HashMap<>();
                    response.put("type", "hospitals");
                    response.put("hospitals", hospitalList);
                    response.put("reply", "Found " + clinics.size() + " hospital(s) in " + placeName + ":");
                    return ResponseEntity.ok(response);
                }
            }
        }

        // If not a hospital query, proceed with normal AI chat
        String url = "https://api.groq.com/openai/v1/chat/completions";

        System.out.println("Received chat request with "
                + (request.getMessages() != null ? request.getMessages().size() : 0) + " messages.");

        // 1. Prepare Headers
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(apiKey);
        headers.setContentType(MediaType.APPLICATION_JSON);

        // 2. Prepare System Message
        Map<String, String> systemMessage = new HashMap<>();
        systemMessage.put("role", "system");
        systemMessage.put("content",
                "You are a helpful healthcare assistant. Maintain conversational context. Provide general possible causes for symptoms. Limit responses to 4-6 lines. Do NOT diagnose. Always advise consulting a doctor. If user asks about hospitals near a place, tell them to use the format 'hospital near [city name]' for better results.");

        // 3. Combine Messages
        List<Object> allMessages = new ArrayList<>();
        allMessages.add(systemMessage);
        if (request.getMessages() != null) {
            allMessages.addAll(request.getMessages());
        }

        // 4. Request Body
        Map<String, Object> body = new HashMap<>();
        body.put("model", "llama-3.1-8b-instant");
        // body.put("model", "mixtral-8x7b-32768"); // Alternative model if needed
        body.put("messages", allMessages);
        body.put("temperature", 0.3);
        body.put("max_tokens", 150);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        try {
            // 5. Call Groq API
            System.out.println("Sending request to Groq API...");
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
            System.out.println("Groq Response Status: " + response.getStatusCode());

            Map<String, Object> responseBody = response.getBody();
            // System.out.println("Groq Response Body: " + responseBody); // Can be verbose

            // 6. Extract Content
            if (responseBody != null && responseBody.containsKey("choices")) {
                List choices = (List) responseBody.get("choices");
                if (!choices.isEmpty()) {
                    Map choice = (Map) choices.get(0);
                    Map message = (Map) choice.get("message");
                    String replyContent = (String) message.get("content");

                    Map<String, Object> result = new HashMap<>();
                    result.put("type", "text");
                    result.put("reply", replyContent);
                    return ResponseEntity.ok(result);
                }
            }
            Map<String, Object> emptyResult = new HashMap<>();
            emptyResult.put("type", "text");
            emptyResult.put("reply", "No response from AI (Empty choices)");
            return ResponseEntity.ok(emptyResult);

        } catch (HttpClientErrorException e) {
            System.err.println("Groq API Error: " + e.getResponseBodyAsString());
            return ResponseEntity.status(e.getStatusCode())
                    .body(Collections.singletonMap("error", "Groq API Error: " + e.getResponseBodyAsString()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500)
                    .body(Collections.singletonMap("error", "Internal Server Error: " + e.getMessage()));
        }
    }
}
