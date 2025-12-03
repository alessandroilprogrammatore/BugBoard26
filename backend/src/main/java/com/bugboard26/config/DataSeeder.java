package com.bugboard26.config;

import com.bugboard26.model.*;
import com.bugboard26.repository.BugRepository;
import com.bugboard26.repository.LabelRepository;
import com.bugboard26.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.util.List;

@Configuration
public class DataSeeder {

    @Bean
    CommandLineRunner seedData(
        UserRepository userRepository,
        BugRepository bugRepository,
        LabelRepository labelRepository,
        PasswordEncoder passwordEncoder
    ) {
        return args -> {
            // Create users if they don't exist
            if (userRepository.findByEmail("admin@bugboard.com").isEmpty()) {
                User admin = new User(
                    "admin@bugboard.com",
                    passwordEncoder.encode("admin123"),
                    "Administrator",
                    Role.ADMIN
                );
                userRepository.save(admin);
            }

            if (userRepository.findByEmail("user@bugboard.com").isEmpty()) {
                User user = new User(
                    "user@bugboard.com",
                    passwordEncoder.encode("user123"),
                    "Regular User",
                    Role.USER
                );
                userRepository.save(user);
            }

            // Create sample labels
            List<String> labelNames = List.of("frontend", "backend", "urgent", "enhancement", "documentation");
            for (String labelName : labelNames) {
                if (labelRepository.findByName(labelName).isEmpty()) {
                    Label label = new Label(labelName);
                    labelRepository.save(label);
                }
            }

            // Create sample bugs
            User admin = userRepository.findByEmail("admin@bugboard.com").orElseThrow();
            User regularUser = userRepository.findByEmail("user@bugboard.com").orElseThrow();

            if (bugRepository.count() == 0) {
                // Bug 1
                Bug bug1 = new Bug("Login page not responsive", "The login page doesn't work well on mobile devices", BugType.BUG, admin);
                bug1.setPriority(Priority.HIGH);
                bug1.setAssignee(regularUser);
                bug1.setStatus(BugStatus.IN_PROGRESS);
                bugRepository.save(bug1);

                // Bug 2
                Bug bug2 = new Bug("Add dark mode toggle", "Users should be able to switch between light and dark themes", BugType.FEATURE, regularUser);
                bug2.setPriority(Priority.MEDIUM);
                bug2.setAssignee(regularUser);
                bugRepository.save(bug2);

                // Bug 3
                Bug bug3 = new Bug("Update API documentation", "The API docs are outdated and need to be updated", BugType.DOCUMENTATION, admin);
                bug3.setPriority(Priority.LOW);
                bugRepository.save(bug3);

                // Bug 4
                Bug bug4 = new Bug("Fix memory leak in dashboard", "Dashboard component is causing memory leaks in production", BugType.BUG, regularUser);
                bug4.setPriority(Priority.URGENT);
                bugRepository.save(bug4);

                // Bug 5
                Bug bug5 = new Bug("Add export functionality", "Users should be able to export bug reports to CSV/Excel", BugType.FEATURE, admin);
                bug5.setPriority(Priority.MEDIUM);
                bugRepository.save(bug5);

                // Bug 6
                Bug bug6 = new Bug("Improve search performance", "Search is slow when there are many bugs", BugType.BUG, regularUser);
                bug6.setPriority(Priority.HIGH);
                bug6.setAssignee(regularUser);
                bugRepository.save(bug6);
            }
        };
    }
}
