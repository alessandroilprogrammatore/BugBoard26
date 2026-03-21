package com.bugboard26.security;

import com.bugboard26.model.Role;
import com.bugboard26.model.User;
import com.bugboard26.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:h2:mem:adminauth;DB_CLOSE_DELAY=-1;MODE=PostgreSQL",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.datasource.username=sa",
    "spring.datasource.password=",
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect"
})
class AdminAuthorizationIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    private String adminToken;
    private String userToken;

    @BeforeEach
    void setUp() {
        User admin = userRepository.save(new User(
            "integration-admin@bugboard.com",
            passwordEncoder.encode("admin123"),
            "Integration Admin",
            Role.ADMIN
        ));

        User user = userRepository.save(new User(
            "integration-user@bugboard.com",
            passwordEncoder.encode("user123"),
            "Integration User",
            Role.USER
        ));

        adminToken = jwtService.issue(admin.getId(), admin.getRole().name(), admin.getName(), admin.getEmail());
        userToken = jwtService.issue(user.getId(), user.getRole().name(), user.getName(), user.getEmail());
    }

    @Test
    @DisplayName("GET /api/admin/users: utente normale deve ricevere 403")
    void listUsers_regularUser_forbidden() throws Exception {
        mockMvc.perform(get("/api/admin/users")
                .header("Authorization", "Bearer " + userToken))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("POST /api/admin/users: utente normale deve ricevere 403")
    void createUser_regularUser_forbidden() throws Exception {
        mockMvc.perform(post("/api/admin/users")
                .header("Authorization", "Bearer " + userToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "name": "Blocked User",
                      "email": "blocked-user@bugboard.com",
                      "password": "StrongPwd123!",
                      "role": "USER"
                    }
                    """))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("POST /api/admin/users: admin deve poter creare un utente")
    void createUser_admin_allowed() throws Exception {
        mockMvc.perform(post("/api/admin/users")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "name": "Created By Admin",
                      "email": "created-by-admin@bugboard.com",
                      "password": "StrongPwd123!",
                      "role": "USER"
                    }
                    """))
            .andExpect(status().isOk());
    }
}
