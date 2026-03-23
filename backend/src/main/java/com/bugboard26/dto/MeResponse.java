package com.bugboard26.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.bugboard26.model.Role;
import java.util.UUID;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record MeResponse(
    UUID id,
    String name,
    String email,
    Role role,
    String token
) {}
