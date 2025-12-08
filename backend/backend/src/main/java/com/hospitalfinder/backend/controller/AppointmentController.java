package com.hospitalfinder.backend.controller;

import com.hospitalfinder.backend.dto.AppointmentRequestDTO;
import com.hospitalfinder.backend.dto.AppointmentResponseDTO;
import com.hospitalfinder.backend.entity.Appointment;
import com.hospitalfinder.backend.entity.User;
import com.hospitalfinder.backend.entity.Clinic;
import com.hospitalfinder.backend.repository.AppointmentRepository;
import com.hospitalfinder.backend.repository.ClinicRepository;
import com.hospitalfinder.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Optional;

@RestController
@RequestMapping("/api/appointments")
public class AppointmentController {

    @Autowired
    private AppointmentRepository appointmentRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private ClinicRepository clinicRepository;

    @PostMapping
    public ResponseEntity<?> bookAppointment(@RequestBody AppointmentRequestDTO dto) {
        // Validate user
        Optional<User> userOpt = userRepository.findById(dto.getUserId());
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("User not found");
        }
        // Validate clinic
        Optional<Clinic> clinicOpt = clinicRepository.findById(dto.getClinicId());
        if (clinicOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("Clinic not found");
        }
        // Check duplicate
        LocalDateTime apptTime = LocalDateTime.parse(dto.getAppointmentTime());
        boolean exists = appointmentRepository.existsByUserIdAndClinicIdAndAppointmentTime(
                dto.getUserId(), dto.getClinicId(), apptTime);
        if (exists) {
            return ResponseEntity.badRequest().body("Appointment already exists for this user/clinic/time");
        }
        // Check booking in past
        LocalDateTime now = LocalDateTime.now();
        if (apptTime.isBefore(now)) {
            return ResponseEntity.badRequest().body("Cannot book/update appointment in the past");
        }

        // Create appointment
        Appointment appointment = new Appointment();
        appointment.setUser(userOpt.get());
        appointment.setClinic(clinicOpt.get());
        appointment.setAppointmentTime(apptTime);
        appointment.setStatus("BOOKED");
        appointment = appointmentRepository.save(appointment);

        return ResponseEntity.ok(new AppointmentResponseDTO(appointment));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getAppointmentsByUser(@PathVariable Long userId) {
        User user = userRepository.findById(userId).orElse(null);
        if(user == null)
            return ResponseEntity.ok("User not found");
        var appointments = appointmentRepository.findByUserId(userId);
        var responseList = appointments.stream()
                .map(AppointmentResponseDTO::new)
                .toList();
        return ResponseEntity.ok(responseList);
    }

    @GetMapping("/clinic/{clinicId}")
    public ResponseEntity<?> getAppointmentsByClinic(@PathVariable Long clinicId) {
        Clinic clinic = clinicRepository.findById(clinicId).orElse(null);
        if(clinic == null)
            return ResponseEntity.ok("Clinic not found");
        var appointments = appointmentRepository.findByClinicId(clinicId);
        var responseList = appointments.stream()
                .map(AppointmentResponseDTO::new)
                .toList();
        return ResponseEntity.ok(responseList);
    }


    @PutMapping("/{id}")
    public ResponseEntity<?> updateAppointment(@PathVariable Long id, @RequestBody AppointmentRequestDTO dto) {
        Optional<Appointment> appointmentOpt = appointmentRepository.findById(id);
        if (appointmentOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Appointment appointment = appointmentOpt.get();

        // Update fields
        if (dto.getAppointmentTime() != null) {
            appointment.setAppointmentTime(LocalDateTime.parse(dto.getAppointmentTime()));
        }
        if (dto.getClinicId() != null) {
            Optional<Clinic> clinicOpt = clinicRepository.findById(dto.getClinicId());
            if (clinicOpt.isEmpty()) {
                return ResponseEntity.badRequest().body("Clinic not found");
            }
            appointment.setClinic(clinicOpt.get());
        }
        if (dto.getUserId() != null) {
            Optional<User> userOpt = userRepository.findById(dto.getUserId());
            if (userOpt.isEmpty()) {
                return ResponseEntity.badRequest().body("User not found");
            }
            appointment.setUser(userOpt.get());
        }
        LocalDateTime apptTime = LocalDateTime.parse(dto.getAppointmentTime());
        LocalDateTime now = LocalDateTime.now();
        if (apptTime.isBefore(now)) {
            return ResponseEntity.badRequest().body("Cannot book/update appointment in the past");
        }

        appointment = appointmentRepository.save(appointment);
        return ResponseEntity.ok(new AppointmentResponseDTO(appointment));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteAppointment(@PathVariable Long id) {
        if (!appointmentRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        appointmentRepository.deleteById(id);
        return ResponseEntity.ok("Appointment deleted successfully");
    }
}
