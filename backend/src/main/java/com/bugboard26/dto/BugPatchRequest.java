package com.bugboard26.dto;

import com.bugboard26.model.BugStatus;
import com.bugboard26.model.BugType;
import com.bugboard26.model.Priority;
import java.time.LocalDateTime;
import java.util.UUID;

public record BugPatchRequest(
    String title,
    String description,
    BugType type,
    BugStatus status,
    Priority priority,
    Boolean archived,
    UUID duplicateOf,
    LocalDateTime deadline,
    UUID assigneeId
) {}
