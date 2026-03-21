package com.bugboard26.controller;

import com.bugboard26.dto.AssignRequest;
import com.bugboard26.dto.BugCreateRequest;
import com.bugboard26.dto.BugPatchRequest;
import com.bugboard26.dto.LabelSetRequest;
import com.bugboard26.dto.UserWorkloadDTO;
import com.bugboard26.model.BugAttachment;
import com.bugboard26.model.Bug;
import com.bugboard26.model.Comment;
import com.bugboard26.model.History;
import com.bugboard26.service.BugService;
import jakarta.validation.Valid;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/bugs")
public class BugController {

    private final BugService bugService;

    public BugController(BugService bugService) {
        this.bugService = bugService;
    }

    @GetMapping
    public ResponseEntity<Page<Bug>> list(
        @RequestParam(required = false) com.bugboard26.model.BugType type,
        @RequestParam(required = false) com.bugboard26.model.BugStatus status,
        @RequestParam(required = false) com.bugboard26.model.Priority priority,
        @RequestParam(required = false) String label,
        @RequestParam(required = false) String q,
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(defaultValue = "createdAt") String sort,
        @RequestParam(defaultValue = "desc") String dir
    ) {
        Page<Bug> bugs = bugService.list(type, status, priority, label, q, page, size, sort, dir);
        return ResponseEntity.ok(bugs);
    }

    @PostMapping
    public ResponseEntity<Bug> create(@Valid @RequestBody BugCreateRequest request, Authentication auth) {
        UUID userId = getCurrentUserId(auth);
        Bug bug = bugService.create(request, userId);
        return ResponseEntity.ok(bug);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Bug> get(@PathVariable UUID id) {
        Bug bug = bugService.get(id);
        return ResponseEntity.ok(bug);
    }

    @PatchMapping("/{id}")
    public ResponseEntity<Bug> patch(
        @PathVariable UUID id,
        @Valid @RequestBody BugPatchRequest request,
        Authentication auth
    ) {
        UUID userId = getCurrentUserId(auth);
        boolean isAdmin = isCurrentUserAdmin(auth);
        Bug bug = bugService.patch(id, request, userId, isAdmin);
        return ResponseEntity.ok(bug);
    }

    @GetMapping("/{id}/comments")
    public ResponseEntity<List<Comment>> getComments(@PathVariable UUID id) {
        List<Comment> comments = bugService.getComments(id);
        return ResponseEntity.ok(comments);
    }

    @PostMapping("/{id}/comments")
    public ResponseEntity<Comment> addComment(
        @PathVariable UUID id,
        @RequestBody String text,
        Authentication auth
    ) {
        UUID userId = getCurrentUserId(auth);
        Comment comment = bugService.addComment(id, userId, text);
        return ResponseEntity.ok(comment);
    }

    @PostMapping("/{id}/labels")
    public ResponseEntity<Void> setLabels(
        @PathVariable UUID id,
        @Valid @RequestBody LabelSetRequest request,
        Authentication auth
    ) {
        UUID userId = getCurrentUserId(auth);
        boolean isAdmin = isCurrentUserAdmin(auth);
        bugService.setLabels(id, request, userId, isAdmin);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}/history")
    public ResponseEntity<List<History>> getHistory(@PathVariable UUID id) {
        List<History> history = bugService.getHistory(id);
        return ResponseEntity.ok(history);
    }

    @GetMapping("/workload")
    public ResponseEntity<List<UserWorkloadDTO>> getWorkload() {
        List<UserWorkloadDTO> workloads = bugService.getUserWorkloads();
        return ResponseEntity.ok(workloads);
    }

    @PostMapping("/{id}/assign")
    public ResponseEntity<Void> assign(
        @PathVariable UUID id,
        @Valid @RequestBody AssignRequest request,
        Authentication auth
    ) {
        UUID userId = getCurrentUserId(auth);
        bugService.assign(id, request, userId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/archive")
    public ResponseEntity<Void> archive(@PathVariable UUID id, Authentication auth) {
        String email = auth.getName();
        bugService.archive(id, email);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/duplicate-of/{masterId}")
    public ResponseEntity<Void> duplicateOf(
        @PathVariable UUID id,
        @PathVariable UUID masterId,
        Authentication auth
    ) {
        String email = auth.getName();
        bugService.duplicateOf(id, masterId, email);
        return ResponseEntity.ok().build();
    }

    @PostMapping(value = "/{id}/attachments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<String> uploadAttachment(
        @PathVariable UUID id,
        @RequestParam("file") MultipartFile file,
        Authentication auth
    ) {
        // Validate file type
        String contentType = file.getContentType();
        if (contentType == null || !isValidImageType(contentType)) {
            throw new IllegalArgumentException("Unsupported image type: " + contentType +
                ". Supported formats are jpeg, png, gif, or webp.");
        }

        // Validate file size (max 5MB)
        if (file.getSize() > 5 * 1024 * 1024) {
            throw new IllegalArgumentException("File size exceeds maximum limit of 5MB");
        }

        UUID userId = getCurrentUserId(auth);
        String filename = bugService.uploadAttachment(id, file, userId);

        return ResponseEntity.ok(filename);
    }

    @GetMapping("/{id}/attachments/{filename}")
    public ResponseEntity<Resource> getAttachment(
        @PathVariable UUID id,
        @PathVariable String filename
    ) {
        BugAttachment attachment = bugService.getAttachment(id, filename);
        Resource resource = bugService.loadAttachmentResource(id, filename);

        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(attachment.getContentType()))
            .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + attachment.getOriginalFilename() + "\"")
            .body(resource);
    }

    private boolean isValidImageType(String contentType) {
        return contentType.equals("image/jpeg") ||
               contentType.equals("image/png") ||
               contentType.equals("image/gif") ||
               contentType.equals("image/webp");
    }

    private UUID getCurrentUserId(Authentication auth) {
        return UUID.fromString((String) auth.getDetails());
    }

    private boolean isCurrentUserAdmin(Authentication auth) {
        return auth.getAuthorities().stream()
            .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }
}
