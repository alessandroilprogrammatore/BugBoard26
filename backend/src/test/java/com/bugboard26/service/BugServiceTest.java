package com.bugboard26.service;

import com.bugboard26.dto.AssignRequest;
import com.bugboard26.dto.BugCreateRequest;
import com.bugboard26.dto.BugPatchRequest;
import com.bugboard26.model.*;
import com.bugboard26.repository.*;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Test di unità per BugService.
 *
 * Metodi testati:
 *  - create(BugCreateRequest, UUID)           [2 parametri]
 *  - assign(UUID, AssignRequest, UUID)        [3 parametri]
 *  - patch(UUID, BugPatchRequest, UUID, boolean) [4 parametri]
 *
 * Strategia: unit test con Mockito; le dipendenze (repository) sono mock,
 * così si isola la logica di business senza toccare il database.
 */
@ExtendWith(MockitoExtension.class)
class BugServiceTest {

    @Mock private BugRepository     bugRepository;
    @Mock private UserRepository    userRepository;
    @Mock private CommentRepository commentRepository;
    @Mock private LabelRepository   labelRepository;
    @Mock private HistoryRepository historyRepository;
    @Mock private NotificationService notificationService;

    private BugService bugService;

    /* ── fixture condivisi ── */
    private UUID   adminId;
    private UUID   userId;
    private UUID   readonlyId;
    private UUID   bugId;
    private User   adminUser;
    private User   regularUser;
    private User   readonlyUser;
    private Bug    existingBug;

    @BeforeEach
    void setUp() {
        adminId  = UUID.randomUUID();
        userId   = UUID.randomUUID();
        readonlyId = UUID.randomUUID();
        bugId    = UUID.randomUUID();

        bugService = new BugService(
            bugRepository,
            userRepository,
            commentRepository,
            labelRepository,
            historyRepository,
            notificationService,
            "build/test-attachments"
        );

        adminUser = new User("admin@bugboard.com",
                             "$2a$10$hashedpasswordXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
                             "Admin User", Role.ADMIN);
        adminUser.setId(adminId);

        regularUser = new User("user@bugboard.com",
                               "$2a$10$hashedpasswordXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
                               "Regular User", Role.USER);
        regularUser.setId(userId);

        readonlyUser = new User("readonly@bugboard.com",
                                "$2a$10$hashedpasswordXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
                                "Readonly User", Role.READONLY);
        readonlyUser.setId(readonlyId);

        existingBug = new Bug("Login non funziona su Safari",
                              "Descrizione del bug",
                              BugType.BUG, adminUser);
        existingBug.setId(bugId);
        existingBug.setStatus(BugStatus.TODO);
        existingBug.setAssignee(adminUser);
    }

    // ═══════════════════════════════════════════════════════════════
    // create(BugCreateRequest request, UUID userId)
    // ═══════════════════════════════════════════════════════════════

    @Test
    @DisplayName("create: crea un bug con titolo e tipo validi — deve restituire il bug salvato")
    void create_validRequest_returnsSavedBug() {
        // Arrange
        BugCreateRequest request = new BugCreateRequest(
            "Titolo del bug",
            "Descrizione dettagliata",
            BugType.BUG,
            Priority.HIGH,
            null,
            null
        );

        Bug savedBug = new Bug(request.title(), request.description(), request.type(), adminUser);
        savedBug.setId(UUID.randomUUID());

        when(userRepository.findById(adminId)).thenReturn(Optional.of(adminUser));
        when(bugRepository.save(any(Bug.class))).thenReturn(savedBug);
        when(historyRepository.save(any(History.class))).thenReturn(null);

        // Act
        Bug result = bugService.create(request, adminId);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getTitle()).isEqualTo("Titolo del bug");
        assertThat(result.getType()).isEqualTo(BugType.BUG);
        verify(bugRepository, times(1)).save(any(Bug.class));
        verify(historyRepository, times(1)).save(any(History.class));
    }

    @Test
    @DisplayName("create: userId inesistente — deve lanciare EntityNotFoundException")
    void create_userNotFound_throwsEntityNotFoundException() {
        // Arrange
        BugCreateRequest request = new BugCreateRequest(
            "Titolo",
            "Descrizione",
            BugType.FEATURE,
            Priority.LOW,
            null,
            null
        );
        UUID unknownUserId = UUID.randomUUID();

        when(userRepository.findById(unknownUserId)).thenReturn(Optional.empty());

        // Act & Assert
        assertThatThrownBy(() -> bugService.create(request, unknownUserId))
            .isInstanceOf(EntityNotFoundException.class)
            .hasMessageContaining("User not found");

        verify(bugRepository, never()).save(any());
    }

    @Test
    @DisplayName("create: utente readonly tenta di creare un bug — deve lanciare SecurityException")
    void create_readonlyUser_throwsSecurityException() {
        BugCreateRequest request = new BugCreateRequest(
            "Titolo",
            "Descrizione",
            BugType.BUG,
            Priority.LOW,
            null,
            null
        );

        when(userRepository.findById(readonlyId)).thenReturn(Optional.of(readonlyUser));

        assertThatThrownBy(() -> bugService.create(request, readonlyId))
            .isInstanceOf(SecurityException.class)
            .hasMessageContaining("Readonly users cannot modify bugs");

        verify(bugRepository, never()).save(any());
    }

    @Test
    @DisplayName("create: request con labels — deve associare le label al bug")
    void create_withLabels_associatesLabels() {
        // Arrange
        BugCreateRequest request = new BugCreateRequest(
            "Bug con label",
            "Descrizione",
            BugType.FEATURE,
            Priority.MEDIUM,
            null,
            List.of("frontend", "urgente")
        );

        Label labelFrontend = new Label("frontend");
        Label labelUrgente  = new Label("urgente");

        when(userRepository.findById(adminId)).thenReturn(Optional.of(adminUser));
        when(labelRepository.findByName("frontend")).thenReturn(Optional.of(labelFrontend));
        when(labelRepository.findByName("urgente")).thenReturn(Optional.empty());
        when(labelRepository.save(any(Label.class))).thenReturn(labelUrgente);
        when(bugRepository.save(any(Bug.class))).thenAnswer(inv -> inv.getArgument(0));
        when(historyRepository.save(any(History.class))).thenReturn(null);

        // Act
        Bug result = bugService.create(request, adminId);

        // Assert
        assertThat(result.getLabels()).hasSize(2);
        verify(labelRepository, times(1)).save(any(Label.class)); // solo "urgente" viene salvata
    }

    // ═══════════════════════════════════════════════════════════════
    // assign(UUID bugId, AssignRequest request, UUID userId)
    // ═══════════════════════════════════════════════════════════════

    @Test
    @DisplayName("assign: admin assegna bug a utente esistente — deve aggiornare l'assegnatario")
    void assign_adminAssignsBugToUser_updatesAssignee() {
        // Arrange
        AssignRequest request = new AssignRequest(userId, false);

        when(bugRepository.findById(bugId)).thenReturn(Optional.of(existingBug));
        when(userRepository.findById(adminId)).thenReturn(Optional.of(adminUser));
        when(userRepository.findById(userId)).thenReturn(Optional.of(regularUser));
        when(bugRepository.save(any(Bug.class))).thenAnswer(inv -> inv.getArgument(0));
        when(historyRepository.save(any(History.class))).thenReturn(null);

        // Act
        bugService.assign(bugId, request, adminId);

        // Assert
        assertThat(existingBug.getAssignee()).isEqualTo(regularUser);
        verify(bugRepository, times(1)).save(existingBug);
        verify(historyRepository, times(1)).save(any(History.class));
    }

    @Test
    @DisplayName("assign: utente non-admin tenta di assegnare — deve lanciare SecurityException")
    void assign_nonAdminUser_throwsSecurityException() {
        // Arrange
        AssignRequest request = new AssignRequest(userId, false);

        when(bugRepository.findById(bugId)).thenReturn(Optional.of(existingBug));
        when(userRepository.findById(userId)).thenReturn(Optional.of(regularUser));

        // Act & Assert
        assertThatThrownBy(() -> bugService.assign(bugId, request, userId))
            .isInstanceOf(SecurityException.class)
            .hasMessageContaining("Only admins can assign bugs");

        verify(bugRepository, never()).save(any());
    }

    @Test
    @DisplayName("assign: bug inesistente — deve lanciare EntityNotFoundException")
    void assign_bugNotFound_throwsEntityNotFoundException() {
        // Arrange
        UUID missingBugId = UUID.randomUUID();
        AssignRequest request = new AssignRequest(userId, false);

        when(bugRepository.findById(missingBugId)).thenReturn(Optional.empty());

        // Act & Assert
        assertThatThrownBy(() -> bugService.assign(missingBugId, request, adminId))
            .isInstanceOf(EntityNotFoundException.class)
            .hasMessageContaining("Bug not found");
    }

    // ═══════════════════════════════════════════════════════════════
    // patch(UUID id, BugPatchRequest request, UUID userId, boolean isAdmin)
    // ═══════════════════════════════════════════════════════════════

    @Test
    @DisplayName("patch: admin aggiorna titolo e priorità — deve applicare le modifiche")
    void patch_adminUpdatesTitleAndPriority_appliesChanges() {
        // Arrange
        BugPatchRequest request = new BugPatchRequest(
            "Titolo aggiornato",   // title
            null,                  // description
            null,                  // type
            null,                  // status
            Priority.URGENT,       // priority
            null, null, null, null, null
        );

        when(bugRepository.findById(bugId)).thenReturn(Optional.of(existingBug));
        when(userRepository.findById(adminId)).thenReturn(Optional.of(adminUser));
        when(bugRepository.save(any(Bug.class))).thenAnswer(inv -> inv.getArgument(0));
        when(historyRepository.save(any(History.class))).thenReturn(null);

        // Act
        Bug result = bugService.patch(bugId, request, adminId, true);

        // Assert
        assertThat(result.getTitle()).isEqualTo("Titolo aggiornato");
        assertThat(result.getPriority()).isEqualTo(Priority.URGENT);
        assertThat(result.getStatus()).isEqualTo(BugStatus.TODO); // invariato
        verify(historyRepository).save(any(History.class));
    }

    @Test
    @DisplayName("patch: utente non-admin tenta di cambiare stato di bug altrui — deve lanciare SecurityException")
    void patch_nonAdminChangesStatusOfOtherUsersBug_throwsSecurityException() {
        // Arrange — il bug è assegnato ad adminUser, non a regularUser
        BugPatchRequest request = new BugPatchRequest(
            null, null, null,
            BugStatus.IN_PROGRESS,  // status change
            null, null, null, null, null, null
        );

        when(bugRepository.findById(bugId)).thenReturn(Optional.of(existingBug));
        when(userRepository.findById(userId)).thenReturn(Optional.of(regularUser));

        // Act & Assert
        assertThatThrownBy(() -> bugService.patch(bugId, request, userId, false))
            .isInstanceOf(SecurityException.class)
            .hasMessageContaining("Only assignee or admin can modify bugs");

        verify(bugRepository, never()).save(any());
    }

    @Test
    @DisplayName("patch: utente non-assegnatario tenta di cambiare il titolo — deve lanciare SecurityException")
    void patch_nonAssigneeChangesTitle_throwsSecurityException() {
        // Arrange
        BugPatchRequest request = new BugPatchRequest(
            "Titolo cambiato da non assegnatario",
            null, null, null, null, null, null, null, null, null
        );

        when(bugRepository.findById(bugId)).thenReturn(Optional.of(existingBug));
        when(userRepository.findById(userId)).thenReturn(Optional.of(regularUser));

        // Act & Assert
        assertThatThrownBy(() -> bugService.patch(bugId, request, userId, false))
            .isInstanceOf(SecurityException.class)
            .hasMessageContaining("Only assignee or admin can modify bugs");

        assertThat(existingBug.getTitle()).isEqualTo("Login non funziona su Safari");
        verify(bugRepository, never()).save(any());
    }

    @Test
    @DisplayName("patch: utente non-admin tenta di riassegnare un bug — deve lanciare SecurityException")
    void patch_nonAdminChangesAssignee_throwsSecurityException() {
        // Arrange
        BugPatchRequest request = new BugPatchRequest(
            null, null, null, null, null, null, null, null, null, adminId
        );

        when(bugRepository.findById(bugId)).thenReturn(Optional.of(existingBug));
        when(userRepository.findById(userId)).thenReturn(Optional.of(regularUser));

        // Act & Assert
        assertThatThrownBy(() -> bugService.patch(bugId, request, userId, false))
            .isInstanceOf(SecurityException.class)
            .hasMessageContaining("Only admins can assign bugs");

        assertThat(existingBug.getAssignee()).isEqualTo(adminUser);
        verify(bugRepository, never()).save(any());
    }

    @Test
    @DisplayName("patch: utente assegnatario aggiorna il proprio bug — deve applicare le modifiche")
    void patch_assigneeUpdatesOwnBug_appliesChanges() {
        // Arrange — il bug è assegnato ad adminUser; patchamo senza cambiare stato
        BugPatchRequest request = new BugPatchRequest(
            "Descrizione corretta",   // title
            null, null, null, null, null, null, null, null, null
        );

        when(bugRepository.findById(bugId)).thenReturn(Optional.of(existingBug));
        when(userRepository.findById(adminId)).thenReturn(Optional.of(adminUser));
        when(bugRepository.save(any(Bug.class))).thenAnswer(inv -> inv.getArgument(0));
        when(historyRepository.save(any(History.class))).thenReturn(null);

        // Act — isAdmin=false, ma è l'assegnatario
        Bug result = bugService.patch(bugId, request, adminId, false);

        // Assert
        assertThat(result.getTitle()).isEqualTo("Descrizione corretta");
        verify(bugRepository).save(existingBug);
    }

    @Test
    @DisplayName("patch: admin aggiorna le labels del bug — deve salvare etichette personalizzate")
    void patch_adminUpdatesLabels_appliesLabelChanges() {
        // Arrange
        Label existingLabel = new Label("frontend");
        Label newLabel = new Label("sicurezza");
        existingBug.setLabels(new java.util.HashSet<>(List.of(existingLabel)));

        BugPatchRequest request = new BugPatchRequest(
            null, null, null, null, null, null, null, null,
            List.of("frontend", "sicurezza"),
            null
        );

        when(bugRepository.findById(bugId)).thenReturn(Optional.of(existingBug));
        when(userRepository.findById(adminId)).thenReturn(Optional.of(adminUser));
        when(labelRepository.findByName("frontend")).thenReturn(Optional.of(existingLabel));
        when(labelRepository.findByName("sicurezza")).thenReturn(Optional.empty());
        when(labelRepository.save(any(Label.class))).thenReturn(newLabel);
        when(bugRepository.save(any(Bug.class))).thenAnswer(inv -> inv.getArgument(0));
        when(historyRepository.save(any(History.class))).thenReturn(null);

        // Act
        Bug result = bugService.patch(bugId, request, adminId, true);

        // Assert
        assertThat(result.getLabels()).extracting(Label::getName)
            .containsExactlyInAnyOrder("frontend", "sicurezza");
        verify(labelRepository).save(any(Label.class));
        verify(bugRepository).save(existingBug);
    }

    @Test
    @DisplayName("setLabels: utente non-assegnatario non-admin — deve lanciare SecurityException")
    void setLabels_nonAssignee_throwsSecurityException() {
        // Arrange
        com.bugboard26.dto.LabelSetRequest request = new com.bugboard26.dto.LabelSetRequest(
            List.of("backend", "qa")
        );

        when(bugRepository.findById(bugId)).thenReturn(Optional.of(existingBug));
        when(userRepository.findById(userId)).thenReturn(Optional.of(regularUser));

        // Act & Assert
        assertThatThrownBy(() -> bugService.setLabels(bugId, request, userId, false))
            .isInstanceOf(SecurityException.class)
            .hasMessageContaining("Only assignee or admin can modify bugs");

        verify(bugRepository, never()).save(any());
    }

    @Test
    @DisplayName("patch: utente non-admin tenta di archiviare un bug")
    void patch_nonAdminArchivesBug_throwsSecurityException() {
        BugPatchRequest request = new BugPatchRequest(
            null, null, null, null, null, true, null, null, null, null
        );

        existingBug.setAssignee(regularUser);
        when(bugRepository.findById(bugId)).thenReturn(Optional.of(existingBug));
        when(userRepository.findById(userId)).thenReturn(Optional.of(regularUser));

        assertThatThrownBy(() -> bugService.patch(bugId, request, userId, false))
            .isInstanceOf(SecurityException.class)
            .hasMessageContaining("Only admins can archive bugs");

        assertThat(existingBug.getArchived()).isFalse();
        assertThat(existingBug.getStatus()).isEqualTo(BugStatus.TODO);
        verify(bugRepository, never()).save(any());
    }

    @Test
    @DisplayName("patch: admin archivia un bug")
    void patch_adminArchivesBug_setsArchivedStatus() {
        BugPatchRequest request = new BugPatchRequest(
            null, null, null, null, null, true, null, null, null, null
        );

        when(bugRepository.findById(bugId)).thenReturn(Optional.of(existingBug));
        when(userRepository.findById(adminId)).thenReturn(Optional.of(adminUser));
        when(bugRepository.save(any(Bug.class))).thenAnswer(inv -> inv.getArgument(0));
        when(historyRepository.save(any(History.class))).thenReturn(null);

        Bug result = bugService.patch(bugId, request, adminId, true);

        assertThat(result.getArchived()).isTrue();
        assertThat(result.getStatus()).isEqualTo(BugStatus.ARCHIVED);
        verify(bugRepository).save(existingBug);
        verify(historyRepository).save(any(History.class));
    }

    @Test
    @DisplayName("patch: utente readonly assegnato tenta di modificare — deve lanciare SecurityException")
    void patch_readonlyAssignee_throwsSecurityException() {
        BugPatchRequest request = new BugPatchRequest(
            "Titolo readonly",
            null, null, null, null, null, null, null, null, null
        );

        existingBug.setAssignee(readonlyUser);
        when(bugRepository.findById(bugId)).thenReturn(Optional.of(existingBug));
        when(userRepository.findById(readonlyId)).thenReturn(Optional.of(readonlyUser));

        assertThatThrownBy(() -> bugService.patch(bugId, request, readonlyId, false))
            .isInstanceOf(SecurityException.class)
            .hasMessageContaining("Readonly users cannot modify bugs");

        verify(bugRepository, never()).save(any());
    }

    @Test
    @DisplayName("addComment: utente readonly tenta di commentare — deve lanciare SecurityException")
    void addComment_readonlyUser_throwsSecurityException() {
        when(bugRepository.findById(bugId)).thenReturn(Optional.of(existingBug));
        when(userRepository.findById(readonlyId)).thenReturn(Optional.of(readonlyUser));

        assertThatThrownBy(() -> bugService.addComment(bugId, readonlyId, "commento"))
            .isInstanceOf(SecurityException.class)
            .hasMessageContaining("Readonly users cannot modify bugs");

        verify(commentRepository, never()).save(any());
        verify(historyRepository, never()).save(any());
    }
}
