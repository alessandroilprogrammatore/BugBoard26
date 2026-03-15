package com.bugboard26.service;

import com.bugboard26.model.Bug;
import com.bugboard26.model.Notification;
import com.bugboard26.model.User;
import com.bugboard26.repository.NotificationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    public void notifyAssignment(Bug bug, User sender, User assignee) {
        String message = String.format("Ti è stato assegnato il bug \"%s\"", bug.getTitle());
        Notification notification = new Notification(assignee, sender, bug, message);
        notificationRepository.save(notification);
    }

    public void notifyResolved(Bug bug, User resolver) {
        User creator = bug.getCreatedBy();
        if (creator != null && !creator.getId().equals(resolver.getId())) {
            String message = String.format("Il bug \"%s\" è stato risolto da %s",
                    bug.getTitle(), resolver.getName());
            Notification notification = new Notification(creator, resolver, bug, message);
            notificationRepository.save(notification);
        }
    }

    public List<Notification> getNotifications(UUID recipientId) {
        return notificationRepository.findByRecipientIdOrderByCreatedAtDesc(recipientId);
    }

    public long getUnreadCount(UUID recipientId) {
        return notificationRepository.countByRecipientIdAndReadFalse(recipientId);
    }

    public void markAsRead(UUID notificationId) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            n.setRead(true);
            notificationRepository.save(n);
        });
    }

    public void markAllAsRead(UUID recipientId) {
        List<Notification> unread = notificationRepository
                .findByRecipientIdOrderByCreatedAtDesc(recipientId)
                .stream()
                .filter(n -> !n.isRead())
                .toList();

        for (Notification n : unread) {
            n.setRead(true);
        }
        notificationRepository.saveAll(unread);
    }
}
