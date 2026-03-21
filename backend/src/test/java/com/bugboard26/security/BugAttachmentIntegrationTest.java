package com.bugboard26.security;

import com.bugboard26.model.Bug;
import com.bugboard26.model.BugType;
import com.bugboard26.model.Role;
import com.bugboard26.model.User;
import com.bugboard26.repository.BugRepository;
import com.bugboard26.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.annotation.Transactional;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class BugAttachmentIntegrationTest {

    @TempDir
    static Path tempDir;

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> "jdbc:h2:mem:bugattachment;DB_CLOSE_DELAY=-1;MODE=PostgreSQL");
        registry.add("spring.datasource.driver-class-name", () -> "org.h2.Driver");
        registry.add("spring.datasource.username", () -> "sa");
        registry.add("spring.datasource.password", () -> "");
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop");
        registry.add("spring.jpa.database-platform", () -> "org.hibernate.dialect.H2Dialect");
        registry.add("app.attachments.dir", () -> tempDir.resolve("attachments").toString());
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BugRepository bugRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    private String token;
    private Bug bug;

    @BeforeEach
    void setUp() {
        User user = userRepository.save(new User(
            "attachment-user@bugboard.com",
            passwordEncoder.encode("attachment-password"),
            "Attachment User",
            Role.USER
        ));

        bug = bugRepository.save(new Bug(
            "Attachment bug",
            "Attachment bug description",
            BugType.BUG,
            user
        ));

        token = jwtService.issue(user.getId(), user.getRole().name(), user.getName(), user.getEmail());
    }

    @Test
    @DisplayName("upload attachment: deve salvare file, metadati e renderlo scaricabile")
    void uploadAttachment_persistsAndServesFile() throws Exception {
        byte[] pngBytes = java.util.Base64.getDecoder().decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXioAAAAASUVORK5CYII="
        );

        MockMultipartFile file = new MockMultipartFile(
            "file",
            "tiny.png",
            "image/png",
            pngBytes
        );

        var uploadRequest = MockMvcRequestBuilders
            .multipart("/api/bugs/{id}/attachments", bug.getId())
            .file(file)
            .header("Authorization", "Bearer " + token);

        String storedFilename = mockMvc.perform(uploadRequest)
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();

        Bug updatedBug = bugRepository.findById(bug.getId()).orElseThrow();
        assertThat(updatedBug.getAttachments()).hasSize(1);
        assertThat(updatedBug.getAttachments().get(0).getStoredFilename()).isEqualTo(storedFilename);
        assertThat(updatedBug.getAttachments().get(0).getOriginalFilename()).isEqualTo("tiny.png");
        assertThat(Files.exists(tempDir.resolve("attachments").resolve(storedFilename))).isTrue();

        mockMvc.perform(MockMvcRequestBuilders.get("/api/bugs/{id}/attachments/{filename}", bug.getId(), storedFilename)
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.containsString("tiny.png")))
            .andExpect(content().contentType(MediaType.IMAGE_PNG))
            .andExpect(content().bytes(pngBytes));
    }
}
