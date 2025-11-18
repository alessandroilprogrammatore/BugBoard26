package com.bugboard26.dto;

import com.bugboard26.model.BugType;
import com.bugboard26.model.Priority;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.util.List;

public record BugCreateRequest(
    @NotBlank String title,
    @NotBlank String description,
    @NotNull BugType type,
    Priority priority,
    LocalDateTime deadline,
    List<String> labels
) {}
