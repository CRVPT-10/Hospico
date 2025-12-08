package com.hospitalfinder.backend.dto;

import com.hospitalfinder.backend.entity.Appointment;
import lombok.*;

public class AppointmentResponseDTO {
    @Getter @Setter
    private Long id;
    @Getter @Setter
    private String clinicName;
    @Getter @Setter
    private String userName;
    @Getter @Setter
    private String appointmentTime;
    @Getter @Setter
    private String status;

    public AppointmentResponseDTO(Appointment appointment) {
        this.id = appointment.getId();
        this.clinicName = appointment.getClinic().getName();
        this.userName = appointment.getUser().getName();
        this.appointmentTime = appointment.getAppointmentTime().toString();
        this.status = appointment.getStatus();
    }

}
