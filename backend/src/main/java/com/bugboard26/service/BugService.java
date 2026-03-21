package com.bugboard26.service;

import com.bugboard26.dto.AssignRequest;
import com.bugboard26.dto.BugCreateRequest;
import com.bugboard26.dto.BugPatchRequest;
import com.bugboard26.dto.LabelSetRequest;
import com.bugboard26.dto.UserWorkloadDTO;
import com.bugboard26.model.*;
import com.bugboard26.repository.*;
import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class BugService {

    private static final String USER_NOT_FOUND_MESSAGE = "User not found";
    private static final String STATUS_FIELD = "status";

    private final BugRepository bugRepository;
    private final UserRepository userRepository;
    private final CommentRepository commentRepository;
    private final LabelRepository labelRepository;
    private final HistoryRepository historyRepository;
    private final NotificationService notificationService;
    private final Path attachmentsDir;

    public BugService(
        BugRepository bugRepository,
        UserRepository userRepository,
        CommentRepository commentRepository,
        LabelRepository labelRepository,
        HistoryRepository historyRepository,
        NotificationService notificationService,
        @Value("${app.attachments.dir:uploads}") String attachmentsDir
    ) {
        this.bugRepository = bugRepository;
        this.userRepository = userRepository;
        this.commentRepository = commentRepository;
        this.labelRepository = labelRepository;
        this.historyRepository = historyRepository;
        this.notificationService = notificationService;
        this.attachmentsDir = Paths.get(attachmentsDir).toAbsolutePath().normalize();
    }

    public Page<Bug> list(
        BugType type,
        BugStatus status,
        Priority priority,
        String label,
        String search,
        int page,
        int size,
        String sort,
        String direction
    ) {
        Specification<Bug> spec = BugSpecification.createSpecification(type, status, priority, label, search);

        Sort sortBy = Sort.by(Sort.Direction.fromString(direction), sort);
        Pageable pageable = PageRequest.of(page - 1, size, sortBy);

        return bugRepository.findAll(spec, pageable);
    }

    public Bug create(BugCreateRequest request, UUID userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new EntityNotFoundException(USER_NOT_FOUND_MESSAGE));

        Bug bug = new Bug(request.title(), request.description(), request.type(), user);
        bug.setPriority(request.priority());
        bug.setDeadline(request.deadline());

        if (request.labels() != null && !request.labels().isEmpty()) {
            Set<Label> labels = request.labels().stream()
                .map(this::findOrCreateLabel)
                .collect(Collectors.toSet());
            bug.setLabels(labels);
        }

        Bug savedBug = bugRepository.save(bug);

        // Create history entry
        History history = new History(savedBug, user, HistoryAction.CREATE);
        historyRepository.save(history);

        return savedBug;
    }

    public Bug get(UUID id) {
        return bugRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Bug not found"));
    }

    public Bug patch(UUID id, BugPatchRequest request, UUID userId, boolean isAdmin) {
        Bug bug = get(id);
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new EntityNotFoundException(USER_NOT_FOUND_MESSAGE));

        // Any bug field change requires admin privileges or being the current assignee.
        if (hasBugFieldChanges(request) && !isAdmin && !isCurrentAssignee(bug, userId)) {
            throw new SecurityException("Only assignee or admin can modify bugs");
        }

        // Apply changes
        if (request.title() != null) bug.setTitle(request.title());
        if (request.description() != null) bug.setDescription(request.description());
        if (request.type() != null) bug.setType(request.type());
        if (request.status() != null) bug.setStatus(request.status());
        if (request.priority() != null) bug.setPriority(request.priority());
        if (request.archived() != null) bug.setArchived(request.archived());
        if (request.deadline() != null) bug.setDeadline(request.deadline());

        if (request.duplicateOf() != null) {
            Bug duplicateOf = bugRepository.findById(request.duplicateOf())
                .orElseThrow(() -> new EntityNotFoundException("Master bug not found"));
            bug.setDuplicateOf(duplicateOf);
            bug.setArchived(true);
            bug.setStatus(BugStatus.ARCHIVED);
        }

        if (request.assigneeId() != null) {
            if (!isAdmin) {
                throw new SecurityException("Only admins can assign bugs");
            }
            User assignee = userRepository.findById(request.assigneeId())
                .orElseThrow(() -> new EntityNotFoundException("Assignee not found"));
            bug.setAssignee(assignee);
        }

        Bug savedBug = bugRepository.save(bug);

        // Create history entry
        String details = createPatchDetails(request);
        History history = new History(savedBug, user, HistoryAction.UPDATE, details);
        historyRepository.save(history);

        // Notify creator when bug is resolved
        if (request.status() == BugStatus.RESOLVED) {
            notificationService.notifyResolved(savedBug, user);
        }

        return savedBug;
    }

    public void assign(UUID bugId, AssignRequest request, UUID userId) {
        Bug bug = get(bugId);
        User admin = userRepository.findById(userId)
            .orElseThrow(() -> new EntityNotFoundException(USER_NOT_FOUND_MESSAGE));

        if (!admin.getRole().equals(Role.ADMIN)) {
            throw new SecurityException("Only admins can assign bugs");
        }

        User assignee = null;
        if (request.userId() != null) {
            assignee = userRepository.findById(request.userId())
                .orElseThrow(() -> new EntityNotFoundException("Assignee not found"));
        } else if (Boolean.TRUE.equals(request.suggest())) {
            assignee = suggestAssignee();
        }

        if (assignee != null) {
            bug.setAssignee(assignee);
            bugRepository.save(bug);

            // Create history entry
            History history = new History(bug, admin, HistoryAction.ASSIGN, assignee.getEmail());
            historyRepository.save(history);

            // Notify assignee
            notificationService.notifyAssignment(bug, admin, assignee);
        }
    }

    public void archive(UUID bugId, String whoEmail) {
        Bug bug = get(bugId);
        User who = userRepository.findByEmail(whoEmail)
            .orElseThrow(() -> new EntityNotFoundException(USER_NOT_FOUND_MESSAGE));

        if (!who.getRole().equals(Role.ADMIN)) {
            throw new SecurityException("Only admins can archive bugs");
        }

        bug.setArchived(true);
        bug.setStatus(BugStatus.ARCHIVED);
        bugRepository.save(bug);

        // Create history entry
        History history = new History(bug, who, HistoryAction.ARCHIVE);
        historyRepository.save(history);
    }

    public void duplicateOf(UUID bugId, UUID masterId, String whoEmail) {
        Bug bug = get(bugId);
        Bug masterBug = get(masterId);
        User who = userRepository.findByEmail(whoEmail)
            .orElseThrow(() -> new EntityNotFoundException(USER_NOT_FOUND_MESSAGE));

        if (!who.getRole().equals(Role.ADMIN)) {
            throw new SecurityException("Only admins can mark bugs as duplicates");
        }

        bug.setDuplicateOf(masterBug);
        bug.setArchived(true);
        bug.setStatus(BugStatus.ARCHIVED);
        bugRepository.save(bug);

        // Create history entry
        History history = new History(bug, who, HistoryAction.DUPLICATE);
        historyRepository.save(history);
    }

    public Comment addComment(UUID bugId, UUID authorId, String text) {
        Bug bug = get(bugId);
        User author = userRepository.findById(authorId)
            .orElseThrow(() -> new EntityNotFoundException("Author not found"));

        Comment comment = new Comment(text, bug, author);
        Comment savedComment = commentRepository.save(comment);

        // Create history entry
        History history = new History(bug, author, HistoryAction.COMMENT, text);
        historyRepository.save(history);

        return savedComment;
    }

    public void setLabels(UUID bugId, LabelSetRequest request, UUID whoId) {
        Bug bug = get(bugId);
        User who = userRepository.findById(whoId)
            .orElseThrow(() -> new EntityNotFoundException(USER_NOT_FOUND_MESSAGE));

        Set<Label> labels = request.labels().stream()
            .map(this::findOrCreateLabel)
            .collect(Collectors.toSet());

        bug.setLabels(labels);
        bugRepository.save(bug);

        // Create history entry
        History history = new History(bug, who, HistoryAction.LABELS_SET);
        historyRepository.save(history);
    }

    public List<Comment> getComments(UUID bugId) {
        return commentRepository.findByBugIdOrderByCreatedAtAsc(bugId);
    }

    public List<History> getHistory(UUID bugId) {
        return historyRepository.findByBugIdOrderByAtAsc(bugId);
    }

    private Label findOrCreateLabel(String name) {
        Optional<Label> existing = labelRepository.findByName(name);
        if (existing.isPresent()) {
            return existing.get();
        }

        Label label = new Label(name);
        return labelRepository.save(label);
    }

    private static final List<BugStatus> ACTIVE_STATUSES = List.of(BugStatus.TODO, BugStatus.IN_PROGRESS);

    /**
     * Returns workload data for all non-READONLY users, sorted by ascending
     * number of active (TODO + IN_PROGRESS) bugs assigned to each user.
     */
    public List<UserWorkloadDTO> getUserWorkloads() {
        List<User> users = userRepository.findAll();
        return users.stream()
            .filter(user -> !user.getRole().equals(Role.READONLY))
            .map(user -> new UserWorkloadDTO(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole(),
                bugRepository.countByAssigneeAndStatusIn(user, ACTIVE_STATUSES)
            ))
            .sorted(java.util.Comparator.comparingLong(UserWorkloadDTO::assignedCount))
            .toList();
    }

    private User suggestAssignee() {
        // Find non-READONLY user with fewest active bugs (TODO + IN_PROGRESS)
        List<User> users = userRepository.findAll();
        return users.stream()
            .filter(user -> !user.getRole().equals(Role.READONLY))
            .min(java.util.Comparator.comparingLong(user ->
                bugRepository.countByAssigneeAndStatusIn(user, ACTIVE_STATUSES)
            ))
            .orElse(null);
    }

    private String createPatchDetails(BugPatchRequest request) {
        List<String> changes = new ArrayList<>();
        if (request.title() != null) changes.add("title");
        if (request.description() != null) changes.add("description");
        if (request.type() != null) changes.add("type");
        if (request.status() != null) changes.add(STATUS_FIELD);
        if (request.priority() != null) changes.add("priority");
        if (request.archived() != null) changes.add("archived");
        if (request.duplicateOf() != null) changes.add("duplicateOf");
        if (request.deadline() != null) changes.add("deadline");
        if (request.assigneeId() != null) changes.add("assigneeId");
        return String.join(", ", changes);
    }

    private boolean hasBugFieldChanges(BugPatchRequest request) {
        return request.title() != null
            || request.description() != null
            || request.type() != null
            || request.status() != null
            || request.priority() != null
            || request.archived() != null
            || request.duplicateOf() != null
            || request.deadline() != null;
    }

    private boolean isCurrentAssignee(Bug bug, UUID userId) {
        return bug.getAssignee() != null && bug.getAssignee().getId().equals(userId);
    }

    public String uploadAttachment(UUID bugId, MultipartFile file, UUID userId) {
        Bug bug = get(bugId);
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new EntityNotFoundException(USER_NOT_FOUND_MESSAGE));

        try {
            Files.createDirectories(attachmentsDir);

            String originalFilename = sanitizeOriginalFilename(file.getOriginalFilename());
            String extension = extractExtension(originalFilename, file.getContentType());
            String filename = UUID.randomUUID() + extension;
            Path targetPath = attachmentsDir.resolve(filename).normalize();

            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

            BugAttachment attachment = new BugAttachment(
                filename,
                originalFilename,
                file.getContentType() == null ? "application/octet-stream" : file.getContentType(),
                file.getSize(),
                LocalDateTime.now()
            );
            bug.getAttachments().add(attachment);
            bugRepository.save(bug);

            // Create history entry for attachment upload
            History history = new History(bug, user, HistoryAction.ATTACHMENT_UPLOADED, filename);
            historyRepository.save(history);

            return filename;
        } catch (IOException e) {
            throw new RuntimeException("Failed to upload attachment", e);
        }
    }

    public BugAttachment getAttachment(UUID bugId, String storedFilename) {
        Bug bug = get(bugId);
        return bug.getAttachments().stream()
            .filter(attachment -> attachment.getStoredFilename().equals(storedFilename))
            .findFirst()
            .orElseThrow(() -> new EntityNotFoundException("Attachment not found"));
    }

    public Resource loadAttachmentResource(UUID bugId, String storedFilename) {
        getAttachment(bugId, storedFilename);
        Path filePath = attachmentsDir.resolve(storedFilename).normalize();
        if (!Files.exists(filePath)) {
            throw new EntityNotFoundException("Attachment file not found");
        }

        try {
            return new UrlResource(filePath.toUri());
        } catch (MalformedURLException e) {
            throw new RuntimeException("Failed to load attachment resource", e);
        }
    }

    private String sanitizeOriginalFilename(String originalFilename) {
        if (originalFilename == null || originalFilename.isBlank()) {
            return "attachment";
        }

        Path fileNamePath = Paths.get(originalFilename).getFileName();
        return fileNamePath == null ? "attachment" : fileNamePath.toString();
    }

    private String extractExtension(String originalFilename, String contentType) {
        int dotIndex = originalFilename.lastIndexOf('.');
        if (dotIndex >= 0 && dotIndex < originalFilename.length() - 1) {
            return originalFilename.substring(dotIndex).toLowerCase();
        }

        if ("image/png".equals(contentType)) return ".png";
        if ("image/jpeg".equals(contentType)) return ".jpg";
        if ("image/gif".equals(contentType)) return ".gif";
        if ("image/webp".equals(contentType)) return ".webp";

        return "";
    }
}
