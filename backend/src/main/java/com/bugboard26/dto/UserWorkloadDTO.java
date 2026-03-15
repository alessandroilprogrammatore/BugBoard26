package com.bugboard26.dto;

import com.bugboard26.model.Role;
import java.util.UUID;

public record UserWorkloadDTO(
    UUID id,
    String name,
    String email,
    Role role,
    long assignedCount
) {}
