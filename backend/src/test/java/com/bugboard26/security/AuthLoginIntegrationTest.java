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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:h2:mem:authlogin;DB_CLOSE_DELAY=-1;MODE=PostgreSQL",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.datasource.username=sa",
    "spring.datasource.password=",
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect"
})
class AuthLoginIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUp() {
        userRepository.save(new User(
            "integration-auth@bugboard.com",
            passwordEncoder.encode("correct-password"),
            "Integration Auth",
            Role.ADMIN
        ));
    }

    @Test
    @DisplayName("POST /api/auth/login: password errata deve restituire 401")
    void login_wrongPassword_unauthorized() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "email": "integration-auth@bugboard.com",
                      "password": "wrong-password"
                    }
                    """))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("POST /api/auth/login: email inesistente deve restituire 401")
    void login_unknownEmail_unauthorized() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "email": "missing-auth@bugboard.com",
                      "password": "wrong-password"
                    }
                    """))
            .andExpect(status().isUnauthorized());
    }
}
