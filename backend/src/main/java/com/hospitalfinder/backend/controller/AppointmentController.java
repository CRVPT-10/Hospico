package com.hospitalfinder.backend.controller;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.hospitalfinder.backend.dto.AppointmentRequestDTO;
import com.hospitalfinder.backend.dto.AppointmentResponseDTO;
import com.hospitalfinder.backend.entity.Appointment;
import com.hospitalfinder.backend.entity.Clinic;
import com.hospitalfinder.backend.entity.User;
import com.hospitalfinder.backend.repository.AppointmentRepository;
import com.hospitalfinder.backend.repository.ClinicRepository;
import com.hospitalfinder.backend.repository.DoctorRepository;
import com.hospitalfinder.backend.repository.UserRepository;

@RestController
@RequestMapping("/api/appointments")
public class AppointmentController {

    @Autowired
    private AppointmentRepository appointmentRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private ClinicRepository clinicRepository;
    @Autowired
    private DoctorRepository doctorRepository;

    @PostMapping
    public ResponseEntity<?> bookAppointment(@RequestBody AppointmentRequestDTO dto) {

        // Validate User
        var userOpt = userRepository.findById(dto.getUserId());
        if (userOpt.isEmpty())
            return ResponseEntity.badRequest().body("User not found");

        // Validate Clinic
        var clinicOpt = clinicRepository.findById(dto.getClinicId());
        if (clinicOpt.isEmpty())
            return ResponseEntity.badRequest().body("Clinic not found");

        // Validate Doctor
        var doctorOpt = doctorRepository.findById(dto.getDoctorId());
        if (doctorOpt.isEmpty())
            return ResponseEntity.badRequest().body("Doctor not found");

        LocalDateTime time = LocalDateTime.parse(dto.getAppointmentTime());

        // Prevent past bookings
        if (time.isBefore(LocalDateTime.now()))
            return ResponseEntity.badRequest().body("Cannot book in the past");

        // Check duplicate for doctor
        boolean exists = appointmentRepository.existsByDoctorIdAndAppointmentTime(
                dto.getDoctorId(), time);

        if (exists)
            return ResponseEntity.badRequest().body("This time slot is already booked");

        // Create Appointment
        Appointment appointment = new Appointment();
        appointment.setUser(userOpt.get());
        appointment.setClinic(clinicOpt.get());
        appointment.setDoctor(doctorOpt.get());
        appointment.setAppointmentTime(time);
        appointment.setStatus("BOOKED");

        // Patient details
        appointment.setPatientName(dto.getPatientName());
        appointment.setPatientAge(dto.getPatientAge());
        appointment.setPatientGender(dto.getPatientGender());
        appointment.setPatientEmail(dto.getPatientEmail());
        appointment.setPatientPhone(dto.getPatientPhone());
        appointment.setReason(dto.getReason());

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

    @GetMapping("/doctor/{doctorId}/date/{date}")
    public ResponseEntity<?> getAppointmentsByDoctorAndDate(@PathVariable Long doctorId, @PathVariable String date) {
        try {
            System.out.println("Received request for doctorId: " + doctorId + ", date: " + date);
            LocalDate appointmentDate = LocalDate.parse(date);
            System.out.println("Parsed LocalDate: " + appointmentDate);
            List<Appointment> appointments = appointmentRepository.findByDoctorAndDate(doctorId, appointmentDate);
            System.out.println("Found " + appointments.size() + " appointments");
            // Filter only BOOKED appointments
            var bookedAppointments = appointments.stream()
                    .filter(apt -> "BOOKED".equalsIgnoreCase(apt.getStatus()))
                    .map(AppointmentResponseDTO::new)
                    .toList();
            System.out.println("Returning " + bookedAppointments.size() + " booked appointments");
            return ResponseEntity.ok(bookedAppointments);
        } catch (Exception e) {
            System.err.println("ERROR in getAppointmentsByDoctorAndDate: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().body("Invalid date format. Use YYYY-MM-DD. Error: " + e.getMessage());
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateAppointment(@PathVariable Long id, @RequestBody AppointmentRequestDTO dto) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Appointment not found"));

        // Update time
        if (dto.getAppointmentTime() != null) {
            LocalDateTime newTime = LocalDateTime.parse(dto.getAppointmentTime());

            if (newTime.isBefore(LocalDateTime.now()))
                return ResponseEntity.badRequest().body("Cannot update to a past time");

            // Prevent double booking
            if (appointmentRepository.existsByDoctorIdAndAppointmentTime(dto.getDoctorId(), newTime))
                return ResponseEntity.badRequest().body("Time slot already booked");

            appointment.setAppointmentTime(newTime);
        }

        // Update doctor
        if (dto.getDoctorId() != null) {
            var doc = doctorRepository.findById(dto.getDoctorId())
                    .orElseThrow(() -> new RuntimeException("Doctor not found"));
            appointment.setDoctor(doc);
        }

        // Update clinic
        if (dto.getClinicId() != null) {
            var clinic = clinicRepository.findById(dto.getClinicId())
                    .orElseThrow(() -> new RuntimeException("Clinic not found"));
            appointment.setClinic(clinic);
        }

        // Update user
        if (dto.getUserId() != null) {
            var user = userRepository.findById(dto.getUserId())
                    .orElseThrow(() -> new RuntimeException("User not found"));
            appointment.setUser(user);
        }

        // Update patient details
        appointment.setPatientName(dto.getPatientName());
        appointment.setPatientAge(dto.getPatientAge());
        appointment.setPatientGender(dto.getPatientGender());
        appointment.setPatientPhone(dto.getPatientPhone());
        appointment.setPatientEmail(dto.getPatientEmail());

        appointmentRepository.save(appointment);

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
