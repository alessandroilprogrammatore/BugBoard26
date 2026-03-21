package com.bugboard26.dto;

import com.bugboard26.model.BugStatus;
import com.bugboard26.model.BugType;
import com.bugboard26.model.Priority;
import java.time.LocalDateTime;
import java.util.List;
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
    List<String> labels,
    UUID assigneeId
) {}
